const SAMPLE_CLIPS = [
  {
    id: "block-party",
    title: "Block party shuts down the avenue after the speaker stack tips",
    channel: "Baul Clips",
    views: "1.2M views",
    age: "2 days ago",
    length: "3:41",
    blurb: "Someone plugged the aux into the wrong deck and the whole corner started a dance line.",
    category: "Wild",
  },
  {
    id: "freestyle",
    title: "Corner freestyle goes eight bars too long and the crowd stays",
    channel: "Late Mic",
    views: "842K views",
    age: "5 days ago",
    length: "4:12",
    blurb: "A cypher on a side street turns into the clip everyone is passing around tonight.",
    category: "Music",
  },
  {
    id: "hoop",
    title: "Pickup game ends on a half-court heave nobody called",
    channel: "Court Tape",
    views: "610K views",
    age: "1 week ago",
    length: "1:58",
    blurb: "Winner stays. The ball never touches the rim.",
    category: "Sports",
  },
  {
    id: "food",
    title: "Night shift cooks a full plate on one burner",
    channel: "After Hours",
    views: "390K views",
    age: "3 days ago",
    length: "6:05",
    blurb: "Eggs, rice, and whatever was left in the walk-in. No measuring cups.",
    category: "Life",
  },
  {
    id: "dance",
    title: "Train platform dance battle with the doors about to close",
    channel: "Baul Clips",
    views: "2.4M views",
    age: "12 hours ago",
    length: "2:27",
    blurb: "Two strangers, one speaker, and a conductor who waited an extra beat.",
    category: "Wild",
  },
  {
    id: "studio",
    title: "Bedroom session: hook written in one take",
    channel: "Late Mic",
    views: "188K views",
    age: "4 days ago",
    length: "5:33",
    blurb: "Mic on a stack of books. The second hook is the one that stuck.",
    category: "Music",
  },
  {
    id: "snow",
    title: "Snowball ceasefire breaks the second the camera turns",
    channel: "Street Roll",
    views: "955K views",
    age: "6 days ago",
    length: "2:04",
    blurb: "They agreed to stop. They did not stop.",
    category: "Wild",
  },
  {
    id: "open-mic",
    title: "Open mic host loses the list and the room picks the next act",
    channel: "Late Mic",
    views: "274K views",
    age: "8 days ago",
    length: "7:19",
    blurb: "No lineup, no problem. The third person up brought a guitar and a story.",
    category: "Music",
  },
  {
    id: "skate",
    title: "Empty lot session until the lights kick on",
    channel: "Court Tape",
    views: "141K views",
    age: "2 weeks ago",
    length: "3:09",
    blurb: "Last trick of the night is the one that lands.",
    category: "Sports",
  },
].map((clip) => ({
  ...clip,
  source: "sample",
  platform: "sample",
  vertical: false,
  baseLikes: 40 + (hashCode(clip.id) % 900),
  baseReposts: 3 + (hashCode(clip.id) % 60),
}));

const FRIENDS = ["Late Mic", "Court Tape", "Amina", "Jordan", "Street Roll", "After Hours", "Nia", "Diego"];
const SECTIONS = ["home", "videos", "shorts", "wall"];
const SECTION_TONE = { home: "dark", videos: "light", shorts: "dark", wall: "light" };
const FILTERS = ["All", "Channel Baul", "News", "Shorts", "Links", "Mine", "Wild", "Music", "Sports", "Life"];
const MAX_UPLOAD = 200 * 1024 * 1024;
const YT_CHANNEL = "https://www.youtube.com/@ChannelBaul420";
const NEWS_SOURCE_RE = /news|vox|al jazeera|democracy now|guardian|last\s*week|dw\b|bbc|cnn|intercept|middle east eye|mondoweiss/i;
const CANNABIS_TOPIC_RE = /^(cannabis|hemp|psychedelics|legalization|red_states)$/i;
/** Weed/hemp or psychedelic substance markers for Breaking legalization filter. */
const BREAKING_SUBSTANCE_RE =
  /\b(cannabis|marijuana|marihuana|weed|ganja|hemp|thc|cbd|psychedelic|psilocybin|psilocin|mdma|ayahuasca|lsd|ketamine|mushroom|dmt|mescaline)\b/i;
/** Legalization / decrim / policy reform markers. */
const BREAKING_POLICY_RE =
  /\b(legaliz|decriminal|reschedul|drug\s+policy|safe\s+supply|harm\s+reduction|ballot|measure\s+\d+|prop(osition)?\.?\s*\d+|bill\s+[hs]?\s*\.??\d+|ban\b|allow|regulated|adult[- ]use|medical\s+(cannabis|marijuana|mushroom)|therapy\s+approv|fda\s+approv|schedule\s+[ivx]+)\b/i;
const BREAKING_BLOCK_RE =
  /\b(gaza|palestine|palestinian|israel|idf|netanyahu|west\s+bank|rafah|hamas|hezbollah|ukraine|russia|putin|trump\s+rally|election\s+fraud)\b/i;
const BREAKING_GEO_USA_RE =
  /\b(usa|u\.?s\.?a?\.?\b|united\s+states|america|alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new\s+hampshire|new\s+jersey|new\s+mexico|new\s+york|north\s+carolina|north\s+dakota|ohio|oklahoma|oregon|pennsylvania|rhode\s+island|south\s+carolina|south\s+dakota|tennessee|texas|utah|vermont|virginia|washington|west\s+virginia|wisconsin|wyoming|red\s+state)\b/i;
const BREAKING_GEO_BD_RE = /\b(bangladesh|dhaka|bengali|chittagong|sylhet)\b/i;
const BREAKING_GEO_OTHER_RE =
  /\b(uk|u\.?k\.?|britain|british|england|scotland|wales|canada|canadian|ontario|quebec|alberta|manitoba|saskatchewan|nova\s+scotia|british\s+columbia|\bbc\b|pakistan|karachi|lahore|islamabad|india|delhi|mumbai|kolkata|australia|sydney|melbourne|japan|tokyo|osaka)\b/i;
const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
/** Non-Latin scripts (Arabic, Hebrew, Bengali/Devanagari, CJK, Cyrillic, Thai, Hangul). */
const NON_LATIN_SCRIPT_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF\u0900-\u097F\u0980-\u09FF\u0E00-\u0E7F\u0400-\u04FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/;

const state = {
  section: "home",
  activeId: null,
  query: "",
  filter: "All",
  playing: false,
  commentFor: null,
  invert: store.get("cb.invert", false),
  posts: store.get("cb.posts", null) || seedPosts(),
  likes: store.get("cb.likes", {}),
  clipComments: store.get("cb.clipComments", {}),
  links: store.get("cb.links", []),
  uploads: [],
  channel: [],
  feedMeta: null,
  shortsLoops: 1,
  overlay: null,
  deviceDraft: null,
  linkDraft: null,
};

const app = document.querySelector("#app");
const overlayRoot = document.querySelector("#overlay");
const toastEl = document.querySelector("#toast");

function seedPosts() {
  const now = Date.now();
  const hour = 3600e3;
  return [
    {
      id: "p1",
      kind: "status",
      author: "Baul Clips",
      time: now - 2 * hour,
      text: "New clip up from the avenue. If you were there, drop the angle you shot.",
      likes: 48,
      liked: false,
      reposts: 12,
      comments: [
        { id: "c1", author: "Late Mic", text: "I was on the corner. That speaker stack was doomed." },
        { id: "c2", author: "Amina", text: "Posted my phone video on the wall." },
      ],
    },
    {
      id: "p2",
      kind: "status",
      author: "Court Tape",
      time: now - 26 * hour,
      text: "Looking for a fifth tomorrow at the outdoor courts. Winner stays, losers bring water.",
      likes: 21,
      liked: false,
      reposts: 4,
      comments: [{ id: "c3", author: "Jordan", text: "I'm in after 6." }],
    },
    {
      id: "p3",
      kind: "status",
      author: "Channelbaul",
      time: now - 72 * hour,
      text: "Wall is open. Post a status, a link, or the clip you want on the front page.",
      likes: 86,
      liked: false,
      reposts: 19,
      comments: [],
    },
  ];
}

/* ---------- helpers ---------- */

