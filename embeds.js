const PLATFORMS = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  tiktok: "TikTok",
  instagram: "Instagram",
  x: "X",
  twitch: "Twitch",
  streamable: "Streamable",
  dailymotion: "Dailymotion",
  facebook: "Facebook",
  file: "Video file",
  upload: "Upload",
  sample: "Channelbaul",
  article: "Article",
};

const EMBED_PARENT = location.hostname || "channelbaul.com";

function hostIs(host, ...domains) {
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

/* Turns a pasted URL into a known platform + validated id. Returns null for anything else. */
function parseVideoUrl(raw) {
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  const href = url.href;
  let m;

  if (hostIs(host, "youtube.com", "youtube-nocookie.com")) {
    const v = url.searchParams.get("v") || "";
    if (/^\/watch\/?$/.test(path) && /^[\w-]{11}$/.test(v)) return yt(v, false);
    if ((m = path.match(/^\/(shorts|embed|live)\/([\w-]{11})(?:[/?]|$)/))) return yt(m[2], m[1] === "shorts");
    return null;
  }
  if (host === "youtu.be" && (m = path.match(/^\/([\w-]{11})(?:[/?]|$)/))) return yt(m[1], false);

  if (hostIs(host, "vimeo.com") && (m = path.match(/\/(\d{5,})\/?$/))) {
    return { platform: "vimeo", id: m[1], vertical: false, url: `https://vimeo.com/${m[1]}` };
  }
  if (hostIs(host, "tiktok.com") && (m = path.match(/\/(?:video|embed\/v2|embed)\/(\d{8,})/))) {
    return { platform: "tiktok", id: m[1], vertical: true, url: href };
  }
  if (hostIs(host, "instagram.com") && (m = path.match(/^\/(?:[\w.]+\/)?(p|reels?|tv)\/([\w-]{5,})/))) {
    const reel = m[1].startsWith("reel");
    return {
      platform: "instagram",
      id: m[2],
      kind: reel ? "reel" : "p",
      vertical: reel,
      url: `https://www.instagram.com/${reel ? "reel" : "p"}/${m[2]}/`,
    };
  }
  if (hostIs(host, "twitter.com", "x.com") && (m = path.match(/^\/\w+\/status\/(\d+)/))) {
    return { platform: "x", id: m[1], vertical: false, url: href };
  }
  if (host === "clips.twitch.tv" && (m = path.match(/^\/([\w-]+)\/?$/)) && m[1] !== "embed") {
    return { platform: "twitch", kind: "clip", id: m[1], vertical: false, url: href };
  }
  if (hostIs(host, "twitch.tv")) {
    if ((m = path.match(/^\/\w+\/clip\/([\w-]+)/))) return { platform: "twitch", kind: "clip", id: m[1], vertical: false, url: href };
    if ((m = path.match(/^\/videos\/(\d+)/))) return { platform: "twitch", kind: "video", id: m[1], vertical: false, url: href };
    return null;
  }
  if (hostIs(host, "streamable.com") && (m = path.match(/^\/(?:e\/|o\/)?([a-z0-9]{4,})\/?$/i))) {
    return { platform: "streamable", id: m[1], vertical: false, url: `https://streamable.com/${m[1]}` };
  }
  if (hostIs(host, "dailymotion.com") && (m = path.match(/\/video\/([a-z0-9]+)/i))) {
    return { platform: "dailymotion", id: m[1], vertical: false, url: `https://www.dailymotion.com/video/${m[1]}` };
  }
  if (host === "dai.ly" && (m = path.match(/^\/([a-z0-9]+)/i))) {
    return { platform: "dailymotion", id: m[1], vertical: false, url: `https://www.dailymotion.com/video/${m[1]}` };
  }
  if (hostIs(host, "facebook.com", "fb.watch")) {
    const isVideo = host.endsWith("fb.watch") || /\/videos\/|\/watch|\/reel\//.test(path);
    if (!isVideo) return null;
    return { platform: "facebook", id: href, vertical: /\/reel\//.test(path), url: href };
  }
  if (/\.(mp4|webm|ogv|ogg|mov|m4v)$/i.test(path)) {
    return { platform: "file", id: href, vertical: false, url: href };
  }
  return null;
}

function yt(id, short) {
  return {
    platform: "youtube",
    id,
    vertical: short,
    url: short ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
  };
}

function embedSrc(media, autoplay) {
  const id = encodeURIComponent(media.id);
  const a = autoplay ? 1 : 0;
  switch (media.platform) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&modestbranding=1${
        autoplay ? `&autoplay=1&mute=1&loop=1&playlist=${id}` : ""
      }`;
    case "vimeo":
      return `https://player.vimeo.com/video/${id}${autoplay ? "?autoplay=1&muted=1&loop=1" : ""}`;
    case "tiktok":
      return `https://www.tiktok.com/embed/v2/${id}`;
    case "instagram":
      return `https://www.instagram.com/${media.kind === "reel" ? "reel" : "p"}/${id}/embed/`;
    case "x":
      return `https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=dark`;
    case "twitch":
      return media.kind === "clip"
        ? `https://clips.twitch.tv/embed?clip=${id}&parent=${EMBED_PARENT}&autoplay=${!!a}&muted=${!!a}`
        : `https://player.twitch.tv/?video=${id}&parent=${EMBED_PARENT}&autoplay=${!!a}&muted=${!!a}`;
    case "streamable":
      return `https://streamable.com/e/${id}${autoplay ? "?autoplay=1&muted=1&loop=1" : ""}`;
    case "dailymotion":
      return `https://www.dailymotion.com/embed/video/${id}${autoplay ? "?autoplay=1&mute=1" : ""}`;
    case "facebook":
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(media.url)}&show_text=false${
        autoplay ? "&autoplay=1&mute=1" : ""
      }`;
    default:
      return "";
  }
}

function mediaHtml(media, { autoplay = false, title = "Video" } = {}) {
  if (media.platform === "article") {
    return `<p class="note"><a href="${escapeHtml(media.url)}" target="_blank" rel="noopener">Open article</a></p>`;
  }
  if (media.platform === "file") {
    return `<video src="${escapeHtml(media.url)}" playsinline preload="metadata" ${
      autoplay ? "autoplay muted loop" : "controls"
    }></video>`;
  }
  const src = embedSrc(media, autoplay);
  if (!src) return "";
  return `<iframe src="${escapeHtml(src)}" title="${escapeHtml(title)}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

function thumbFor(media) {
  if (media.platform === "youtube") return `https://i.ytimg.com/vi/${media.id}/hqdefault.jpg`;
  if (media.platform === "dailymotion") return `https://www.dailymotion.com/thumbnail/video/${media.id}`;
  return "";
}

function oembedEndpoints(media) {
  const u = encodeURIComponent(media.url);
  const own = {
    youtube: `https://www.youtube.com/oembed?format=json&url=${u}`,
    vimeo: `https://vimeo.com/api/oembed.json?url=${u}`,
    tiktok: `https://www.tiktok.com/oembed?url=${u}`,
    dailymotion: `https://www.dailymotion.com/services/oembed?format=json&url=${u}`,
    streamable: `https://api.streamable.com/oembed.json?url=${u}`,
  }[media.platform];
  const list = own ? [own] : [];
  if (media.platform !== "file") list.push(`https://noembed.com/embed?url=${u}`);
  return list;
}

async function fetchVideoMeta(media) {
  for (const endpoint of oembedEndpoints(media)) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch(endpoint, { signal: ctrl.signal });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.error || !data.title) continue;
      const thumb = typeof data.thumbnail_url === "string" && data.thumbnail_url.startsWith("https://") ? data.thumbnail_url : "";
      return { title: String(data.title).slice(0, 200), author: String(data.author_name || "").slice(0, 80), thumb };
    } catch {
      /* try the next endpoint */
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
