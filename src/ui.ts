import { hashSeed, inRoundRect, mulberry32, sampleShape, strokeMarkup, type Stroke } from "./visual/strokes.js";

const TRACK_SLUG: Record<string, string> = {
  "Developer tools": "developer-tools",
  "Data and analytics": "data",
  Accessibility: "accessibility",
  Security: "security",
  Climate: "climate",
  Health: "health",
  Education: "education",
  "Open hardware": "hardware",
};

const GLYPH_W = 160;
const GLYPH_H = 108;

function slab(x: number, y: number, left: number, top: number, width: number, height: number): boolean {
  return x >= left && x <= left + width && y >= top && y <= top + height;
}

function codeWindow(x: number, y: number): boolean {
  return inRoundRect(x, y, 16, 16, 128, 76, 10);
}

function markMask(track: string, x: number, y: number): boolean {
  if (track === "Data and analytics") {
    const bottom = 78;
    return slab(x, y, 58, bottom - 22, 10, 22) || slab(x, y, 74, bottom - 36, 10, 36) || slab(x, y, 90, bottom - 14, 10, 14);
  }
  if (track === "Accessibility") {
    const dx = x - 80;
    const dy = y - 54;
    const d = dx * dx + dy * dy;
    return d <= 16 * 16 && d >= 8 * 8;
  }
  if (track === "Security") {
    const dx = x - 80;
    const dy = y - 46;
    return dx * dx + dy * dy <= 81 || slab(x, y, 76, 52, 8, 22);
  }
  if (track === "Climate") {
    const t = (y - 34) / 44;
    if (t < 0 || t > 1) return false;
    const half = 18 * (t < 0.55 ? t / 0.55 : (1 - t) / 0.45);
    return Math.abs(x - 80) <= half;
  }
  if (track === "Health") {
    return (Math.abs(y - 54) <= 3.2 && Math.abs(x - 80) <= 16) || (Math.abs(x - 80) <= 3.2 && Math.abs(y - 54) <= 16);
  }
  if (track === "Education") {
    return inRoundRect(x, y, 52, 38, 24, 36, 3) || inRoundRect(x, y, 84, 38, 24, 36, 3);
  }
  if (track === "Open hardware") {
    return (
      inRoundRect(x, y, 66, 42, 28, 26, 3) ||
      slab(x, y, 56, 48, 10, 3) ||
      slab(x, y, 56, 56, 10, 3) ||
      slab(x, y, 56, 64, 10, 3) ||
      slab(x, y, 94, 48, 10, 3) ||
      slab(x, y, 94, 56, 10, 3) ||
      slab(x, y, 94, 64, 10, 3)
    );
  }
  return slab(x, y, 36, 38, 52, 3) || slab(x, y, 36, 48, 34, 3) || slab(x, y, 36, 58, 44, 3);
}

const coverCache = new Map<string, string>();

export function trackArt(track: string): string {
  const cached = coverCache.get(track);
  if (cached) return cached;
  const rand = mulberry32(hashSeed(track || "Developer tools"));
  const base = sampleShape({
    width: GLYPH_W,
    height: GLYPH_H,
    step: 4,
    mask: (x, y) => codeWindow(x, y) && !markMask(track, x, y),
  });
  const accent = sampleShape({
    width: GLYPH_W,
    height: GLYPH_H,
    step: 3,
    mask: (x, y) => codeWindow(x, y) && markMask(track, x, y),
  });
  for (const stroke of base) stroke.opacity = 0.42 + rand() * 0.5;
  for (const stroke of accent) stroke.opacity = 0.8 + rand() * 0.2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GLYPH_W} ${GLYPH_H}" width="100%" height="100%" aria-hidden="true">
    <rect width="${GLYPH_W}" height="${GLYPH_H}" fill="#f7f7f5"/>
    <g fill="none" stroke="#171717" stroke-linecap="round" stroke-width="1.6">${strokeMarkup(base)}</g>
    <g fill="none" stroke="#3b5bff" stroke-linecap="round" stroke-width="1.6">${strokeMarkup(accent)}</g>
  </svg>`;
  coverCache.set(track, svg);
  return svg;
}

export function markSvg(): string {
  const strokes: Stroke[] = [
    { x: 7, y: 9, width: 13, opacity: 0.95 },
    { x: 7, y: 13, width: 9, opacity: 0.95 },
    { x: 7, y: 17, width: 12, opacity: 0.95 },
  ];
  return `<svg class="mark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
    <rect x="0.75" y="0.75" width="26.5" height="26.5" rx="8" fill="#f7f7f5" stroke="#171717" stroke-width="1"/>
    <g fill="none" stroke="#171717" stroke-linecap="round" stroke-width="1.6">${strokeMarkup(strokes)}</g>
    <line x1="7" y1="21" x2="13" y2="21" stroke="#3b5bff" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;
}