function hashCode(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
const esc = escapeHtml;

function fmtNum(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(".0", "")}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(".0", "")}K`;
  return String(n);
}

function ago(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (!Number.isFinite(s)) return "";
  if (s < 60) return "Just now";
  const steps = [
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.35, "week"],
    [12, "month"],
    [Infinity, "year"],
  ];
  let v = s / 60;
  let unit = "minute";
  for (const [size, name] of steps) {
    unit = name;
    if (v < size) break;
    v /= size;
  }
  const n = Math.floor(v);
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

function fmtDur(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtSize(bytes) {
  return bytes >= 1e9 ? `${(bytes / 1e9).toFixed(2)} GB` : `${(bytes / 1e6).toFixed(1)} MB`;
}

function handle(name) {
  return String(name || "").replace(/\s+/g, "");
}

function persist() {
  store.set("cb.posts", state.posts);
  store.set("cb.likes", state.likes);
  store.set("cb.clipComments", state.clipComments);
  store.set("cb.links", state.links);
}

/* ---------- clips ---------- */

function channelClip(v) {
  const id = String(v.id || "");
  if (!/^[\w-]{11}$/.test(id)) return null;
  const short = !!v.short;
  return {
    id: `yt-${id}`,
    title: String(v.title || "Channel Baul video"),
    channel: "Channel Baul",
    views: typeof v.views === "number" ? `${fmtNum(v.views)} view${v.views === 1 ? "" : "s"}` : "",
    age: ago(Date.parse(v.published)),
    length: short ? "Short" : "",
    category: short ? "Short" : "Channel Baul",
    topic: "own",
    own: true,
    blurb: String(v.title || ""),
    source: "channel",
    platform: "youtube",
    media: yt(id, short),
    thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    vertical: short,
  };
}

function ytIdFromFeed(item) {
  const fromId = String(item.id || "").match(/^yt:([\w-]{11})$/);
  if (fromId) return fromId[1];
  const fromUrl = String(item.url || "").match(/(?:v=|shorts\/|embed\/|youtu\.be\/)([\w-]{11})/);
  return fromUrl ? fromUrl[1] : "";
}

function feedClip(item) {
  if (!item) return null;
  let media = null;
  let articleOnly = false;
  if (item.platform === "youtube" || /^yt:/.test(String(item.id || ""))) {
    const id = ytIdFromFeed(item);
    if (!id) return null;
    const short = !!item.vertical || /\/shorts\//i.test(String(item.url || ""));
    media = yt(id, short);
  } else if (item.url) {
    media = parseVideoUrl(item.url);
    if (!media && (item.platform === "article" || /^https?:\/\//i.test(String(item.url)))) {
      articleOnly = true;
      media = { platform: "article", id: String(item.id || item.url), url: String(item.url), vertical: false };
    }
  }
  if (!media) return null;
  const sourceName = String(item.source || item.author || PLATFORMS[media.platform] || "Feed");
  const own = !!item.own || /channel\s*baul/i.test(sourceName);
  const topic = String(item.topic || (own ? "own" : "global"));
  const tags = Array.isArray(item.tags) ? item.tags.map(String) : [];
  const cannabis = own
    ? false
    : CANNABIS_TOPIC_RE.test(topic) || tags.some((t) => CANNABIS_TOPIC_RE.test(t));
  const isNews =
    articleOnly ||
    (!cannabis &&
      (topic === "news" || NEWS_SOURCE_RE.test(sourceName) || topic === "global" || topic === "palestine"));
  const thumb =
    typeof item.thumbnail === "string" && item.thumbnail.startsWith("https://")
      ? item.thumbnail
      : articleOnly
        ? ""
        : thumbFor(media);
  const views = typeof item.views === "number" ? `${fmtNum(item.views)} view${item.views === 1 ? "" : "s"}` : "";
  const title = String(item.title || (articleOnly ? "Article" : "Video")).trim();
  return {
    id: String(item.id || `${media.platform}-${media.id}`).replace(/[^\w:-]/g, "-"),
    title,
    channel: sourceName,
    views,
    age: ago(Date.parse(item.published)),
    length: media.vertical ? "Short" : articleOnly ? "Article" : "",
    category: own ? "Channel Baul" : cannabis ? topic : isNews ? "News" : topic,
    topic,
    tags,
    own,
    cannabis,
    breaking: !!item.breaking || tags.includes("breaking") || tags.includes("legalization"),
    article: articleOnly,
    href: articleOnly ? String(item.url) : "",
    lang: String(item.lang || (ARABIC_SCRIPT_RE.test(title) ? "ar" : "en")),
    blurb: title,
    source: own ? "channel" : cannabis || articleOnly ? (cannabis ? "feed" : "news") : isNews ? "news" : "feed",
    platform: media.platform,
    media,
    thumb,
    vertical: !!media.vertical,
    baseLikes: (typeof item.score === "number" ? item.score : 0) + (hashCode(String(item.id)) % 50),
    baseReposts: 1 + (hashCode(String(item.id)) % 25),
  };
}

function linkClip(link) {
  const media = parseVideoUrl(link.url);
  if (!media) return null;
  const name = PLATFORMS[media.platform];
  return {
    id: link.id,
    title: link.title || `${name} video`,
    channel: link.author || name,
    views: "",
    age: ago(link.addedAt),
    length: media.vertical ? "Short" : "",
    category: name,
    blurb: link.caption || media.url,
    source: "link",
    platform: media.platform,
    media,
    thumb: (link.thumb || "").startsWith("https://") ? link.thumb : thumbFor(media),
    vertical: media.vertical,
  };
}

function uploadClip(rec, url) {
  return {
    id: rec.id,
    title: rec.title || "My upload",
    channel: "You",
    views: "",
    age: ago(rec.addedAt),
    length: rec.vertical ? "Short" : fmtDur(rec.duration),
    category: "Upload",
    blurb: rec.caption || "",
    source: "upload",
    platform: "upload",
    src: url,
    size: rec.size,
    vertical: !!rec.vertical,
  };
}

function allClips() {
  return [...state.uploads, ...state.links.map(linkClip).filter(Boolean), ...state.channel, ...SAMPLE_CLIPS];
}

function clipById(id) {
  return allClips().find((clip) => clip.id === id);
}

function visibleClips() {
  const q = state.query.trim().toLowerCase();
  return allClips().filter((clip) => {
    const f = state.filter;
    const matchesFilter =
      f === "All" ||
      (f === "Channel Baul" && (clip.source === "channel" || clip.own)) ||
      (f === "News" && (clip.source === "news" || clip.category === "News")) ||
      (f === "Shorts" && clip.vertical) ||
      (f === "Links" && clip.source === "link") ||
      (f === "Mine" && (clip.source === "upload" || clip.source === "link")) ||
      clip.category === f;
    const matchesQuery =
      !q ||
      [clip.title, clip.channel, clip.category, clip.topic, PLATFORMS[clip.platform]].some((t) =>
        String(t).toLowerCase().includes(q),
      );
    return matchesFilter && matchesQuery;
  });
}

function newsClips() {
  return allClips().filter((c) => c.source === "news" || c.category === "News");
}

function shortsItems() {
  const verts = allClips().filter((c) => c.vertical);
  return verts.length ? verts : SAMPLE_CLIPS;
}

function isMine(clip) {
  return clip && (clip.source === "upload" || clip.source === "link");
}

function isReposted(type, id) {
  return state.posts.some((p) => p.kind === "repost" && p.repostOf?.type === type && p.repostOf.id === id);
}

function likeCount(clip) {
  return (clip.baseLikes || 0) + (state.likes[clip.id] ? 1 : 0);
}

function repostCount(clip) {
  return (clip.baseReposts || 0) + (isReposted("clip", clip.id) ? 1 : 0);
}

/* ---------- view pieces ---------- */

function thumb(clip, extra = "") {
  let img = "";
  if (clip.thumb) img = `<img src="${esc(clip.thumb)}" alt="" loading="lazy" />`;
  else if (clip.src) img = `<video src="${esc(clip.src)}#t=0.5" muted preload="metadata" playsinline></video>`;
  const badge = clip.source === "sample" ? clip.category : PLATFORMS[clip.platform];
  return `<span class="thumb ${extra}">${img}<b>${esc(badge)}</b><i>Play</i>${
    clip.length ? `<em>${esc(clip.length)}</em>` : ""
  }</span>`;
}

function clipActions(clip) {
  const liked = !!state.likes[clip.id];
  const reposted = isReposted("clip", clip.id);
  return `<span class="acts">
      <button type="button" class="act ${liked ? "is-on" : ""}" data-like-clip="${esc(clip.id)}" aria-pressed="${liked}">♥ <span data-n>${fmtNum(likeCount(clip))}</span></button>
      <button type="button" class="act ${reposted ? "is-on" : ""}" data-repost-clip="${esc(clip.id)}" aria-pressed="${reposted}">↻ Repost <span data-n>${fmtNum(repostCount(clip))}</span></button>
    </span>`;
}

function meta(clip, { views = true } = {}) {
  return [clip.channel, views ? clip.views : "", clip.age].filter(Boolean).map(esc).join(" · ");
}

function isNewsClip(clip) {
  return !!(clip && (clip.source === "news" || clip.category === "News"));
}

function hasArabicTitle(clip) {
  return !!(clip && ARABIC_SCRIPT_RE.test(String(clip.title || "")));
}

/** Primarily Latin script (accents OK). Skip Arabic/Bengali/etc. for ticker/home English feel. */
function isLatinEnglishTitle(title) {
  const t = String(title || "").trim();
  if (!t) return false;
  const letters = [...t].filter((c) => /\p{L}/u.test(c));
  if (!letters.length) return true;
  const latin = letters.filter((c) => {
    const cp = c.codePointAt(0);
    return (
      (cp >= 0x0041 && cp <= 0x007a) ||
      (cp >= 0x00c0 && cp <= 0x024f) ||
      (cp >= 0x1e00 && cp <= 0x1eff)
    );
  }).length;
  return latin / letters.length >= 0.7;
}

function isTickerSafe(clip) {
  return !!(clip && isLatinEnglishTitle(clip.title));
}

function isCannabisClip(clip) {
  return !!(clip && (clip.cannabis || CANNABIS_TOPIC_RE.test(String(clip.topic || ""))));
}

function clipSortScore(clip) {
  let score = 0;
  if (clip.own || clip.source === "channel") score += 4;
  if (isCannabisClip(clip)) score += 3;
  if (isLatinEnglishTitle(clip.title)) score += 2;
  return score;
}

function sortedHomeClips(clips) {
  return [...clips].sort((a, b) => {
    const d = clipSortScore(b) - clipSortScore(a);
    if (d) return d;
    return 0;
  });
}

/** Strict Breaking content: cannabis/hemp or psychedelic + legalization/decrim/policy. No war/geopolitics. */
function isLegalizationBreaking(clip) {
  if (!clip || clip.own || clip.source === "channel" || clip.source === "upload") return false;
  if (!isTickerSafe(clip)) return false;
  const title = String(clip.title || "");
  if (BREAKING_BLOCK_RE.test(title)) return false;
  const blob = [title, clip.topic, ...(clip.tags || [])].join(" ");
  const substance =
    BREAKING_SUBSTANCE_RE.test(blob) ||
    isCannabisClip(clip) ||
    /^(cannabis|hemp|psychedelics|legalization)$/i.test(String(clip.topic || ""));
  const policy =
    BREAKING_POLICY_RE.test(blob) ||
    clip.breaking ||
    (clip.tags || []).includes("legalization") ||
    String(clip.topic || "") === "legalization";
  // Known legalization outlets: substance alone is enough; otherwise need substance + policy.
  const outlet =
    /marijuana\s*moment|norml|high\s*times|leafly|doubleblind|psychedelic\s*alpha|maps|talking\s*drugs|filter\s*mag|drug\s*policy|cannabis\s*now|ganjapreneur|lucid\s*news/i.test(
      String(clip.channel || ""),
    );
  if (outlet && substance) return true;
  return substance && policy;
}

function breakingTickerScore(clip) {
  const blob = [clip.title, clip.topic, ...(clip.tags || [])].join(" ");
  let score = 10;
  if (BREAKING_GEO_USA_RE.test(blob)) score += 40;
  if (BREAKING_GEO_BD_RE.test(blob)) score += 40;
  if (BREAKING_GEO_OTHER_RE.test(blob)) score += 22;
  if (BREAKING_POLICY_RE.test(blob) || (clip.tags || []).includes("legalization")) score += 15;
  if (isCannabisClip(clip)) score += 8;
  return score;
}

/**
 * Exactly ONE own Channel Baul headline per calendar day (America/New_York).
 * Stable: hash(YYYY-MM-DD) % ownItems.length so it does not change on refresh.
 * Skips titles that fail the Latin/English ticker filter; walks to the next own item.
 */
function nyDateKey(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function hashDateKey(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function tickerOwnClip() {
  const own = allClips().filter(
    (c) => c && (c.own || c.source === "channel") && c.source !== "upload" && c.id,
  );
  if (!own.length) return null;
  const start = hashDateKey(nyDateKey()) % own.length;
  for (let i = 0; i < own.length; i++) {
    const clip = own[(start + i) % own.length];
    if (isTickerSafe(clip)) return clip;
  }
  return null;
}

/** Breaking ticker: exactly one own headline + legalization-only news. Never views. */
function tickerClips() {
  const want = 12;
  const own = tickerOwnClip();
  const breaking = allClips()
    .filter(isLegalizationBreaking)
    .sort((a, b) => breakingTickerScore(b) - breakingTickerScore(a) || String(b.id).localeCompare(String(a.id)));
  const out = [];
  const seen = new Set();
  const add = (clip) => {
    if (!clip || seen.has(clip.id)) return;
    seen.add(clip.id);
    out.push(clip);
  };
  if (own) add(own);
  breaking.forEach((c) => {
    if (out.length >= want) return;
    add(c);
  });
  return out.slice(0, want);
}

function render() {
  const active = state.activeId ? clipById(state.activeId) : null;
  app.innerHTML = `
    <header class="bar base">
      <button class="logo" data-go="home" type="button" aria-label="Channelbaul home">
        <img src="logo-small.jpg" alt="" width="40" height="40" /><span>CHANNELBAUL</span>
      </button>
      <nav class="nav">
        ${SECTIONS.map(
          (id) =>
            `<button type="button" data-go="${id}" class="${state.section === id && !(id === "videos" && active) ? "is-on" : ""}">${id}</button>`,
        ).join("")}
      </nav>
      <div class="bar-tools">
        <button type="button" class="btn" data-upload="device">▲ Upload</button>
        <button type="button" class="btn ghost invert-btn" data-invert aria-pressed="${state.invert}">◐ Invert</button>
      </div>
      <form class="search" data-search>
        <input name="q" value="${esc(state.query)}" placeholder="Search clips" aria-label="Search clips" />
        <button type="submit" class="btn">Search</button>
      </form>
    </header>
    ${state.section === "home" ? ticker() + home() : ""}
    ${state.section === "videos" && !active ? browse() : ""}
    ${state.section === "videos" && active ? watch(active) : ""}
    ${state.section === "shorts" ? shorts() : ""}
    ${state.section === "wall" ? wall() : ""}
    ${
      state.section === "shorts"
        ? ""
        : `<footer class="site-foot inv"><span>CHANNELBAUL.COM</span><a href="${YT_CHANNEL}" target="_blank" rel="noopener">YouTube @ChannelBaul420</a></footer>`
    }
  `;
  applyTone();
  measureBar();
  wireShorts();
  updateHash(active);
}

function applyTone() {
  const base = SECTION_TONE[state.section] || "dark";
  const tone = state.invert ? (base === "dark" ? "light" : "dark") : base;
  document.body.dataset.polarity = tone;
  document.querySelectorAll("[data-invert]").forEach((b) => b.setAttribute("aria-pressed", String(state.invert)));
}

function measureBar() {
  const bar = app.querySelector(".bar");
  if (bar) document.documentElement.style.setProperty("--bar-h", `${bar.offsetHeight}px`);
}

function updateHash(active) {
  const hash = active ? `#v=${active.id}` : state.section === "home" ? "" : `#${state.section}`;
  if (location.hash !== hash) history.replaceState(null, "", hash || location.pathname + location.search);
}

