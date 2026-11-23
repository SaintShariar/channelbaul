# -*- coding: utf-8 -*-
"""Own Channel Baul YouTube (all vids/shorts) + Instagram @baul_international embeds.

Public listing metadata only — never download video binaries.
Prefer YOUTUBE_API_KEY env (or SECRETS.md note). Without API: HTML ytInitialData + RSS.
Instagram: best-effort public scrape; else instagram-own.json URL list / Meta token.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IG_OWN = ROOT / "instagram-own.json"
SECRETS_NOTE = ROOT / "SECRETS.md"
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
FEED_UA = "ChannelbaulFeedBot/1.0 (+https://channelbaul.com; personal static site)"
YT_API = "https://www.googleapis.com/youtube/v3/{}"
YT_RSS = "https://www.youtube.com/feeds/videos.xml?channel_id={}"


def fetch(url: str, timeout: int = 20, *, browser: bool = False, extra_headers: dict | None = None) -> bytes | None:
    headers = {
        "User-Agent": BROWSER_UA if browser else FEED_UA,
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
    }
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code} {url}", file=sys.stderr)
    except Exception as e:  # noqa: BLE001
        print(f"  fail {url}: {e}", file=sys.stderr)
    return None


def youtube_api_key() -> str:
    key = (os.environ.get("YOUTUBE_API_KEY") or "").strip()
    if key:
        return key
    if SECRETS_NOTE.exists():
        for line in SECRETS_NOTE.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("YOUTUBE_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def uploads_playlist_id(channel_id: str) -> str:
    if channel_id.startswith("UC") and len(channel_id) == 24:
        return "UU" + channel_id[2:]
    return "UU" + channel_id


def _walk_json(obj, pred, acc):
    if isinstance(obj, dict):
        if pred(obj):
            acc.append(obj)
        for v in obj.values():
            _walk_json(v, pred, acc)
    elif isinstance(obj, list):
        for v in obj:
            _walk_json(v, pred, acc)


def yt_api_playlist_items(playlist_id: str, api_key: str, limit: int) -> list[dict]:
    out: list[dict] = []
    page = None
    while len(out) < limit:
        params = (
            f"part=snippet,contentDetails&playlistId={playlist_id}"
            f"&maxResults={min(50, limit - len(out))}&key={api_key}"
        )
        if page:
            params += f"&pageToken={page}"
        raw = fetch(YT_API.format(f"playlistItems?{params}"), timeout=25)
        if not raw:
            break
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            break
        for it in data.get("items") or []:
            sn = it.get("snippet") or {}
            cd = it.get("contentDetails") or {}
            vid = cd.get("videoId") or (sn.get("resourceId") or {}).get("videoId")
            if not vid:
                continue
            thumbs = (sn.get("thumbnails") or {}).get("high") or (sn.get("thumbnails") or {}).get("medium") or {}
            out.append(
                {
                    "vid": vid,
                    "title": sn.get("title") or "",
                    "published": sn.get("publishedAt") or cd.get("videoPublishedAt") or "",
                    "thumb": thumbs.get("url") or "",
                }
            )
        page = data.get("nextPageToken")
        if not page:
            break
        time.sleep(0.15)
    return out[:limit]


def yt_api_search_shorts(channel_id: str, api_key: str, limit: int) -> set[str]:
    shorts: set[str] = set()
    page = None
    while len(shorts) < limit:
        params = (
            f"part=id&channelId={channel_id}&type=video&order=date"
            f"&videoDuration=short&maxResults={min(50, limit - len(shorts))}&key={api_key}"
        )
        if page:
            params += f"&pageToken={page}"
        raw = fetch(YT_API.format(f"search?{params}"), timeout=25)
        if not raw:
            break
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            break
        for it in data.get("items") or []:
            vid = (it.get("id") or {}).get("videoId")
            if vid:
                shorts.add(vid)
        page = data.get("nextPageToken")
        if not page:
            break
        time.sleep(0.15)
    return shorts


def yt_html_channel_listings(handle: str) -> tuple[dict[str, dict], set[str]]:
    handle = handle.lstrip("@")
    meta: dict[str, dict] = {}
    short_ids: set[str] = set()

    raw = fetch(f"https://www.youtube.com/@{handle}/videos", timeout=30, browser=True)
    if raw:
        html = raw.decode("utf-8", errors="ignore")
        m = re.search(r"ytInitialData\s*=\s*(\{.*?\});\s*(?:</script>|var |\n)", html)
        if m:
            try:
                data = json.loads(m.group(1))
                nodes: list[dict] = []
                _walk_json(data, lambda o: isinstance(o, dict) and "contentId" in o and "metadata" in o, nodes)
                for o in nodes:
                    vid = o.get("contentId")
                    if not isinstance(vid, str) or not re.fullmatch(r"[\w-]{11}", vid):
                        continue
                    md = o.get("metadata") or {}
                    title = (((md.get("lockupMetadataViewModel") or {}).get("title") or {}).get("content") or "")
                    meta[vid] = {"title": title.strip(), "vertical": False, "published": ""}
            except Exception as e:  # noqa: BLE001
                print(f"  yt videos JSON parse fail: {e}", file=sys.stderr)
        for vid in re.findall(r"/watch\?v=([\w-]{11})", html):
            meta.setdefault(vid, {"title": "", "vertical": False, "published": ""})

    time.sleep(0.4)

    raw = fetch(f"https://www.youtube.com/@{handle}/shorts", timeout=30, browser=True)
    if raw:
        html = raw.decode("utf-8", errors="ignore")
        m = re.search(r"ytInitialData\s*=\s*(\{.*?\});\s*(?:</script>|var |\n)", html)
        if m:
            try:
                data = json.loads(m.group(1))
                nodes = []
                _walk_json(
                    data,
                    lambda o: isinstance(o, dict)
                    and isinstance(o.get("entityId"), str)
                    and str(o.get("entityId")).startswith("shorts-shelf-item-"),
                    nodes,
                )
                for o in nodes:
                    vid = str(o.get("entityId")).replace("shorts-shelf-item-", "", 1)
                    if not re.fullmatch(r"[\w-]{11}", vid):
                        ep = ((o.get("onTap") or {}).get("innertubeCommand") or {}).get("reelWatchEndpoint") or {}
                        vid = ep.get("videoId") or ""
                    if not re.fullmatch(r"[\w-]{11}", vid):
                        continue
                    short_ids.add(vid)
                    acc = o.get("accessibilityText") or ""
                    title = acc.split(",")[0].strip() if acc else ""
                    prev = meta.get(vid) or {"title": "", "published": ""}
                    meta[vid] = {
                        "title": title or prev.get("title") or "",
                        "vertical": True,
                        "published": prev.get("published") or "",
                    }
            except Exception as e:  # noqa: BLE001
                print(f"  yt shorts JSON parse fail: {e}", file=sys.stderr)
        for vid in re.findall(r"/shorts/([\w-]{11})", html):
            short_ids.add(vid)
            prev = meta.get(vid) or {"title": "", "published": ""}
            meta[vid] = {"title": prev.get("title") or "", "vertical": True, "published": prev.get("published") or ""}
        for vid in re.findall(r'"videoId":"([\w-]{11})"', html):
            if vid in short_ids or f"/shorts/{vid}" in html:
                short_ids.add(vid)
                prev = meta.get(vid) or {"title": "", "published": ""}
                meta[vid] = {
                    "title": prev.get("title") or "",
                    "vertical": True,
                    "published": prev.get("published") or "",
                }

    for vid in short_ids:
        if vid in meta:
            meta[vid]["vertical"] = True
        else:
            meta[vid] = {"title": "", "vertical": True, "published": ""}
    return meta, short_ids


def yt_oembed_title(vid: str) -> str:
    raw = fetch(
        f"https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v={vid}",
        timeout=12,
        browser=True,
    )
    if not raw:
        return ""
    try:
        return str(json.loads(raw.decode("utf-8")).get("title") or "")
    except Exception:  # noqa: BLE001
        return ""


def yt_rss_rows(channel_id: str, limit: int = 50) -> list[dict]:
    import xml.etree.ElementTree as ET

    ATOM = "{http://www.w3.org/2005/Atom}"
    YT = "{http://www.youtube.com/xml/schemas/2015}"
    MEDIA = "{http://search.yahoo.com/mrss/}"
    raw = fetch(YT_RSS.format(channel_id))
    if not raw:
        return []
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        return []
    rows = []
    for entry in root.findall(f"{ATOM}entry")[:limit]:
        vid_el = entry.find(f"{YT}videoId")
        title_el = entry.find(f"{ATOM}title")
        pub_el = entry.find(f"{ATOM}published")
        vid = (vid_el.text or "").strip() if vid_el is not None else ""
        title = (title_el.text or "").strip() if title_el is not None else ""
        published = (pub_el.text or "").strip() if pub_el is not None else ""
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
        if vid:
            rows.append(
                {
                    "vid": vid,
                    "title": title,
                    "published": published,
                    "thumb": thumb,
                    "views": views,
                    "vertical": vertical,
                }
            )
    return rows


def build_own_youtube(ch: dict, cfg: dict, enrich_fn) -> list[dict]:
    cid = ch.get("id") or ""
    handle = (ch.get("handle") or cfg.get("own_youtube_handle") or "@ChannelBaul420").lstrip("@")
    name = ch.get("name") or "Channel Baul"
    topic = ch.get("topic") or "own"
    lang = ch.get("lang") or "en"
    priority = int(ch.get("priority") or 100)
    own_cap = int(ch.get("max_per_source") or cfg.get("own_max_per_source") or 500)

    by_vid: dict[str, dict] = {}
    short_ids: set[str] = set()
    api_key = youtube_api_key()

    if api_key and cid:
        print(f"  YT Data API uploads playlist for {cid}")
        for row in yt_api_playlist_items(uploads_playlist_id(cid), api_key, own_cap):
            by_vid[row["vid"]] = row
        short_ids |= yt_api_search_shorts(cid, api_key, min(100, own_cap))
        time.sleep(0.2)

    print(f"  YT HTML listings @{handle}")
    html_meta, html_shorts = yt_html_channel_listings(handle)
    short_ids |= html_shorts
    for vid, info in html_meta.items():
        prev = by_vid.get(vid) or {}
        by_vid[vid] = {
            "vid": vid,
            "title": prev.get("title") or info.get("title") or "",
            "published": prev.get("published") or info.get("published") or "",
            "thumb": prev.get("thumb") or "",
            "vertical": bool(info.get("vertical") or vid in short_ids),
        }

    print(f"  YT RSS merge {cid}")
    for row in yt_rss_rows(cid, min(50, own_cap)):
        vid = row["vid"]
        prev = by_vid.get(vid) or {"vid": vid}
        prev["title"] = prev.get("title") or row.get("title") or ""
        prev["published"] = row.get("published") or prev.get("published") or ""
        prev["thumb"] = row.get("thumb") or prev.get("thumb") or ""
        prev["views"] = row.get("views")
        if row.get("vertical"):
            short_ids.add(vid)
            prev["vertical"] = True
        else:
            prev["vertical"] = bool(prev.get("vertical") or vid in short_ids)
        by_vid[vid] = prev

    missing = [v for v, row in by_vid.items() if not (row.get("title") or "").strip()]
    for i, vid in enumerate(missing[:own_cap]):
        title = yt_oembed_title(vid)
        if title:
            by_vid[vid]["title"] = title
        if i and i % 8 == 0:
            time.sleep(0.25)

    items: list[dict] = []
    for vid, row in by_vid.items():
        vertical = bool(row.get("vertical") or vid in short_ids)
        url = (
            f"https://www.youtube.com/shorts/{vid}"
            if vertical
            else f"https://www.youtube.com/watch?v={vid}"
        )
        items.append(
            enrich_fn(
                {
                    "id": f"yt:{vid}",
                    "platform": "youtube",
                    "source": name,
                    "topic": topic,
                    "own": True,
                    "title": row.get("title") or f"YouTube {vid}",
                    "url": url,
                    "embed": f"https://www.youtube-nocookie.com/embed/{vid}",
                    "thumbnail": row.get("thumb") or f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                    "published": row.get("published") or "",
                    "views": row.get("views"),
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
    items.sort(key=lambda i: i.get("published") or "", reverse=True)
    print(f"  own YT total={len(items)} shorts={sum(1 for i in items if i.get('vertical'))}")
    return items[:own_cap]


def ig_item(shortcode: str, *, reel: bool, title: str, published: str, enrich_fn, priority: int = 100) -> dict:
    kind = "reel" if reel else "p"
    url = f"https://www.instagram.com/{kind}/{shortcode}/"
    return enrich_fn(
        {
            "id": f"ig:{shortcode}",
            "platform": "instagram",
            "source": "Channel Baul",
            "topic": "own",
            "own": True,
            "title": title or f"Instagram {'reel' if reel else 'post'} {shortcode}",
            "url": url,
            "embed": f"https://www.instagram.com/{kind}/{shortcode}/embed",
            "thumbnail": "",
            "published": published or "",
            "views": None,
            "score": None,
            "comments": None,
            "vertical": bool(reel),
            "author": "baul_international",
            "permalink": url,
            "ig_kind": kind,
        },
        lang="en",
        priority=priority,
    )


def load_instagram_stub(enrich_fn) -> list[dict]:
    if not IG_OWN.exists():
        return []
    try:
        data = json.loads(IG_OWN.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        print(f"  instagram-own.json read fail: {e}", file=sys.stderr)
        return []
    out = []
    for row in data.get("items") or []:
        url = str(row.get("url") or "")
        code = str(row.get("shortcode") or "")
        m = re.search(r"instagram\.com/(?:[\w.]+/)?(reel|reels|p|tv)/([\w-]+)", url, re.I)
        if m:
            kind, code = m.group(1).lower(), m.group(2)
            reel = kind.startswith("reel")
        elif code:
            reel = bool(row.get("reel") or row.get("vertical"))
        else:
            continue
        out.append(
            ig_item(
                code,
                reel=reel,
                title=str(row.get("title") or ""),
                published=str(row.get("published") or ""),
                enrich_fn=enrich_fn,
            )
        )
    return out


def build_instagram_own(cfg: dict, enrich_fn) -> list[dict]:
    ig_cfg = cfg.get("instagram") or {}
    username = (ig_cfg.get("username") or "baul_international").lstrip("@")
    items: list[dict] = []
    seen: set[str] = set()

    api_url = f"https://www.instagram.com/api/v1/users/web_profile_info/?username={username}"
    raw = fetch(
        api_url,
        timeout=20,
        browser=True,
        extra_headers={
            "X-IG-App-ID": "936619743392459",
            "Referer": f"https://www.instagram.com/{username}/",
            "Accept": "*/*",
        },
    )
    if raw:
        try:
            data = json.loads(raw.decode("utf-8"))
            user = (data.get("data") or {}).get("user") or {}
            edges = (user.get("edge_owner_to_timeline_media") or {}).get("edges") or []
            edges = list(edges) + list((user.get("edge_felix_video_timeline") or {}).get("edges") or [])
            for e in edges:
                n = e.get("node") or {}
                code = n.get("shortcode")
                if not code or code in seen:
                    continue
                is_video = bool(n.get("is_video"))
                typename = str(n.get("__typename") or "")
                if not is_video and "GraphImage" in typename and not ig_cfg.get("include_photos", False):
                    continue
                reel = is_video or "GraphVideo" in typename or "Reel" in typename
                caps = (
                    (((n.get("edge_media_to_caption") or {}).get("edges") or [{}])[0].get("node") or {}).get("text")
                    or ""
                )
                title = (caps.split("\n")[0] or "").strip()[:180] or f"@{username} {code}"
                ts = n.get("taken_at_timestamp")
                published = (
                    datetime.fromtimestamp(ts, tz=timezone.utc).isoformat().replace("+00:00", "Z") if ts else ""
                )
                seen.add(code)
                items.append(ig_item(code, reel=reel or is_video, title=title, published=published, enrich_fn=enrich_fn))
            print(f"  IG API edges -> {len(items)} items")
        except Exception as e:  # noqa: BLE001
            print(f"  IG API parse fail: {e}", file=sys.stderr)

    if not items:
        raw = fetch(f"https://www.instagram.com/{username}/", timeout=25, browser=True)
        if raw:
            html = raw.decode("utf-8", errors="ignore")
            codes = set(re.findall(r'"shortcode":"([\w-]+)"', html))
            codes |= set(re.findall(r"/reel/([\w-]+)/", html))
            codes |= set(re.findall(r"/p/([\w-]+)/", html))
            for code in list(codes)[:40]:
                if code in seen:
                    continue
                seen.add(code)
                items.append(ig_item(code, reel=True, title=f"@{username}", published="", enrich_fn=enrich_fn))
            print(f"  IG HTML shortcodes -> {len(items)}")
            if not codes:
                print(
                    "  IG login wall / empty listing — use instagram-own.json or Meta token",
                    file=sys.stderr,
                )

    stub = load_instagram_stub(enrich_fn)
    for it in stub:
        code = (it.get("id") or "").replace("ig:", "", 1)
        if code in seen:
            continue
        seen.add(code)
        items.append(it)
    if stub:
        print(f"  IG stub merged, total={len(items)}")

    if not items:
        print(
            "  Instagram blocked or empty. Paste reel URLs into instagram-own.json "
            "or set a Meta long-lived token (see SECRETS.md).",
            file=sys.stderr,
        )
    return items