export function chip(track: string): string {
  const slug = TRACK_SLUG[track] ?? "developer-tools";
  return `<span class="chip chip-${slug}">${escapeHtml(track)}</span>`;
}

export function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · calibr8</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; }
    body {
      font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      color: #171717;
      background: #f4f4f2;
    }
    a { color: inherit; text-decoration: none; }
    button, input, textarea, select {
      font: inherit;
      color: inherit;
      background: #fff;
      border: 1px solid #e4e4e0;
      border-radius: 8px;
      padding: 7px 10px;
    }
    button { cursor: pointer; }
    button.primary, .roles button[data-session]:hover, .roles button.on, .seg a.on, .tabs a.on {
      background: #171717;
      color: #fff;
      border-color: #171717;
    }
    a:focus-visible, button:focus-visible { outline: 2px solid #3b5bff; outline-offset: 2px; }
    .app { display: grid; grid-template-columns: 232px minmax(0, 1fr); min-height: 100%; }
    .sidebar {
      background: #fff;
      border-right: 1px solid #e6e6e1;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      position: sticky;
      top: 0;
      height: 100vh;
    }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 650; letter-spacing: -0.03em; padding: 4px 8px; }
    .mark { width: 28px; height: 28px; display: block; flex: none; }
    .nav-label { font-size: 11px; color: #8a8a93; letter-spacing: 0.06em; text-transform: uppercase; padding: 0 8px 6px; }
    .sidebar nav { display: grid; gap: 2px; }
    .sidebar nav a { padding: 8px 10px; border-radius: 8px; color: #3f3f46; }
    .sidebar nav a:hover { background: #f4f4f2; }
    .sidebar nav a.on { background: #171717; color: #fff; }
    .roles { display: grid; gap: 6px; margin-top: auto; }
    .roles button { text-align: left; }
    .workspace { min-width: 0; }
    .topbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 22px;
    }
    .topbar h1 {
      font-family: Georgia, Palatino, "Iowan Old Style", "Palatino Linotype", serif;
      font-size: 26px;
      font-weight: 500;
      letter-spacing: -0.03em;
      margin: 0;
    }
    .topbar .spacer { flex: 1; }
    .meta { color: #71717a; font-size: 13px; }
    .view-switch { display: flex; padding: 0 0 14px; }
    .seg { display: inline-flex; gap: 4px; background: #fff; border: 1px solid #e6e6e1; border-radius: 999px; padding: 3px; }
    .seg a { padding: 5px 12px; border-radius: 999px; font-size: 13px; }
    main.pad { padding: 0 22px 32px; }
    .panel {
      background: #fff;
      border: 1px solid #e6e6e1;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(23, 23, 23, 0.04);
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #f0f0ec; vertical-align: middle; }
    th { font-size: 12px; font-weight: 580; color: #71717a; background: #fafaf8; }
    tr:last-child td { border-bottom: 0; }
    tbody tr:hover td { background: #fafaf8; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .thumb { width: 84px; height: 56px; border-radius: 8px; background: #f7f7f5; overflow: hidden; }
    .thumb svg { width: 100%; height: 100%; display: block; }
    .name { font-weight: 600; }
    .muted { color: #71717a; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
    .card {
      background: #fff;
      border: 1px solid #e6e6e1;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(23, 23, 23, 0.04);
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .card:hover { border-color: #d4d4d0; }
    .cover { width: 100%; height: 148px; background: #f7f7f5; display: block; }
    .cover svg { width: 100%; height: 100%; display: block; }
    .card-body { padding: 12px 14px 14px; display: grid; gap: 6px; }
    .card h2 { font-size: 16px; margin: 0; letter-spacing: -0.02em; }
    .card p { margin: 0; color: #52525b; font-size: 13px; }
    .chip {
      display: inline-flex;
      width: fit-content;
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 999px;
      background: #f4f4f2;
      color: #3f3f46;
      border: 1px solid #e6e6e1;
    }
    .record { display: grid; grid-template-columns: minmax(0, 1.1fr) 320px; gap: 16px; }
    .hero-art { width: 100%; height: 220px; background: #f7f7f5; display: block; }
    .hero-art svg { width: 100%; height: 100%; display: block; }
    .fields { display: grid; }
    .field { display: grid; grid-template-columns: 140px 1fr; gap: 12px; padding: 12px 16px; border-top: 1px solid #f0f0ec; }
    .field span { color: #71717a; font-size: 13px; }
    .side { padding: 16px; display: grid; gap: 10px; align-content: start; }
    .split { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr); min-height: calc(100vh - 72px); }
    .pane { background: #fff; margin: 0 12px 12px; border: 1px solid #e6e6e1; border-radius: 16px; overflow: auto; padding: 18px; box-shadow: 0 10px 30px rgba(23, 23, 23, 0.04); min-width: 0; }
    .pane h1 { font-family: Georgia, Palatino, "Iowan Old Style", "Palatino Linotype", serif; font-size: 32px; font-weight: 500; letter-spacing: -0.03em; margin: 0 0 8px; }
    .stack { display: grid; gap: 8px; max-width: 560px; }
    .workspace > .stack, .workspace > form.stack { margin: 0 22px 28px; }
    .stars { display: flex; gap: 6px; flex-wrap: wrap; }
    .stars button[aria-pressed="true"] { background: #171717; color: #fff; border-color: #171717; }
    pre { margin: 0; white-space: pre-wrap; font: 12px/1.45 ui-monospace, Consolas, monospace; }
    .tabs { display: flex; gap: 6px; flex-wrap: wrap; }
    .tabs a { background: #fff; border: 1px solid #e6e6e1; border-radius: 999px; padding: 6px 10px; font-size: 13px; }
    @media (max-width: 860px) {
      .app { grid-template-columns: 1fr; }
      .sidebar { position: relative; height: auto; }
      .record, .split { grid-template-columns: 1fr; }
      .field { grid-template-columns: 1fr; gap: 4px; }
      .topbar { flex-wrap: wrap; }
    }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export function shell(title: string, main: string, meta = ""): string {
  return page(
    title,
    `<div class="app">
      <aside class="sidebar">
        <a class="brand" href="/projects">${markSvg()}calibr8</a>
        <div>
          <div class="nav-label">Workspace</div>
          <nav>
            <a href="/projects">Projects</a>
            <a href="/standings">Standings</a>
            <a href="/records">Records</a>
            <a id="feed-link" href="/events/evt_01/judges/jdg_01/feed">Judge feed</a>
            <a id="pair-link" href="/events/evt_01/judges/jdg_01/pairwise">Pairs</a>
            <a href="/docs">Docs</a>
          </nav>
        </div>
        <div class="roles">
          <div class="nav-label">Session</div>
          <button type="button" data-session="org_7f2a">Organizer</button>
          <button type="button" data-session="jdg_a_91bc">Judge A</button>
          <button type="button" data-session="jdg_b_44de">Judge B</button>
          <button type="button" data-session="prt_2e88">Participant</button>
          <button type="button" data-session="">Sign out</button>
        </div>
      </aside>
      <div class="workspace">
        <div class="topbar">
          <h1>${escapeHtml(title)}</h1>
          <span class="spacer"></span>
          <span class="meta" data-meta="${escapeHtml(meta)}">${escapeHtml(meta)}</span>
        </div>
        ${main}
      </div>
    </div>
    <script>
      const token = document.cookie.match(/(?:^|;\\s*)session=([^;]+)/)?.[1];
      const judge = token === "jdg_b_44de" ? "jdg_02" : "jdg_01";
      const feed = document.getElementById("feed-link");
      const pair = document.getElementById("pair-link");
      if (feed) feed.href = "/events/evt_01/judges/" + judge + "/feed";
      if (pair) pair.href = "/events/evt_01/judges/" + judge + "/pairwise";
      const path = location.pathname;
      document.querySelectorAll(".sidebar nav a").forEach((link) => {
        const href = link.getAttribute("href") || "";
        const active = path === href || (href.length > 1 && path.startsWith(href));
        link.classList.toggle("on", active);
      });
      const roles = { org_7f2a: "Organizer", jdg_a_91bc: "Judge A", jdg_b_44de: "Judge B", prt_2e88: "Participant" };
      const role = roles[token] || "Signed out";
      const metaEl = document.querySelector(".topbar .meta");
      if (metaEl) {
        const passed = metaEl.getAttribute("data-meta") || "";
        metaEl.textContent = passed ? passed + " · " + role : role;
      }
      document.querySelectorAll("[data-session]").forEach((button) => {
        const value = button.getAttribute("data-session") || "";
        button.classList.toggle("on", value ? token === value : !token);
        button.addEventListener("click", () => {
          document.cookie = value ? "session=" + value + "; path=/" : "session=; Max-Age=0; path=/";
          location.reload();
        });
      });
    </script>`,
  );
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