function ticker() {
  const clips = tickerClips();
  if (!clips.length) return "";
  const dailyOwn = tickerOwnClip();
  const items = (hidden) =>
    clips
      .map((clip) => {
        const isBaul = !!(dailyOwn && clip.id === dailyOwn.id);
        const badge = isBaul ? `<span class="ticker-baul">BAUL</span>` : "";
        return `<button type="button" class="${isBaul ? "is-baul" : ""}" data-open="${esc(clip.id)}"${
          hidden ? ' tabindex="-1"' : ""
        }>${badge}${esc(clip.title)}</button>`;
      })
      .join("");
  return `
    <div class="ticker inv" role="region" aria-label="Breaking news">
      <span class="ticker-tag">Breaking</span>
      <div class="ticker-track">
        <div class="ticker-run">
          <div>${items(false)}</div>
          <div aria-hidden="true">${items(true)}</div>
        </div>
      </div>
    </div>`;
}

function card(clip, opts = {}) {
  const showViews = opts.views !== false && !isNewsClip(clip);
  return `
    <article class="card">
      <button class="card-hit" type="button" data-open="${esc(clip.id)}">
        ${thumb(clip)}
        <strong>${esc(clip.title)}</strong>
        <span class="meta">${meta(clip, { views: showViews })}</span>
      </button>
      ${clipActions(clip)}
    </article>`;
}

