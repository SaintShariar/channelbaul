#!/usr/bin/env python3
"""Build feed.json from YouTube (RSS/API/HTML), Instagram own embeds, news RSS, Reddit.

American-English cannabis / hemp / psychedelic focus.
Own Channel Baul always first. Arabic-script titles dropped (except own).
Reddit often returns 403 — failures are logged and skipped.
Run from repo root:
  py -3 scripts/fetch_feed.py            # full refresh (YouTube + IG + news)
  py -3 scripts/fetch_feed.py --mode full
  py -3 scripts/fetch_feed.py --mode breaking   # news/legalization only; keep own items
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

try:
    from own_content import build_instagram_own, build_own_youtube
except ImportError:  # script run as module path edge case
    from scripts.own_content import build_instagram_own, build_own_youtube  # type: ignore

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "sources.json"
OUT = ROOT / "feed.json"
UA = "ChannelbaulFeedBot/1.0 (+https://channelbaul.com; personal static site)"
YT_RSS = "https://www.youtube.com/feeds/videos.xml?channel_id={}"
ATOM = "{http://www.w3.org/2005/Atom}"
YT = "{http://www.youtube.com/xml/schemas/2015}"
MEDIA = "{http://search.yahoo.com/mrss/}"

# Non-Latin scripts — drop unless own (Arabic, Hebrew, Bengali/Devanagari, CJK, Cyrillic, Thai, Hangul)
ARABIC_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]")
NON_LATIN_RE = re.compile(
    r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF"
    r"\u0590-\u05FF\u0900-\u097F\u0980-\u09FF\u0E00-\u0E7F"
    r"\u0400-\u04FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]"
)

CANNABIS_TOPICS = frozenset({"cannabis", "hemp", "psychedelics", "legalization", "red_states"})
GEO_TOPICS = frozenset({"palestine", "bangladesh", "global", "global_south", "news"})

KEYWORD_TAGS = [
    ("cannabis", re.compile(r"\b(cannabis|marijuana|marihuana|weed|ganja|pot|thc|cbd|indica|sativa|dispensary|420)\b", re.I)),
    ("hemp", re.compile(r"\b(hemp|industrial\s+hemp|hempcrete|cbd\s+oil)\b", re.I)),
    ("psychedelics", re.compile(r"\b(psychedelic|psilocybin|psilocin|mdma|ayahuasca|lsd|ketamine|mushroom|dmt|mescaline|maps)\b", re.I)),
    ("legalization", re.compile(
        r"\b(legaliz|decriminal|norml|reschedul|drug\s+policy|safe\s+supply|harm\s+reduction|"
        r"ballot|measure\s+\d+|prop(osition)?\.?\s*\d+|adult[- ]use|medical\s+(cannabis|marijuana|mushroom))\b",
        re.I,
    )),
    ("red_states", re.compile(
        r"\b(texas|florida|ohio|red\s+state|gop|republican|bible\s+belt|mississippi|alabama|"
        r"oklahoma|arkansas|tennessee|kentucky|indiana|missouri|south\s+carolina|north\s+carolina|"
        r"georgia|louisiana|idaho|utah|nebraska|kansas|iowa|west\s+virginia)\b",
        re.I,
    )),
    ("usa", re.compile(
        r"\b(usa|u\.?s\.?a?\.?\b|united\s+states|california|colorado|new\s+york|new\s+jersey|"
        r"illinois|michigan|massachusetts|oregon|washington|nevada|arizona|pennsylvania|maryland|"
        r"virginia|connecticut|maine|vermont|rhode\s+island|delaware|hawaii|alaska|minnesota|"
        r"new\s+mexico|montana|north\s+dakota|south\s+dakota|wisconsin|wyoming)\b",
        re.I,
    )),
    ("bangladesh", re.compile(r"\b(bangladesh|dhaka|bengali|chittagong|sylhet)\b", re.I)),
    ("uk", re.compile(r"\b(uk|u\.?k\.?|britain|british|england|scotland|wales)\b", re.I)),
    ("canada", re.compile(
        r"\b(canada|canadian|ontario|quebec|alberta|manitoba|saskatchewan|nova\s+scotia|"
        r"british\s+columbia|\bbc\b)\b",
        re.I,
    )),
    ("south_asia", re.compile(r"\b(pakistan|karachi|lahore|islamabad|india|delhi|mumbai|kolkata)\b", re.I)),
    ("apac", re.compile(r"\b(australia|sydney|melbourne|japan|tokyo|osaka)\b", re.I)),
    ("palestine", re.compile(r"\b(palestine|palestinian|gaza|west\s+bank|israel|idf|rafah|netanyahu|al-?aqsa)\b", re.I)),
    ("arabic", re.compile(r"\b(arabic|al\s+jazeera|middle\s+east|yemen|syria|lebanon|iraq|iran)\b", re.I)),
]

SUBSTANCE_RE = re.compile(
    r"\b(cannabis|marijuana|marihuana|weed|ganja|hemp|thc|cbd|psychedelic|psilocybin|psilocin|"
    r"mdma|ayahuasca|lsd|ketamine|mushroom|dmt|mescaline)\b",
    re.I,
)
POLICY_RE = re.compile(
    r"\b(legaliz|decriminal|reschedul|drug\s+policy|safe\s+supply|harm\s+reduction|"
    r"ballot|measure\s+\d+|prop(osition)?\.?\s*\d+|adult[- ]use|medical\s+(cannabis|marijuana|mushroom)|"
    r"ban\b|regulated|schedule\s+[ivx]+)\b",
    re.I,
)
BREAKING_BLOCK_RE = re.compile(
    r"\b(gaza|palestine|palestinian|israel|idf|netanyahu|west\s+bank|rafah|hamas|hezbollah|"
    r"ukraine|russia|putin)\b",
    re.I,
)
LEGALIZATION_OUTLETS = frozenset({
    "Marijuana Moment", "NORML", "NORML News", "NORML Org", "High Times", "Leafly",
    "DoubleBlind", "DoubleBlind Mag", "Psychedelic Alpha", "MAPS News", "Talking Drugs",
    "Filter Mag", "Drug Policy Alliance", "Cannabis Now", "Ganjapreneur", "Lucid News",
    "Third Wave", "Weedmaps", "The Cannabist", "MJBizDaily", "HempToday", "Pot TV",
})


def load_sources() -> dict:
    with SOURCES.open(encoding="utf-8") as f:
        return json.load(f)


def fetch(url: str, timeout: int = 20) -> bytes | None:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code} {url}", file=sys.stderr)
    except Exception as e:  # noqa: BLE001
        print(f"  fail {url}: {e}", file=sys.stderr)
    return None


def text(el) -> str:
    return (el.text or "").strip() if el is not None else ""


def parse_published(raw: str) -> datetime:
    s = (raw or "").strip()
    if not s:
        return datetime.min.replace(tzinfo=timezone.utc)
    try:
        if s.endswith("Z") or "+" in s[10:] or s.count("-") >= 2 and "T" in s:
            return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:  # noqa: BLE001
        pass
    try:
        dt = parsedate_to_datetime(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:  # noqa: BLE001
        return datetime.min.replace(tzinfo=timezone.utc)


def has_arabic_script(title: str) -> bool:
    return bool(ARABIC_RE.search(title or ""))


def _is_latin_letter(ch: str) -> bool:
    o = ord(ch)
    # Basic Latin + Latin-1 / Extended-A/B + Latin Extended Additional (accents OK)
    return (
        (0x0041 <= o <= 0x007A)
        or (0x00C0 <= o <= 0x024F)
        or (0x1E00 <= o <= 0x1EFF)
    )


def is_latin_english_title(title: str) -> bool:
    """Primarily Latin script (accents/numbers/punctuation allowed). Skip Arabic/Bengali/etc."""
    t = title or ""
    if not t.strip():
        return False
    letters = [c for c in t if c.isalpha()]
    if not letters:
        return True
    latin = sum(1 for c in letters if _is_latin_letter(c))
    return (latin / len(letters)) >= 0.7


def lang_heuristic(title: str, declared: str = "en") -> str:
    if has_arabic_script(title):
        return "ar"
    if re.search(r"[\u0980-\u09FF]", title or ""):
        return "bn"
    if NON_LATIN_RE.search(title or ""):
        return "other"
    if not is_latin_english_title(title):
        return "other"
    return declared or "en"


def infer_tags(title: str, topic: str, own: bool) -> list[str]:
    tags: list[str] = []
    if own:
        tags.append("own")
    if topic and topic not in tags:
        tags.append(topic)
    blob = title or ""
    for name, rx in KEYWORD_TAGS:
        if rx.search(blob) and name not in tags:
            tags.append(name)
    return tags


def is_cannabis_family(it: dict) -> bool:
    tags = set(it.get("tags") or [])
    topic = it.get("topic") or ""
    return bool(tags & CANNABIS_TOPICS) or topic in CANNABIS_TOPICS


def is_geo_family(it: dict) -> bool:
    if it.get("own"):
        return False
    tags = set(it.get("tags") or [])
    topic = it.get("topic") or ""
    if is_cannabis_family(it):
        return False
    return bool(tags & {"palestine", "bangladesh", "arabic"}) or topic in GEO_TOPICS


def rank_score(it: dict, source_priority: int = 50) -> float:
    """Higher is better. Own >> cannabis >> everything else."""
    if it.get("own"):
        return 1_000_000.0
    score = float(source_priority)
    tags = set(it.get("tags") or [])
    topic = it.get("topic") or ""

    if "cannabis" in tags or topic == "cannabis":
        score += 400
    if "hemp" in tags or topic == "hemp":
        score += 380
    if "psychedelics" in tags or topic == "psychedelics":
        score += 390
    if "legalization" in tags or topic == "legalization":
        score += 370
    if "red_states" in tags or topic == "red_states":
        score += 200

    if "palestine" in tags or topic == "palestine":
        score -= 180
    if "bangladesh" in tags or topic == "bangladesh":
        score -= 120
    if "arabic" in tags:
        score -= 200
    if topic in ("global", "news"):
        score -= 80
    if topic == "gonzo":
        score += 40

    if it.get("lang") == "en":
        score += 50
    elif it.get("lang") in ("ar", "bn"):
        score -= 500

    # Recency boost (hours since epoch / scale)
    pub = parse_published(str(it.get("published") or ""))
    age_hours = max(0.0, (datetime.now(timezone.utc) - pub).total_seconds() / 3600.0)
    score += max(0.0, 120.0 - age_hours * 0.5)
    return score


def is_breaking_legalization(it: dict) -> bool:
    """Weed/hemp or psychedelic + legalization/decrim/policy. Block war/geopolitics."""
    if it.get("own"):
        return False
    title = it.get("title") or ""
    if BREAKING_BLOCK_RE.search(title):
        return False
    tags = set(it.get("tags") or [])
    topic = it.get("topic") or ""
    blob = f"{title} {topic} {' '.join(tags)}"
    substance = bool(SUBSTANCE_RE.search(blob)) or topic in CANNABIS_TOPICS or bool(tags & CANNABIS_TOPICS)
    policy = bool(POLICY_RE.search(blob)) or "legalization" in tags or topic == "legalization"
    outlet = (it.get("source") or "") in LEGALIZATION_OUTLETS
    if outlet and substance:
        return True
    return substance and policy


def enrich(item: dict, *, lang: str = "en", priority: int = 50) -> dict:
    title = item.get("title") or ""
    own = bool(item.get("own"))
    item["lang"] = lang_heuristic(title, lang)
    item["tags"] = infer_tags(title, item.get("topic") or "", own)
    if is_breaking_legalization(item):
        tags = list(item["tags"])
        if "breaking" not in tags:
            tags.append("breaking")
        if "legalization" not in tags and (
            POLICY_RE.search(title) or item.get("topic") == "legalization"
        ):
            tags.append("legalization")
        item["tags"] = tags
        item["breaking"] = True
        # Extra boost for USA states + Bangladesh (ticker emphasis)
        blob = title
        if re.search(
            r"\b(texas|florida|ohio|california|new\s+york|usa|united\s+states|alabama|mississippi|"
            r"oklahoma|arkansas|tennessee|georgia|arizona|pennsylvania)\b",
            blob,
            re.I,
        ):
            priority = max(priority, int(priority) + 35)
        if re.search(r"\b(bangladesh|dhaka)\b", blob, re.I):
            priority = max(priority, int(priority) + 35)
        if re.search(
            r"\b(uk|britain|canada|ontario|pakistan|india|australia|japan)\b",
            blob,
            re.I,
        ):
            priority = max(priority, int(priority) + 18)
    else:
        item["breaking"] = False
    item["_priority"] = priority
    item["_rank"] = rank_score(item, priority)
    return item


def yt_entries(channel_id: str, name: str, topic: str, own: bool, limit: int, lang: str, priority: int) -> list[dict]:
    raw = fetch(YT_RSS.format(channel_id))
    if not raw:
        return []
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        return []
    items = []
    for entry in root.findall(f"{ATOM}entry")[:limit]:
        vid = text(entry.find(f"{YT}videoId"))
        title = text(entry.find(f"{ATOM}title"))
        published = text(entry.find(f"{ATOM}published"))
        link = ""
        for l in entry.findall(f"{ATOM}link"):
            if l.get("rel") in (None, "alternate"):
                link = l.get("href") or ""
                break
        media = entry.find(f"{MEDIA}group")
        thumb = ""
        views = None
        if media is not None:
            th = media.find(f"{MEDIA}thumbnail")
            if th is not None:
                thumb = th.get("url") or ""
            stats = media.find(f"{MEDIA}community/{MEDIA}statistics")
            if stats is not None and stats.get("views"):
                views = int(stats.get("views"))
        vertical = "/shorts/" in link.lower() or bool(re.search(r"#shorts\b", title, re.I))
        if not vid:
            continue
        items.append(
            enrich(
                {
                    "id": f"yt:{vid}",
                    "platform": "youtube",
                    "source": name,
                    "topic": topic,
                    "own": own,
                    "title": title,
                    "url": link or f"https://www.youtube.com/watch?v={vid}",
                    "embed": f"https://www.youtube-nocookie.com/embed/{vid}",
                    "thumbnail": thumb or f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                    "published": published,
                    "views": views,
                    "score": None,
                    "comments": None,
                    "vertical": vertical,
                    "author": name,
                    "permalink": None,
                },
                lang=lang,
                priority=priority,
            )
        )
    return items


def resolve_handle(handle: str) -> str | None:
    handle = handle.lstrip("@")
    raw = fetch(f"https://www.youtube.com/@{handle}")
    if not raw:
        return None
    html = raw.decode("utf-8", errors="ignore")
    m = re.search(r'"channelId":"(UC[\w-]{22})"', html) or re.search(
        r"youtube\.com/channel/(UC[\w-]{22})", html
    )
    return m.group(1) if m else None


def _article_or_yt(title: str, link: str, pub: str, desc: str, name: str, topic: str, lang: str, priority: int) -> dict:
    yt = re.search(
        r"(https?://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([\w-]{11}))",
        (desc or "") + " " + (link or ""),
    )
    if yt:
        vid = yt.group(2)
        return enrich(
            {
                "id": f"yt:{vid}",
                "platform": "youtube",
                "source": name,
                "topic": topic,
                "own": False,
                "title": title,
                "url": f"https://www.youtube.com/watch?v={vid}",
                "embed": f"https://www.youtube-nocookie.com/embed/{vid}",
                "thumbnail": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                "published": pub,
                "views": None,
                "score": None,
                "comments": None,
                "vertical": False,
                "author": name,
                "permalink": link,
            },
            lang=lang,
            priority=priority,
        )
    return enrich(
        {
            "id": f"rss:{abs(hash(link)) % (10**12)}",
            "platform": "article",
            "source": name,
            "topic": topic,
            "own": False,
            "title": title,
            "url": link,
            "embed": "",
            "thumbnail": "",
            "published": pub,
            "views": None,
            "score": None,
            "comments": None,
            "vertical": False,
            "author": name,
            "permalink": link,
        },
        lang=lang,
        priority=priority,
    )


def news_rss_items(url: str, name: str, topic: str, limit: int, lang: str, priority: int) -> list[dict]:
    raw = fetch(url)
    if not raw:
        return []
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        return []
    items: list[dict] = []
    # RSS 2.0
    for item in root.findall(".//item")[:limit]:
        title = text(item.find("title"))
        link = text(item.find("link"))
        pub = text(item.find("pubDate"))
        desc = text(item.find("description"))
        if not title or not link:
            continue
        items.append(_article_or_yt(title, link, pub, desc, name, topic, lang, priority))
    if items:
        return items[:limit]
    # Atom
    for entry in root.findall(f"{ATOM}entry")[:limit]:
        title = text(entry.find(f"{ATOM}title"))
        link = ""
        for l in entry.findall(f"{ATOM}link"):
            href = l.get("href") or ""
            if not href:
                continue
            if l.get("rel") in (None, "alternate"):
                link = href
                break
            if not link:
                link = href
        pub = text(entry.find(f"{ATOM}published")) or text(entry.find(f"{ATOM}updated"))
        summary = text(entry.find(f"{ATOM}summary")) or text(entry.find(f"{ATOM}content"))
        if not title or not link:
            continue
        items.append(_article_or_yt(title, link, pub, summary, name, topic, lang, priority))
    return items[:limit]


def reddit_items(sub: str, topic: str, limit: int, lang: str, priority: int) -> list[dict]:
    url = f"https://www.reddit.com/r/{sub}/hot.json?limit={limit}"
    raw = fetch(url)
    if not raw:
        return []
    try:
        data = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return []
    out = []
    for child in data.get("data", {}).get("children", []):
        d = child.get("data") or {}
        title = d.get("title") or ""
        permalink = "https://www.reddit.com" + (d.get("permalink") or "")
        created = d.get("created_utc")
        published = (
            datetime.fromtimestamp(created, tz=timezone.utc).isoformat().replace("+00:00", "Z")
            if created
            else ""
        )
        media_url = d.get("url_overridden_by_dest") or d.get("url") or ""
        yt = re.search(r"(?:v=|youtu\.be/|shorts/)([\w-]{11})", media_url)
        if not yt:
            continue
        vid = yt.group(1)
        out.append(
            enrich(
                {
                    "id": f"yt:{vid}",
                    "platform": "youtube",
                    "source": f"r/{sub}",
                    "topic": topic,
                    "own": False,
                    "title": title,
                    "url": f"https://www.youtube.com/watch?v={vid}",
                    "embed": f"https://www.youtube-nocookie.com/embed/{vid}",
                    "thumbnail": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                    "published": published,
                    "views": None,
                    "score": d.get("score"),
                    "comments": d.get("num_comments"),
                    "vertical": "shorts" in media_url,
                    "author": d.get("author") or f"r/{sub}",
                    "permalink": permalink,
                },
                lang=lang,
                priority=priority,
            )
        )
    return out


def dedupe(items: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for it in items:
        key = it.get("id") or it.get("url")
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(it)
    return out


def filter_language(items: list[dict], drop_non_latin: bool) -> list[dict]:
    out = []
    dropped = 0
    for it in items:
        if it.get("own"):
            out.append(it)
            continue
        title = it.get("title") or ""
        if drop_non_latin and not is_latin_english_title(title):
            dropped += 1
            continue
        if it.get("lang") in ("ar", "bn", "other"):
            dropped += 1
            continue
        out.append(it)
    if dropped:
        print(f"Dropped {dropped} non-Latin / non-English titles", file=sys.stderr)
    return out


def apply_theme_caps(items: list[dict], max_total: int, caps: dict) -> list[dict]:
    """Own first, then fill with cannabis-family preference and geo cap."""
    own = [i for i in items if i.get("own")]
    rest = [i for i in items if not i.get("own")]
    rest.sort(key=lambda i: (-float(i.get("_rank") or 0), parse_published(str(i.get("published") or ""))), reverse=False)
    # sort key above already has -rank; fix: higher rank first
    rest.sort(key=lambda i: (float(i.get("_rank") or 0), parse_published(str(i.get("published") or ""))), reverse=True)

    geo_max_pct = float(caps.get("geo_family_max_pct", 25)) / 100.0
    can_min_pct = float(caps.get("cannabis_family_min_pct", 55)) / 100.0
    can_max_pct = float(caps.get("cannabis_family_max_pct", 70)) / 100.0

    slots = max(0, max_total - len(own))
    geo_cap = int(max_total * geo_max_pct)
    can_min = int(max_total * can_min_pct)
    can_max = int(max_total * can_max_pct)

    cannabis = [i for i in rest if is_cannabis_family(i)]
    geo = [i for i in rest if is_geo_family(i)]
    other = [i for i in rest if not is_cannabis_family(i) and not is_geo_family(i)]

    picked: list[dict] = []
    # Prefer cannabis up to can_max, ensuring we try for can_min
    for pool, limit in (
        (cannabis, can_max),
        (other, slots),
        (geo, geo_cap),
    ):
        for it in pool:
            if len(picked) >= slots:
                break
            if it in picked:
                continue
            if is_geo_family(it) and sum(1 for x in picked if is_geo_family(x)) >= geo_cap:
                continue
            if is_cannabis_family(it) and sum(1 for x in picked if is_cannabis_family(x)) >= can_max:
                continue
            picked.append(it)

    # If under cannabis min, steal from geo/other
    can_count = sum(1 for x in picked if is_cannabis_family(x))
    if can_count < can_min:
        need = can_min - can_count
        extras = [i for i in cannabis if i not in picked][:need]
        # drop lowest-ranked non-cannabis to make room
        non_can = [i for i in picked if not is_cannabis_family(i)]
        non_can.sort(key=lambda i: float(i.get("_rank") or 0))
        for extra, drop in zip(extras, non_can):
            picked.remove(drop)
            picked.append(extra)

    # Own always on top and NEVER truncated by max_total (own exempt from squeeze).
    own.sort(key=lambda i: parse_published(str(i.get("published") or "")), reverse=True)
    picked.sort(key=lambda i: float(i.get("_rank") or 0), reverse=True)
    # max_total applies to non-own only
    return dedupe(own + picked[: max(0, max_total)])


def strip_internal(it: dict) -> dict:
    return {k: v for k, v in it.items() if not k.startswith("_")}


def report(items: list[dict]) -> None:
    by_topic = Counter(i.get("topic") or "?" for i in items)
    by_lang = Counter(i.get("lang") or "?" for i in items)
    tag_counts: Counter[str] = Counter()
    for i in items:
        for t in i.get("tags") or []:
            tag_counts[t] += 1
    can_n = sum(1 for i in items if is_cannabis_family(i))
    geo_n = sum(1 for i in items if is_geo_family(i))
    own_n = sum(1 for i in items if i.get("own"))
    break_n = sum(1 for i in items if i.get("breaking") or "breaking" in (i.get("tags") or []))
    print("--- feed report ---")
    print(f"total={len(items)} own={own_n} breaking_legalization={break_n} cannabis_family={can_n} geo_family={geo_n}")
    print("by_topic:", dict(by_topic.most_common()))
    print("by_lang:", dict(by_lang.most_common()))
    print("by_tag:", dict(tag_counts.most_common(20)))


def source_limit(cfg: dict, entry: dict) -> int:
    if entry.get("own"):
        if "max_per_source" in entry:
            return int(entry["max_per_source"])
        return int(cfg.get("own_max_per_source", 500))
    if "max_per_source" in entry:
        return int(entry["max_per_source"])
    return int(cfg.get("max_per_source", 8))


def load_existing_items() -> list[dict]:
    if not OUT.exists():
        return []
    try:
        data = json.loads(OUT.read_text(encoding="utf-8"))
        return list(data.get("items") or [])
    except Exception as e:  # noqa: BLE001
        print(f"  could not read existing feed.json: {e}", file=sys.stderr)
        return []


def is_own_item(item: dict) -> bool:
    if item.get("own"):
        return True
    plat = str(item.get("platform") or "")
    if plat == "instagram":
        return True
    src = str(item.get("source") or "")
    return bool(re.search(r"channel\s*baul|baul_international", src, re.I))


def is_breaking_source(entry: dict) -> bool:
    topic = str(entry.get("topic") or "").lower()
    if topic in {"legalization", "cannabis", "hemp", "psychedelics", "red_states"}:
        return True
    name = str(entry.get("name") or "").lower()
    return bool(
        re.search(
            r"marijuana|norml|hemp|cannabis|weed|psychedelic|maps|double.?blind|third.?wave|drug.?policy|leafly|high.?times",
            name,
            re.I,
        )
    )


def collect_youtube(cfg: dict, *, own_only: bool = False, breaking_only: bool = False) -> list[dict]:
    items: list[dict] = []
    seen_channels: set[str] = set()
    for ch in cfg.get("youtube_channels", []):
        cid = ch.get("id")
        if not cid:
            continue
        is_own = bool(ch.get("own"))
        if own_only and not is_own:
            continue
        if breaking_only and not is_own and not is_breaking_source(ch):
            continue
        if breaking_only and is_own:
            continue
        seen_channels.add(cid)
        lim = source_limit(cfg, ch)
        print(f"YT channel {ch.get('name')} ({cid}) lim={lim} own={is_own}")
        if is_own:
            items.extend(build_own_youtube(ch, cfg, enrich))
        else:
            items.extend(
                yt_entries(
                    cid,
                    ch.get("name") or cid,
                    ch.get("topic") or "global",
                    False,
                    lim,
                    ch.get("lang") or "en",
                    int(ch.get("priority") or 50),
                )
            )
        time.sleep(0.3)

    if own_only or not breaking_only:
        for h in cfg.get("youtube_handles", []):
            handle = h.get("handle") or ""
            if h.get("own") and seen_channels:
                print(f"YT handle {handle} skipped (own channel id already fetched)")
                continue
            if breaking_only and not h.get("own") and not is_breaking_source(h):
                continue
            if own_only and not h.get("own"):
                continue
            print(f"YT handle {handle}")
            cid = resolve_handle(handle)
            if not cid:
                print(f"  could not resolve {handle}", file=sys.stderr)
                continue
            if cid in seen_channels:
                print(f"  already have {cid}")
                continue
            seen_channels.add(cid)
            lim = source_limit(cfg, h)
            items.extend(
                yt_entries(
                    cid,
                    h.get("name") or handle,
                    h.get("topic") or "global",
                    bool(h.get("own")),
                    lim,
                    h.get("lang") or "en",
                    int(h.get("priority") or 50),
                )
            )
            time.sleep(0.4)
    return items


def collect_news(cfg: dict, *, breaking_only: bool = False) -> list[dict]:
    items: list[dict] = []
    for feed in cfg.get("news_rss", []):
        if breaking_only and not is_breaking_source(feed):
            continue
        lim = source_limit(cfg, feed)
        print(f"RSS {feed.get('name')} lim={lim}")
        items.extend(
            news_rss_items(
                feed["url"],
                feed.get("name") or "News",
                feed.get("topic") or "news",
                lim,
                feed.get("lang") or "en",
                int(feed.get("priority") or 50),
            )
        )
        time.sleep(0.2)
    return items


def collect_reddit(cfg: dict, *, breaking_only: bool = False) -> list[dict]:
    items: list[dict] = []
    for r in cfg.get("reddit", []):
        if breaking_only and not is_breaking_source(r):
            continue
        lim = source_limit(cfg, r)
        print(f"Reddit r/{r.get('sub')} lim={lim}")
        items.extend(
            reddit_items(
                r["sub"],
                r.get("topic") or "global",
                lim,
                r.get("lang") or "en",
                int(r.get("priority") or 50),
            )
        )
        time.sleep(0.5)
    return items


def write_feed(items: list[dict], cfg: dict, mode: str) -> int:
    max_total = int(cfg.get("max_total", 120))
    drop_non_latin = bool(cfg.get("drop_non_latin_titles", cfg.get("drop_arabic_script", True)))
    caps = cfg.get("theme_caps") or {}
    items = dedupe(items)
    items = filter_language(items, drop_non_latin)
    merged = apply_theme_caps(items, max_total, caps)
    clean = [strip_internal(i) for i in merged]
    payload = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "mode": mode,
        "items": clean,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    report(clean)
    print(f"Wrote {OUT} with {len(clean)} items (mode={mode})")
    return 0


def run_full(cfg: dict) -> int:
    items: list[dict] = []
    items.extend(collect_youtube(cfg))
    print("Instagram @baul_international (own)")
    items.extend(build_instagram_own(cfg, enrich))
    items.extend(collect_news(cfg))
    items.extend(collect_reddit(cfg))
    return write_feed(items, cfg, "full")


def run_breaking(cfg: dict) -> int:
    """Refresh legalization/news every 4h; keep prior own YouTube + Instagram items."""
    existing = load_existing_items()
    kept_own = [i for i in existing if is_own_item(i)]
    print(f"Breaking mode: keeping {len(kept_own)} own items from existing feed")
    items: list[dict] = list(kept_own)
    items.extend(collect_youtube(cfg, breaking_only=True))
    items.extend(collect_news(cfg, breaking_only=True))
    items.extend(collect_reddit(cfg, breaking_only=True))
    return write_feed(items, cfg, "breaking")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Channelbaul feed.json")
    parser.add_argument(
        "--mode",
        choices=("full", "breaking"),
        default="full",
        help="full = YouTube+IG+news daily; breaking = legalization news every 4h",
    )
    args = parser.parse_args()
    cfg = load_sources()
    if args.mode == "breaking":
        return run_breaking(cfg)
    return run_full(cfg)


if __name__ == "__main__":
    raise SystemExit(main())