function home() {
  const clips = sortedHomeClips(allClips().filter((c) => c.own || isLatinEnglishTitle(c.title)));
  const featured =
    clips.find((c) => (c.source === "channel" || c.own) && !c.vertical) ||
    clips.find((c) => c.own) ||
    clips.find((c) => isCannabisClip(c) && !c.vertical) ||
    clips.find((c) => !c.vertical) ||
    clips[0];
  if (!featured) return `<main class="home base"><p class="empty">No clips yet.</p></main>`;
  const rest = clips.filter((c) => c !== featured);
  const flat = rest.filter((c) => !c.vertical);
  const tall = rest.filter((c) => c.vertical);
  const cannabisBand = flat.filter((c) => isCannabisClip(c));
  const news = newsClips().filter((c) => c !== featured && !c.vertical && isLatinEnglishTitle(c.title));
  const risePool = cannabisBand.length ? cannabisBand : news.length ? news : flat;
  const rise = risePool.slice(0, 5);
  const latest = flat.filter((c) => !rise.includes(c)).slice(0, 8);
  const newsBand = (cannabisBand.length ? cannabisBand : news).slice(0, 8);
  const ownFeatured = !!(featured.own || featured.source === "channel");
  return `
    <main class="home base">
      <div class="home-layout">
        <article class="feature${ownFeatured ? " is-own" : ""}">
          <p class="kicker">${ownFeatured ? "Channel Baul · Featured" : "Front page"}</p>
          <button class="feature-hit" type="button" data-open="${esc(featured.id)}">
            ${thumb(featured)}
            <h1>${esc(featured.title)}</h1>
          </button>
          <p class="byline">${meta(featured, { views: !isNewsClip(featured) })}</p>
          <div class="chips">${["Channel Baul", "News", "Shorts", "Wild", "Music"]
            .map((c) => `<button type="button" data-chip="${c}">${c}</button>`)
            .join("")}</div>
          ${clipActions(featured)}
        </article>
        <aside class="rise inv">
          <h2>${cannabisBand.length ? "Cannabis & culture" : news.length ? "News & world" : "On the rise"}</h2>
          <ol>
            ${rise
              .map(
                (clip, i) => `
              <li>
                <button type="button" data-open="${esc(clip.id)}">
                  <span class="n">${i + 1}</span>
                  ${thumb(clip, "mini")}
                  <span><strong>${esc(clip.title)}</strong><em>${meta(clip, { views: !news.length && !isNewsClip(clip) })}</em></span>
                </button>
              </li>`,
              )
              .join("")}
          </ol>
          <div class="submit base">
            <h3>Send a clip</h3>
            <p>Phone video, a link from YouTube, TikTok, Instagram, X and more.</p>
            <div class="row">
              <button type="button" class="btn" data-upload="device">Upload</button>
              <button type="button" class="btn ghost" data-upload="link">Paste a link</button>
            </div>
          </div>
        </aside>
      </div>
    </main>
    ${
      newsBand.length
        ? `<section class="latest-band inv">
      <div class="latest">
        <div class="strip-head"><h2 class="label">${cannabisBand.length ? "Hemp · Cannabis · Psychedelics" : "News"}</h2><button type="button" class="btn ghost" data-chip="${cannabisBand.length ? "Channel Baul" : "News"}">${cannabisBand.length ? "Channel Baul" : "All news"}</button></div>
        <div class="cards">${newsBand.map((c) => card(c, { views: false })).join("")}</div>
      </div>
    </section>`
        : ""
    }
    <section class="latest-band ${newsBand.length ? "base" : "inv"}">
      <div class="latest">
        <h2 class="label">Latest clips</h2>
        <div class="cards">${(latest.length ? latest : flat.slice(0, 8)).map(card).join("")}</div>
      </div>
    </section>
    ${
      tall.length
        ? `<section class="shorts-strip ${newsBand.length ? "inv" : "base"}">
      <div class="latest">
        <div class="strip-head"><h2 class="label">Shorts</h2><button type="button" class="btn" data-go="shorts">Doom scroll ↓</button></div>
        <div class="tall-row">
          ${tall
            .slice(0, 8)
            .map(
              (clip) => `
            <button type="button" class="tall" data-go="shorts" data-start="${esc(clip.id)}">
              ${thumb(clip, "vert")}
              <strong>${esc(clip.title)}</strong>
            </button>`,
            )
            .join("")}
        </div>
      </div>
    </section>`
        : ""
    }`;
}

function browse() {
  const clips = visibleClips();
  return `
    <section class="channel-banner inv">
      <img src="logo-small.jpg" alt="" width="64" height="64" />
      <div>
        <strong>Channel Baul</strong>
        <span>${
          state.channel.length
            ? `${state.channel.length} feed clips${state.feedMeta ? ` · updated ${esc(state.feedMeta)}` : ""}`
            : "Clips and links"
        } · @ChannelBaul420</span>
      </div>
      <a class="btn" href="${YT_CHANNEL}" target="_blank" rel="noopener">Subscribe</a>
      <button type="button" class="btn ghost" data-upload="link">Add a video</button>
    </section>
    <main class="browse base">
      <aside class="side inv">
        <p>Library</p>
        ${FILTERS.map(
          (name) =>
            `<button type="button" data-filter="${name}" class="${state.filter === name ? "is-on" : ""}">${name}</button>`,
        ).join("")}
      </aside>
      <section>
        <h1>${state.query.trim() ? `Results for “${esc(state.query.trim())}”` : state.filter === "All" ? "Videos" : esc(state.filter)}</h1>
        ${
          clips.length === 0
            ? `<p class="empty">${
                state.filter === "Mine" ? "Nothing yet. Upload a video or paste a link to add one." : "No clips match that search."
              }</p>`
            : ""
        }
        <div class="yt-grid">
          ${clips
            .map(
              (clip) => `
            <article class="yt">
              <button class="card-hit" type="button" data-open="${esc(clip.id)}">
                ${thumb(clip)}
                <span class="yt-meta">
                  <span class="avatar">${esc(clip.channel.slice(0, 1))}</span>
                  <span>
                    <strong>${esc(clip.title)}</strong>
                    <em>${esc(clip.channel)}<br />${[
                      state.filter !== "News" && !isNewsClip(clip) ? clip.views : "",
                      clip.age,
                    ]
                      .filter(Boolean)
                      .map(esc)
                      .join(" · ")}</em>
                  </span>
                </span>
              </button>
              ${clipActions(clip)}
            </article>`,
            )
            .join("")}
        </div>
      </section>
    </main>`;
}

function player(clip) {
  if (clip.source === "upload") {
    return `<div class="player ${clip.vertical ? "tall" : ""}"><video src="${esc(clip.src)}" controls playsinline preload="metadata"></video></div>`;
  }
  if (clip.media) {
    return `<div class="player ${clip.vertical ? "tall" : ""}">${mediaHtml(clip.media, { title: clip.title })}</div>`;
  }
  return `
    <button class="stage ${state.playing ? "is-on" : ""}" type="button" data-play>
      ${thumb(clip, "stage")}
      <span class="play-label">${state.playing ? "Playing preview" : "Play preview"}</span>
    </button>
    <div class="scrub" aria-hidden="true"><span></span></div>`;
}

function watch(clip) {
  const next = allClips()
    .filter((item) => item.id !== clip.id)
    .slice(0, 12);
  return `
    <main class="watch base">
      <div>
        ${player(clip)}
        <h1>${esc(clip.title)}</h1>
        <div class="watch-row">
          <div>
            <strong>${esc(clip.channel)}</strong>
            <span>${[clip.views, clip.age, PLATFORMS[clip.platform]].filter(Boolean).map(esc).join(" · ")}</span>
          </div>
          <div class="row">
            ${clipActions(clip)}
            <button type="button" class="act" data-share="${esc(clip.id)}">⤴ Share</button>
            ${
              clip.media
                ? `<a class="act" href="${esc(clip.media.url)}" target="_blank" rel="noopener">Open on ${esc(PLATFORMS[clip.platform])}</a>`
                : ""
            }
            ${isMine(clip) ? `<button type="button" class="act danger" data-delete="${esc(clip.id)}">Delete</button>` : ""}
          </div>
        </div>
        ${clip.blurb ? `<p class="desc inv">${esc(clip.blurb)}</p>` : ""}
        ${clip.source === "upload" ? `<p class="note">Saved on this device only for now.</p>` : ""}
      </div>
      <aside class="upnext">
        <h2 class="label">Up next</h2>
        ${next
          .map(
            (item) => `
          <button type="button" data-open="${esc(item.id)}">
            ${thumb(item, "row")}
            <span><strong>${esc(item.title)}</strong><em>${meta(item)}</em></span>
          </button>`,
          )
          .join("")}
      </aside>
    </main>`;
}

/* ---------- shorts ---------- */

function shortPoster(clip) {
  if (clip.src) return `<video src="${esc(clip.src)}" muted loop playsinline preload="metadata" data-own></video>`;
  if (clip.thumb) return `<img src="${esc(clip.thumb)}" alt="" loading="lazy" /><span class="short-play">▶</span>`;
  return `<span class="short-placeholder"><b>${esc(clip.category)}</b><span class="short-play">▶</span></span>`;
}

function shortCard(clip, key) {
  const liked = !!state.likes[clip.id];
  const reposted = isReposted("clip", clip.id);
  const comments = (state.clipComments[clip.id] || []).length;
  const avatar =
    clip.source === "channel" ? `<img src="logo-small.jpg" alt="" />` : `<span>${esc(clip.channel.slice(0, 1))}</span>`;
  return `
    <section class="short" data-short="${esc(clip.id)}" data-key="${key}">
      <div class="short-frame">
        <div class="short-media">${shortPoster(clip)}</div>
        <div class="short-info">
          <strong>@${esc(handle(clip.channel))}</strong>
          <p>${esc(clip.title)}</p>
          <span class="pill">${esc(clip.source === "sample" ? clip.category : PLATFORMS[clip.platform])}</span>
        </div>
        <div class="rail">
          <button type="button" class="rail-avatar" data-open="${esc(clip.id)}" aria-label="Open ${esc(clip.channel)}">${avatar}</button>
          <button type="button" class="${liked ? "is-on" : ""}" data-like-clip="${esc(clip.id)}" aria-pressed="${liked}"><b>♥</b><span data-n>${fmtNum(likeCount(clip))}</span></button>
          <button type="button" data-comments-clip="${esc(clip.id)}"><b>✎</b><span data-c>${comments}</span></button>
          <button type="button" class="${reposted ? "is-on" : ""}" data-repost-clip="${esc(clip.id)}" aria-pressed="${reposted}"><b>↻</b><span data-n>${fmtNum(repostCount(clip))}</span></button>
          <button type="button" data-share="${esc(clip.id)}"><b>⤴</b><span>Share</span></button>
        </div>
      </div>
    </section>`;
}

function shortsLoop(loop) {
  return shortsItems()
    .map((clip, i) => shortCard(clip, `${loop}-${i}`))
    .join("");
}

function shorts() {
  let html = "";
  for (let loop = 0; loop < state.shortsLoops; loop++) html += shortsLoop(loop);
  return `<main class="shorts base" data-shorts tabindex="-1" aria-label="Shorts feed">${html}</main>`;
}

let shortsObserver;

function wireShorts() {
  shortsObserver?.disconnect();
  shortsObserver = null;
  const feed = app.querySelector("[data-shorts]");
  if (!feed) return;
  shortsObserver = new IntersectionObserver(
    (entries) => entries.forEach((e) => setShortLive(e.target, e.isIntersecting && e.intersectionRatio >= 0.6)),
    { root: feed, threshold: [0, 0.6, 1] },
  );
  feed.querySelectorAll(".short").forEach((el) => shortsObserver.observe(el));
  if (state.startShort) {
    const target = feed.querySelector(`[data-short="${CSS.escape(state.startShort)}"]`);
    state.startShort = null;
    if (target) feed.scrollTop = target.offsetTop;
  }
}

function setShortLive(el, on) {
  if (el.classList.contains("is-live") === on) return;
  el.classList.toggle("is-live", on);
  const clip = clipById(el.dataset.short);
  const slot = el.querySelector(".short-media");
  if (!clip || !slot) return;
  const own = slot.querySelector("video[data-own]");
  if (own) {
    if (on) own.play().catch(() => {});
    else own.pause();
  } else if (clip.media) {
    slot.innerHTML = on ? mediaHtml(clip.media, { autoplay: true, title: clip.title }) : shortPoster(clip);
  }
  if (on) maybeExtendShorts(el);
}

function maybeExtendShorts(el) {
  const feed = el.parentElement;
  const all = feed.querySelectorAll(".short");
  const index = Array.prototype.indexOf.call(all, el);
  if (index < all.length - 3 || state.shortsLoops >= 40) return;
  const before = all.length;
  feed.insertAdjacentHTML("beforeend", shortsLoop(state.shortsLoops));
  state.shortsLoops += 1;
  const added = feed.querySelectorAll(".short");
  for (let i = before; i < added.length; i++) shortsObserver?.observe(added[i]);
}

function stepShorts(dir) {
  const feed = app.querySelector("[data-shorts]");
  if (feed) feed.scrollBy({ top: dir * feed.clientHeight, behavior: "smooth" });
}

/* ---------- wall ---------- */

function miniCard(ref) {
  if (ref.type === "post") {
    const original = state.posts.find((p) => p.id === ref.id);
    return `<button type="button" class="mini-card quote" data-jump="${esc(ref.id)}">
        <span><strong>@${esc(handle(ref.author))}</strong><em>${esc(original ? original.text : ref.text)}</em></span>
      </button>`;
  }
  const clip = clipById(ref.id);
  const shown = clip || {
    title: ref.title,
    channel: ref.channel,
    thumb: (ref.thumb || "").startsWith("https://") ? ref.thumb : "",
    category: ref.platformName || "Clip",
    platform: "sample",
    source: "sample",
    length: ref.length || "",
  };
  return `<button type="button" class="mini-card" data-open="${esc(ref.id)}">
      ${thumb(shown, "mini")}
      <span><strong>${esc(shown.title)}</strong><em>@${esc(handle(shown.channel))}${clip ? "" : " · no longer available"}</em></span>
    </button>`;
}

function postHtml(post) {
  const reposted = isReposted("post", post.id);
  const count = (post.reposts || 0) + (reposted ? 1 : 0);
  const origin = post.repostOf;
  let head = "";
  if (post.kind === "repost") {
    const who = origin.type === "post" ? origin.author : origin.channel;
    head = `<p class="repost-head">↻ You reposted @${esc(handle(who))}</p>`;
  } else if (post.kind === "upload") {
    head = `<p class="repost-head">▲ You shared a clip</p>`;
  }
  return `
    <article class="post inv" id="post-${esc(post.id)}">
      ${head}
      <header>
        <span class="avatar">${esc(post.author.slice(0, 1))}</span>
        <span><strong>${esc(post.author)}</strong><em>${esc(ago(post.time))}</em></span>
      </header>
      ${post.text ? `<p>${esc(post.text)}</p>` : ""}
      ${origin ? miniCard(origin) : ""}
      <footer>
        <button type="button" data-like="${esc(post.id)}" class="${post.liked ? "is-on" : ""}">♥ Like · ${post.likes}</button>
        <button type="button" data-comment="${esc(post.id)}">✎ Comment · ${post.comments.length}</button>
        ${
          post.kind === "repost"
            ? `<button type="button" data-undo-repost="${esc(post.id)}">↻ Undo repost</button>`
            : `<button type="button" data-repost-post="${esc(post.id)}" class="${reposted ? "is-on" : ""}">↻ Repost · ${count}</button>`
        }
      </footer>
      ${
        post.comments.length
          ? `<ul class="comments">${post.comments
              .map((c) => `<li><strong>${esc(c.author)}</strong> ${esc(c.text)}</li>`)
              .join("")}</ul>`
          : ""
      }
      ${
        state.commentFor === post.id
          ? `<form class="commentbox" data-add-comment="${esc(post.id)}">
              <input name="comment" placeholder="Write a comment…" aria-label="Comment" maxlength="500" />
              <button type="submit" class="btn">Post</button>
            </form>`
          : ""
      }
    </article>`;
}

function wall() {
  return `
    <main class="wall base">
      <div class="wall-head inv"><img src="logo-small.jpg" alt="" width="44" height="44" /><strong>channelbaul</strong><span>Wall</span></div>
      <div class="cols">
        <aside class="profile inv">
          <img class="pic" src="logo.jpg" alt="Channel Baul logo" />
          <h1>Channelbaul</h1>
          <p class="byline">channelbaul.com — clips, statuses, and whoever is around tonight.</p>
          <dl>
            <div><dt>Network</dt><dd>channelbaul.com</dd></div>
            <div><dt>Posts</dt><dd>${state.posts.length}</dd></div>
            <div><dt>Reposts</dt><dd>${state.posts.filter((p) => p.kind === "repost").length}</dd></div>
          </dl>
          <a class="btn" href="${YT_CHANNEL}" target="_blank" rel="noopener">YouTube channel</a>
          <h2>Friends</h2>
          <ul>
            ${FRIENDS.map((name) => `<li><span>${esc(name.slice(0, 1))}</span>${esc(name)}</li>`).join("")}
          </ul>
        </aside>
        <section>
          <form class="publisher" data-post>
            <label for="status">What’s on your mind?</label>
            <textarea id="status" name="status" rows="3" maxlength="1000" placeholder="Write something…"></textarea>
            <div><span>Saved on this device</span><span class="row"><button type="button" class="btn ghost" data-upload="link">+ Video link</button><button type="submit" class="btn">Share</button></span></div>
          </form>
          ${state.posts.map(postHtml).join("")}
        </section>
        <aside class="online">
          <h2>Online now</h2>
          <ul>
            ${FRIENDS.slice(0, 5)
              .map((name) => `<li><i class="dot"></i>${esc(name)}</li>`)
              .join("")}
          </ul>
        </aside>
      </div>
    </main>`;
}

/* ---------- overlays ---------- */

function renderOverlay() {
  const o = state.overlay;
  if (!o) {
    overlayRoot.innerHTML = "";
    document.body.classList.remove("has-overlay");
    return;
  }
  document.body.classList.add("has-overlay");
  let inner = "";
  if (o.type === "repost") inner = repostSheet(o.target);
  if (o.type === "upload") inner = uploadPanel(o.tab);
  if (o.type === "comments") inner = commentsSheet(o.clipId);
  overlayRoot.innerHTML = `<div class="overlay" data-backdrop>${inner}</div>`;
  const focus = overlayRoot.querySelector("[data-autofocus]");
  if (focus) focus.focus();
}

function repostSheet(target) {
  const preview =
    target.type === "clip"
      ? miniCard({ type: "clip", id: target.id })
      : miniCard({ type: "post", id: target.id, ...(state.posts.find((p) => p.id === target.id) || {}) });
  return `
    <form class="sheet base" data-repost-confirm role="dialog" aria-modal="true" aria-label="Repost">
      <header><h2>↻ Repost to your Wall</h2><button type="button" class="x" data-close aria-label="Close">✕</button></header>
      ${preview}
      <input name="caption" maxlength="300" placeholder="Add a caption (optional)" aria-label="Caption" data-autofocus />
      <div class="row end"><button type="button" class="btn ghost" data-close>Cancel</button><button type="submit" class="btn">Repost</button></div>
    </form>`;
}

function commentsSheet(clipId) {
  const clip = clipById(clipId);
  const list = state.clipComments[clipId] || [];
  return `
    <form class="sheet base" data-clip-comment="${esc(clipId)}" role="dialog" aria-modal="true" aria-label="Comments">
      <header><h2>Comments · ${list.length}</h2><button type="button" class="x" data-close aria-label="Close">✕</button></header>
      <p class="muted">${esc(clip ? clip.title : "")}</p>
      <ul class="comments">${
        list.length
          ? list.map((c) => `<li><strong>${esc(c.author)}</strong> ${esc(c.text)}</li>`).join("")
          : `<li class="muted">No comments yet.</li>`
      }</ul>
      <div class="row"><input name="comment" maxlength="500" placeholder="Write a comment…" aria-label="Comment" data-autofocus /><button type="submit" class="btn">Post</button></div>
    </form>`;
}

function uploadPanel(tab) {
  return `
    <section class="panel base" role="dialog" aria-modal="true" aria-label="Upload">
      <header><h2>Upload</h2><button type="button" class="x" data-close aria-label="Close">✕</button></header>
      <div class="tabs" role="tablist">
        <button type="button" role="tab" data-tab="device" class="${tab === "device" ? "is-on" : ""}" aria-selected="${tab === "device"}">From your device</button>
        <button type="button" role="tab" data-tab="link" class="${tab === "link" ? "is-on" : ""}" aria-selected="${tab === "link"}">From a link</button>
      </div>
      ${tab === "device" ? deviceForm() : linkForm()}
    </section>`;
}

function deviceForm() {
  const d = state.deviceDraft || {};
  const big = d.file && d.file.size > MAX_UPLOAD;
  return `
    <form class="upload-form" data-upload-device>
      <label class="drop ${d.file ? "has-file" : ""}" data-drop>
        <input type="file" name="file" accept="video/*" data-file />
        ${
          d.file
            ? `<video src="${esc(d.url)}" controls playsinline preload="metadata"></video>
               <span>${esc(d.file.name)} · ${fmtSize(d.file.size)} — tap to pick another</span>`
            : `<strong>Drop a video here</strong><span>or tap to choose one from your phone or computer</span>`
        }
      </label>
      ${big ? `<p class="warn">That file is over 200 MB. It may fail to save or slow this browser down.</p>` : ""}
      <label>Title<input name="title" maxlength="140" value="${esc(d.title || "")}" data-draft="title" placeholder="What happened?" /></label>
      <label>Caption<textarea name="caption" rows="2" maxlength="500" data-draft="caption" placeholder="Optional">${esc(d.caption || "")}</textarea></label>
      <label class="check"><input type="checkbox" name="wall" ${d.toWall === false ? "" : "checked"} data-draft="toWall" /> Also post it to my Wall</label>
      <p class="note">Saved on this device only for now. Other people can’t see device uploads yet.</p>
      <div class="row end"><button type="submit" class="btn" ${d.file ? "" : "disabled"}>Save upload</button></div>
    </form>`;
}

function linkForm() {
  const d = state.linkDraft || {};
  return `
    <form class="upload-form" data-add-link>
      <label>Video link<input name="url" type="url" inputmode="url" value="${esc(d.url || "")}" data-link-url placeholder="https://youtu.be/… or a TikTok, Instagram, X, Vimeo link" data-autofocus /></label>
      <div class="link-preview" data-link-preview>${linkPreview()}</div>
      <label>Title<input name="title" maxlength="140" value="${esc(d.title || "")}" data-draft-link="title" placeholder="Filled in automatically when possible" /></label>
      <label>Caption<textarea name="caption" rows="2" maxlength="500" data-draft-link="caption" placeholder="Optional">${esc(d.caption || "")}</textarea></label>
      <label class="check"><input type="checkbox" name="wall" ${d.toWall === false ? "" : "checked"} data-draft-link="toWall" /> Also post it to my Wall</label>
      <p class="note">Works with YouTube, Shorts, Vimeo, TikTok, Instagram, X, Twitch, Streamable, Dailymotion, Facebook and .mp4/.webm links. The video plays from its own site; the link is saved on this device.</p>
      <div class="row end"><button type="submit" class="btn">Add video</button></div>
    </form>`;
}

function linkPreview() {
  const d = state.linkDraft;
  if (!d || !d.url) return `<p class="muted">Paste a link to preview it.</p>`;
  if (!d.media) return `<p class="warn">That link isn’t supported yet. Try a YouTube, Vimeo, TikTok, Instagram, X, Twitch, Streamable, Dailymotion or Facebook video link.</p>`;
  return `
    <span class="pill">${esc(PLATFORMS[d.media.platform])}${d.media.vertical ? " · Short" : ""}</span>
    ${d.loading ? `<span class="muted">Looking up title…</span>` : d.title ? `<strong>${esc(d.title)}</strong>` : ""}
    <div class="player ${d.media.vertical ? "tall" : ""}">${mediaHtml(d.media, { title: "Preview" })}</div>`;
}

let toastTimer;
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2600);
}

/* ---------- actions ---------- */

function go(section) {
  state.section = section;
  state.activeId = null;
  state.playing = false;
  render();
  app.scrollTop = 0;
}

function openClip(id) {
  const clip = clipById(id);
  if (!clip) return toast("That clip isn’t available anymore.");
  if (clip.article && clip.href) {
    window.open(clip.href, "_blank", "noopener");
    return;
  }
  state.section = "videos";
  state.activeId = id;
  state.playing = false;
  render();
  app.scrollTop = 0;
}

function syncClipButtons(id) {
  const clip = clipById(id);
  if (!clip) return;
  const sel = CSS.escape(id);
  const liked = !!state.likes[id];
  const reposted = isReposted("clip", id);
  document.querySelectorAll(`[data-like-clip="${sel}"]`).forEach((b) => {
    b.classList.toggle("is-on", liked);
    b.setAttribute("aria-pressed", String(liked));
    b.querySelector("[data-n]").textContent = fmtNum(likeCount(clip));
  });
  document.querySelectorAll(`[data-repost-clip="${sel}"]`).forEach((b) => {
    b.classList.toggle("is-on", reposted);
    b.setAttribute("aria-pressed", String(reposted));
    b.querySelector("[data-n]").textContent = fmtNum(repostCount(clip));
  });
  document.querySelectorAll(`[data-comments-clip="${sel}"] [data-c]`).forEach((s) => {
    s.textContent = (state.clipComments[id] || []).length;
  });
}

function refreshAfterPostsChange(clipId) {
  persist();
  if (state.section === "wall") render();
  else if (clipId) syncClipButtons(clipId);
}

function addRepost(target, caption = "") {
  let repostOf;
  if (target.type === "clip") {
    const clip = clipById(target.id);
    if (!clip) return;
    repostOf = {
      type: "clip",
      id: clip.id,
      title: clip.title,
      channel: clip.channel,
      thumb: clip.thumb || "",
      platformName: clip.source === "sample" ? clip.category : PLATFORMS[clip.platform],
      length: clip.length || "",
    };
  } else {
    const post = state.posts.find((p) => p.id === target.id);
    if (!post) return;
    repostOf = { type: "post", id: post.id, author: post.author, text: post.text };
  }
  state.posts.unshift({
    id: uid("rp"),
    kind: "repost",
    author: "You",
    time: Date.now(),
    text: caption.trim(),
    likes: 0,
    liked: false,
    reposts: 0,
    comments: [],
    repostOf,
  });
}

function removeRepost(type, id) {
  state.posts = state.posts.filter((p) => !(p.kind === "repost" && p.repostOf?.type === type && p.repostOf.id === id));
}

function toggleRepost(type, id) {
  if (isReposted(type, id)) {
    removeRepost(type, id);
    refreshAfterPostsChange(type === "clip" ? id : null);
    toast("Repost removed");
  } else {
    state.overlay = { type: "repost", target: { type, id } };
    renderOverlay();
  }
}

async function copyLink(id) {
  const url = `${location.origin === "null" ? "https://channelbaul.com" : location.origin}${location.pathname}#v=${encodeURIComponent(id)}`;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.append(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  toast("Link copied");
}

async function deleteClip(id) {
  const clip = clipById(id);
  if (!clip || !isMine(clip)) return;
  if (!confirm(`Delete “${clip.title}” from this device?`)) return;
  if (clip.source === "upload") {
    try {
      await uploadsDb.remove(id);
    } catch {
      /* already gone */
    }
    URL.revokeObjectURL(clip.src);
    state.uploads = state.uploads.filter((u) => u.id !== id);
  } else {
    state.links = state.links.filter((l) => l.id !== id);
  }
  delete state.likes[id];
  persist();
  state.activeId = null;
  render();
  toast("Deleted");
}

function openUpload(tab) {
  state.overlay = { type: "upload", tab };
  renderOverlay();
}

function closeOverlay() {
  if (state.overlay?.type === "upload" && state.deviceDraft?.url && !state.deviceDraft.saved) {
    URL.revokeObjectURL(state.deviceDraft.url);
    state.deviceDraft = null;
  }
  state.overlay = null;
  renderOverlay();
}

function pickFile(file) {
  if (!file) return;
  if (!file.type.startsWith("video/")) return toast("Pick a video file");
  if (state.deviceDraft?.url) URL.revokeObjectURL(state.deviceDraft.url);
  const prev = state.deviceDraft || {};
  state.deviceDraft = {
    ...prev,
    file,
    url: URL.createObjectURL(file),
    title: prev.title || file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
  };
  renderOverlay();
}

function videoMeta(url) {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const done = (m) => {
      clearTimeout(timer);
      resolve(m);
    };
    const timer = setTimeout(() => done({ w: 0, h: 0, duration: 0 }), 8000);
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => done({ w: v.videoWidth, h: v.videoHeight, duration: v.duration });
    v.onerror = () => done({ w: 0, h: 0, duration: 0 });
    v.src = url;
  });
}

async function saveDeviceUpload() {
  const d = state.deviceDraft;
  if (!d?.file) return toast("Pick a video first");
  const info = await videoMeta(d.url);
  const record = {
    id: uid("up"),
    title: (d.title || "My upload").trim().slice(0, 140),
    caption: (d.caption || "").trim().slice(0, 500),
    blob: d.file,
    type: d.file.type,
    size: d.file.size,
    vertical: info.h > info.w && info.w > 0,
    duration: info.duration,
    addedAt: Date.now(),
  };
  let saved = true;
  try {
    await uploadsDb.put(record);
  } catch {
    saved = false;
  }
  d.saved = true;
  state.uploads.unshift(uploadClip(record, d.url));
  if (d.toWall !== false) addSharePost(record.id, record.caption);
  state.deviceDraft = null;
  state.overlay = null;
  state.filter = "All";
  persist();
  renderOverlay();
  openClip(record.id);
  toast(saved ? "Saved on this device" : "Couldn’t save to this browser — it will disappear on refresh");
}

function addSharePost(clipId, text) {
  const clip = clipById(clipId);
  if (!clip) return;
  state.posts.unshift({
    id: uid("sp"),
    kind: "upload",
    author: "You",
    time: Date.now(),
    text: text || "",
    likes: 0,
    liked: false,
    reposts: 0,
    comments: [],
    repostOf: {
      type: "clip",
      id: clip.id,
      title: clip.title,
      channel: clip.channel,
      thumb: clip.thumb || "",
      platformName: PLATFORMS[clip.platform],
      length: clip.length || "",
    },
  });
}

let metaTimer;
function onLinkInput(value) {
  const media = parseVideoUrl(value);
  const prev = state.linkDraft || {};
  const sameMedia = prev.media && media && prev.media.platform === media.platform && prev.media.id === media.id;
  state.linkDraft = {
    ...prev,
    url: value,
    media,
    title: sameMedia ? prev.title : prev.titleTouched ? prev.title : "",
    author: sameMedia ? prev.author : "",
    thumb: sameMedia ? prev.thumb : "",
    loading: !!media && !sameMedia,
  };
  updateLinkPreview();
  clearTimeout(metaTimer);
  if (!media || sameMedia) return;
  metaTimer = setTimeout(async () => {
    const info = await fetchVideoMeta(media);
    const d = state.linkDraft;
    if (!d || d.media !== media) return;
    d.loading = false;
    if (info) {
      if (!d.titleTouched) d.title = info.title;
      d.author = info.author;
      d.thumb = info.thumb;
      const titleInput = overlayRoot.querySelector('[data-draft-link="title"]');
      if (titleInput && !d.titleTouched) titleInput.value = d.title;
    }
    updateLinkPreview();
  }, 350);
}

function updateLinkPreview() {
  const box = overlayRoot.querySelector("[data-link-preview]");
  if (box) box.innerHTML = linkPreview();
}

function saveLink() {
  const d = state.linkDraft;
  if (!d?.media) return toast("Paste a supported video link first");
  const link = {
    id: uid("ln"),
    url: d.media.url,
    title: (d.title || "").trim().slice(0, 140),
    author: (d.author || "").slice(0, 80),
    thumb: d.thumb || "",
    caption: (d.caption || "").trim().slice(0, 500),
    addedAt: Date.now(),
  };
  state.links.unshift(link);
  if (d.toWall !== false) addSharePost(link.id, link.caption);
  state.linkDraft = null;
  state.overlay = null;
  persist();
  renderOverlay();
  openClip(link.id);
  toast(d.media.vertical ? "Added — it’s in Shorts too" : "Video added");
}

/* ---------- events ---------- */

document.addEventListener("click", (event) => {
  const t = event.target.closest(
    "[data-backdrop],[data-close],[data-go],[data-open],[data-filter],[data-chip],[data-play],[data-like],[data-comment],[data-like-clip],[data-repost-clip],[data-repost-post],[data-undo-repost],[data-share],[data-delete],[data-invert],[data-upload],[data-tab],[data-jump],[data-comments-clip]",
  );
  if (!t) return;
  const d = t.dataset;
  if (d.backdrop !== undefined) {
    if (event.target === t) closeOverlay();
    return;
  }
  if (d.close !== undefined) return closeOverlay();
  if (d.go) {
    if (d.start) state.startShort = d.start;
    if (d.go === "shorts") state.shortsLoops = 1;
    return go(d.go);
  }
  if (d.open) return openClip(d.open);
  if (d.filter) {
    state.filter = d.filter;
    return render();
  }
  if (d.chip) {
    state.filter = d.chip;
    state.query = "";
    return go("videos");
  }
  if (d.play !== undefined) {
    state.playing = !state.playing;
    return render();
  }
  if (d.likeClip) {
    if (state.likes[d.likeClip]) delete state.likes[d.likeClip];
    else state.likes[d.likeClip] = true;
    persist();
    return syncClipButtons(d.likeClip);
  }
  if (d.repostClip) return toggleRepost("clip", d.repostClip);
  if (d.repostPost) return toggleRepost("post", d.repostPost);
  if (d.undoRepost) {
    const post = state.posts.find((p) => p.id === d.undoRepost);
    state.posts = state.posts.filter((p) => p.id !== d.undoRepost);
    refreshAfterPostsChange(post?.repostOf?.type === "clip" ? post.repostOf.id : null);
    return toast("Repost removed");
  }
  if (d.share) return copyLink(d.share);
  if (d.delete) return deleteClip(d.delete);
  if (d.invert !== undefined) {
    state.invert = !state.invert;
    store.set("cb.invert", state.invert);
    return applyTone();
  }
  if (d.upload) return openUpload(d.upload);
  if (d.tab) {
    state.overlay = { type: "upload", tab: d.tab };
    return renderOverlay();
  }
  if (d.commentsClip) {
    state.overlay = { type: "comments", clipId: d.commentsClip };
    return renderOverlay();
  }
  if (d.jump) {
    const el = document.getElementById(`post-${d.jump}`);
    if (!el) return toast("That post isn’t here anymore.");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
    return;
  }
  if (d.like) {
    state.posts = state.posts.map((post) =>
      post.id === d.like ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) } : post,
    );
    persist();
    return render();
  }
  if (d.comment) {
    state.commentFor = state.commentFor === d.comment ? null : d.comment;
    render();
    app.querySelector(".commentbox input")?.focus();
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  event.preventDefault();
  if (form.matches("[data-search]")) {
    state.query = new FormData(form).get("q").toString();
    state.filter = "All";
    return go("videos");
  }
  if (form.matches("[data-post]")) {
    const text = new FormData(form).get("status").toString().trim();
    if (!text) return;
    state.posts.unshift({
      id: uid("p"),
      kind: "status",
      author: "You",
      time: Date.now(),
      text,
      likes: 0,
      liked: false,
      reposts: 0,
      comments: [],
    });
    persist();
    return render();
  }
  if (form.dataset.addComment) {
    const text = new FormData(form).get("comment").toString().trim();
    if (!text) return;
    state.posts = state.posts.map((post) =>
      post.id === form.dataset.addComment
        ? { ...post, comments: [...post.comments, { id: uid("c"), author: "You", text }] }
        : post,
    );
    state.commentFor = null;
    persist();
    return render();
  }
  if (form.dataset.clipComment) {
    const id = form.dataset.clipComment;
    const text = new FormData(form).get("comment").toString().trim();
    if (!text) return;
    state.clipComments[id] = [...(state.clipComments[id] || []), { id: uid("c"), author: "You", text }];
    persist();
    renderOverlay();
    return syncClipButtons(id);
  }
  if (form.matches("[data-repost-confirm]")) {
    const target = state.overlay?.target;
    if (!target) return closeOverlay();
    addRepost(target, new FormData(form).get("caption").toString());
    state.overlay = null;
    renderOverlay();
    refreshAfterPostsChange(target.type === "clip" ? target.id : null);
    return toast("Reposted to your Wall");
  }
  if (form.matches("[data-upload-device]")) return saveDeviceUpload();
  if (form.matches("[data-add-link]")) return saveLink();
});

document.addEventListener("input", (event) => {
  const el = event.target;
  if (el.matches("[data-link-url]")) return onLinkInput(el.value);
  if (el.dataset.draft) {
    state.deviceDraft ||= {};
    state.deviceDraft[el.dataset.draft] = el.type === "checkbox" ? el.checked : el.value;
  }
  if (el.dataset.draftLink) {
    state.linkDraft ||= {};
    state.linkDraft[el.dataset.draftLink] = el.type === "checkbox" ? el.checked : el.value;
    if (el.dataset.draftLink === "title") state.linkDraft.titleTouched = true;
  }
});

document.addEventListener("change", (event) => {
  const el = event.target;
  if (el.matches("[data-file]")) pickFile(el.files?.[0]);
  else if (el.type === "checkbox" && (el.dataset.draft || el.dataset.draftLink)) {
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
});

document.addEventListener("dragover", (event) => {
  const drop = event.target.closest?.("[data-drop]");
  if (!drop) return;
  event.preventDefault();
  drop.classList.add("is-over");
});

document.addEventListener("dragleave", (event) => {
  event.target.closest?.("[data-drop]")?.classList.remove("is-over");
});

document.addEventListener("drop", (event) => {
  const drop = event.target.closest?.("[data-drop]");
  if (!drop) return;
  event.preventDefault();
  pickFile(event.dataTransfer?.files?.[0]);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.overlay) return closeOverlay();
  if (state.section !== "shorts" || state.overlay) return;
  if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
  if (["ArrowDown", "j", "J", "PageDown"].includes(event.key)) {
    event.preventDefault();
    stepShorts(1);
  } else if (["ArrowUp", "k", "K", "PageUp"].includes(event.key)) {
    event.preventDefault();
    stepShorts(-1);
  }
});

window.addEventListener("resize", measureBar);

/* ---------- boot ---------- */

function readHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (h.startsWith("v=")) {
    state.section = "videos";
    state.activeId = h.slice(2);
  } else if (SECTIONS.includes(h)) {
    state.section = h;
  }
}

async function loadChannel() {
  state.channel = [];
  state.feedMeta = null;
  try {
    const feedRes = await fetch("feed.json", { cache: "no-cache" });
    if (feedRes.ok) {
      const data = await feedRes.json();
      const items = Array.isArray(data.items) ? data.items : [];
      state.channel = sortedHomeClips(items.map(feedClip).filter(Boolean));
      if (data.generated) {
        const t = Date.parse(data.generated);
        state.feedMeta = Number.isFinite(t) ? ago(t) : "";
      }
      if (state.channel.length) return;
    }
  } catch {
    /* fall through to videos.json */
  }
  try {
    const res = await fetch("videos.json", { cache: "no-cache" });
    if (!res.ok) return;
    const data = await res.json();
    state.channel = (Array.isArray(data.videos) ? data.videos : []).map(channelClip).filter(Boolean);
  } catch {
    state.channel = [];
  }
}

async function loadUploads() {
  try {
    const records = await uploadsDb.all();
    state.uploads = records
      .sort((a, b) => b.addedAt - a.addedAt)
      .map((rec) => uploadClip(rec, URL.createObjectURL(rec.blob)));
  } catch {
    state.uploads = [];
  }
}

window.addEventListener("hashchange", () => {
  readHash();
  render();
});

readHash();
render();
const ready = Promise.all([loadChannel(), loadUploads()]).then(() => {
  const feed = app.querySelector("[data-shorts]");
  const top = feed ? feed.scrollTop : 0;
  render();
  const again = app.querySelector("[data-shorts]");
  if (again) again.scrollTop = top;
});
