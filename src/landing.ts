import { chip, escapeHtml, markSvg, trackArt } from "./ui.js";
import {
  generateField,
  inRoundRect,
  mulberry32,
  renderLines,
  sampleShape,
  strokeMarkup,
  type Stroke,
} from "./visual/strokes.js";

export type LandingProject = {
  id: string;
  title: string;
  track: string;
  team: string;
  submitted_at: string;
};

const CLIENT = `
function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function generateField(width, height, count, seed) {
  var rand = mulberry32(seed);
  var strokes = [];
  for (var i = 0; i < count; i++) {
    var w = width * (0.035 + rand() * 0.2);
    var x = rand() * Math.max(1, width - w);
    strokes.push({ x: x, y: rand() * height, width: w, opacity: 0.18 + rand() * 0.72 });
  }
  return strokes;
}
function unpack(rows) {
  var out = [];
  for (var i = 0; i < rows.length; i++) out.push({ x: rows[i][0], y: rows[i][1], width: rows[i][2], opacity: rows[i][3] });
  return out;
}
function resample(strokes, count) {
  if (count <= 0) return [];
  if (strokes.length === count) return strokes;
  if (strokes.length === 0) {
    var blank = [];
    for (var i = 0; i < count; i++) blank.push({ x: 0, y: 0, width: 0, opacity: 0 });
    return blank;
  }
  if (strokes.length === 1) {
    var same = [];
    for (var j = 0; j < count; j++) same.push({ x: strokes[0].x, y: strokes[0].y, width: strokes[0].width, opacity: strokes[0].opacity });
    return same;
  }
  var out = [];
  for (var k = 0; k < count; k++) {
    var pos = (k * (strokes.length - 1)) / (count - 1);
    var lo = Math.floor(pos);
    var hi = Math.min(strokes.length - 1, lo + 1);
    var f = pos - lo;
    var a = strokes[lo];
    var b = strokes[hi];
    out.push({
      x: a.x + (b.x - a.x) * f,
      y: a.y + (b.y - a.y) * f,
      width: a.width + (b.width - a.width) * f,
      opacity: a.opacity + (b.opacity - a.opacity) * f
    });
  }
  return out;
}
function lerpStrokes(a, b, progress) {
  var t = Math.min(1, Math.max(0, progress));
  var count = Math.max(a.length, b.length, 1);
  var left = resample(a, count);
  var right = resample(b, count);
  var out = [];
  for (var i = 0; i < count; i++) {
    out.push({
      x: left[i].x + (right[i].x - left[i].x) * t,
      y: left[i].y + (right[i].y - left[i].y) * t,
      width: left[i].width + (right[i].width - left[i].width) * t,
      opacity: left[i].opacity + (right[i].opacity - left[i].opacity) * t
    });
  }
  return out;
}
function lineBody(strokes) {
  var body = "";
  for (var i = 0; i < strokes.length; i++) {
    var s = strokes[i];
    body += '<line x1="' + s.x.toFixed(2) + '" y1="' + s.y.toFixed(2) + '" x2="' + (s.x + s.width).toFixed(2) + '" y2="' + s.y.toFixed(2) + '" stroke-width="1.6" opacity="' + s.opacity.toFixed(3) + '"/>';
  }
  return body;
}
function renderLines(strokes, width, height, color) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="100%" height="100%" fill="none" stroke="' + color + '" stroke-linecap="round" aria-hidden="true">' + lineBody(strokes) + '</svg>';
}
function sectionProgress(section) {
  if (!section || !section.getBoundingClientRect) return 1;
  var rect = section.getBoundingClientRect();
  var vh = window.innerHeight || 1;
  var range = rect.height + vh * 0.6;
  if (range <= 0) return 1;
  return Math.min(1, Math.max(0, (vh * 0.8 - rect.top) / range));
}
function setSvg(id, html) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
function boot(scenes) {
  var tokenMatch = document.cookie.match(/(?:^|;\\s*)session=([^;]+)/);
  var token = tokenMatch ? tokenMatch[1] : "";
  var judge = token === "jdg_b_44de" ? "jdg_02" : "jdg_01";
  var feed = document.getElementById("feed-link");
  var pair = document.getElementById("pair-link");
  var feedUrl = document.getElementById("feed-url");
  var href = "/events/evt_01/judges/" + judge + "/feed";
  if (feed) feed.href = href;
  if (pair) pair.href = "/events/evt_01/judges/" + judge + "/pairwise";
  if (feedUrl) feedUrl.textContent = href;
  document.querySelectorAll("[data-session]").forEach(function (button) {
    var value = button.getAttribute("data-session") || "";
    button.classList.toggle("on", value ? token === value : !token);
    button.addEventListener("click", function () {
      document.cookie = value ? "session=" + value + "; path=/" : "session=; Max-Age=0; path=/";
      location.reload();
    });
  });
  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (err) { reduce = false; }
  var narrow = false;
  try { narrow = window.matchMedia("(max-width: 800px)").matches; } catch (err2) { narrow = false; }
  function paintHero() {
    var host = document.getElementById("hero-field");
    if (!host) return;
    var count = narrow ? 140 : 400;
    if (host.getAttribute("data-count") === String(count)) return;
    host.innerHTML = renderLines(generateField(720, 640, count, 10), 720, 640, "#3b5bff");
    host.setAttribute("data-count", String(count));
  }
  function paintScenes() {
    function progress(id) { return reduce ? 1 : sectionProgress(document.getElementById(id)); }
    var problem = scenes && scenes.problem;
    if (problem) {
      var t = progress("how");
      var names = ["generous", "neutral", "harsh"];
      for (var i = 0; i < names.length; i++) {
        var part = problem[names[i]];
        if (!part) continue;
        setSvg("cluster-" + names[i], renderLines(lerpStrokes(unpack(part.from), unpack(part.to), t), problem.width, problem.height, "#171717"));
      }
      var caption = document.getElementById("problem-caption");
      if (caption) caption.textContent = t < 0.55 ? "Different standards." : "Same scale.";
    }
    var calibration = scenes && scenes.calibration;
    if (calibration) {
      var tc = progress("calibration");
      setSvg("calibration-field", renderLines(lerpStrokes(unpack(calibration.from), unpack(calibration.to), tc), calibration.width, calibration.height, "#3b5bff"));
    }
    var integrity = scenes && scenes.integrity;
    if (integrity) {
      var ti = progress("integrity");
      var chain = ti < 0.62
        ? lerpStrokes(unpack(integrity.hidden), unpack(integrity.intact), ti / 0.62)
        : lerpStrokes(unpack(integrity.intact), unpack(integrity.broken), (ti - 0.62) / 0.38);
      setSvg("integrity-field", renderLines(chain, integrity.width, integrity.height, "#171717"));
      var note = document.getElementById("integrity-note");
      if (note) note.hidden = ti < 0.72;
    }
    var pairwise = scenes && scenes.pairwise;
    if (pairwise) {
      var tp = progress("pairwise");
      var left = lerpStrokes(unpack(pairwise.left.from), unpack(pairwise.left.to), tp);
      var right = lerpStrokes(unpack(pairwise.right.from), unpack(pairwise.right.to), tp);
      setSvg("pairwise-field", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + pairwise.width + ' ' + pairwise.height + '" width="100%" height="100%" aria-hidden="true"><g fill="none" stroke="#171717" stroke-linecap="round">' + lineBody(left) + '</g><g fill="none" stroke="#3b5bff" stroke-linecap="round">' + lineBody(right) + '</g></svg>');
    }
  }
  paintHero();
  try { paintScenes(); } catch (err3) {}
  var scheduled = false;
  function onScroll() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      try { narrow = window.matchMedia("(max-width: 800px)").matches; } catch (err4) {}
      paintHero();
      try { paintScenes(); } catch (err5) {}
    });
  }
  if (!reduce) window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
}
`;

function pack(strokes: Stroke[]): number[][] {
  return strokes.map((stroke) => [
    Math.round(stroke.x * 100) / 100,
    Math.round(stroke.y * 100) / 100,
    Math.round(stroke.width * 100) / 100,
    Math.round(stroke.opacity * 1000) / 1000,
  ]);
}

function cluster(seed: number, width: number, height: number, count: number, span: (unit: number) => number): Stroke[] {
  const rand = mulberry32(seed);
  const strokes: Stroke[] = [];
  for (let i = 0; i < count; i++) {
    const y = 12 + ((i + 0.5) / count) * (height - 24);
    const widthPx = Math.max(8, width * span(rand()));
    const x = 10 + rand() * Math.max(0, width - widthPx - 20);
    strokes.push({ x, y, width: widthPx, opacity: 0.5 + rand() * 0.45 });
  }
  return strokes;
}

function sharedCluster(count: number, width: number, height: number): Stroke[] {
  const widthPx = width * 0.46;
  const x = (width - widthPx) / 2;
  const strokes: Stroke[] = [];
  for (let i = 0; i < count; i++) {
    strokes.push({ x, y: 12 + ((i + 0.5) / count) * (height - 24), width: widthPx, opacity: 0.88 });
  }
  return strokes;
}

function ellipse(cx: number, cy: number, rx: number, ry: number, width: number, height: number): Stroke[] {
  return sampleShape({
    width,
    height,
    step: 4,
    mask: (x, y) => {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      return dx * dx + dy * dy <= 1;
    },
  });
}

function buildScenes() {
  const boxW = 240;
  const boxH = 188;
  const count = 16;
  const target = sharedCluster(count, boxW, boxH);
  const problem = {
    width: boxW,
    height: boxH,
    generous: { from: pack(cluster(11, boxW, boxH, count, (unit) => 0.58 + unit * 0.28)), to: pack(target) },
    neutral: { from: pack(cluster(22, boxW, boxH, count, (unit) => 0.3 + unit * 0.18)), to: pack(target) },
    harsh: { from: pack(cluster(33, boxW, boxH, count, (unit) => 0.08 + unit * 0.14)), to: pack(target) },
  };

  const calW = 640;
  const calH = 280;
  const blob = sampleShape({
    width: calW,
    height: calH,
    step: 4,
    mask: (x, y) => {
      const dx = (x - calW / 2) / 108;
      const dy = (y - calH / 2) / 46;
      return dx * dx + dy * dy <= 1;
    },
  }).map((stroke) => ({ ...stroke, opacity: 0.9 }));
  const scatter = mulberry32(7);
  const raw = blob.map((stroke) => {
    const width = Math.min(calW * 0.7, Math.max(14, (18 + scatter() * calW * 0.45)));
    return { x: scatter() * Math.max(1, calW - width), y: stroke.y, width, opacity: 0.3 + scatter() * 0.55 };
  });

  const pairW = 680;
  const pairH = 240;
  const leftFrom = ellipse(168, 120, 96, 52, pairW, pairH);
  const rightFrom = ellipse(512, 120, 96, 52, pairW, pairH);
  const shift = 130;

  const chain = buildChain();
  return {
    problem,
    calibration: { width: calW, height: calH, from: pack(raw), to: pack(blob) },
    integrity: chain,
    pairwise: {
      width: pairW,
      height: pairH,
      left: { from: pack(leftFrom), to: pack(leftFrom.map((stroke) => ({ ...stroke, x: stroke.x + shift }))) },
      right: { from: pack(rightFrom), to: pack(rightFrom.map((stroke) => ({ ...stroke, x: stroke.x - shift }))) },
    },
  };
}

function buildChain() {
  const width = 760;
  const height = 210;
  const nodeW = 100;
  const nodeH = 70;
  const xs = [36, 214, 392, 570];
  const kinds = ["score", "hash", "score", "hash"] as const;
  const nodes = xs.map((ox, index) => {
    if (kinds[index] === "hash") {
      return sampleShape({
        width,
        height,
        step: 4,
        mask: (x, y) => inRoundRect(x, y, ox + 16, 62, nodeW - 32, nodeH - 24, 6),
      });
    }
    return sampleShape({
      width,
      height,
      step: 4,
      mask: (x, y) => inRoundRect(x, y, ox, 48, nodeW, nodeH, 8),
    });
  });
  const links = [0, 1, 2].map((index) => {
    const x1 = xs[index] + nodeW + 10;
    const x2 = xs[index + 1] - 10;
    const strokes: Stroke[] = [];
    for (let row = -2; row <= 2; row++) {
      strokes.push({ x: x1, y: 83 + row * 4, width: Math.max(4, x2 - x1), opacity: 0.72 });
    }
    return strokes;
  });
  const intact = [...nodes.flat(), ...links.flat()];
  let cursor = 0;
  const nodeRanges = nodes.map((chunk) => {
    const range: [number, number] = [cursor, cursor + chunk.length];
    cursor += chunk.length;
    return range;
  });
  const linkRanges = links.map((chunk) => {
    const range: [number, number] = [cursor, cursor + chunk.length];
    cursor += chunk.length;
    return range;
  });
  const retouch = (mode: "hidden" | "broken"): Stroke[] =>
    intact.map((stroke, index) => {
      const nodeIndex = nodeRanges.findIndex(([start, end]) => index >= start && index < end);
      const linkIndex = linkRanges.findIndex(([start, end]) => index >= start && index < end);
      if (mode === "hidden") {
        return { x: stroke.x + stroke.width * 0.42, y: stroke.y, width: Math.max(1, stroke.width * 0.06), opacity: 0 };
      }
      if (nodeIndex === 2) return { ...stroke, y: stroke.y + 48 };
      if (nodeIndex === 3) return { ...stroke, y: stroke.y + 48, opacity: 0.18 };
      if (linkIndex === 2) return { ...stroke, width: 0, opacity: 0 };
      return { ...stroke };
    });
  return {
    width,
    height,
    hidden: pack(retouch("hidden")),
    intact: pack(intact),
    broken: pack(retouch("broken")),
  };
}

function sessionButtons(): string {
  return `<div class="session-btns">
    <button type="button" data-session="org_7f2a">Organizer</button>
    <button type="button" data-session="jdg_a_91bc">Judge A</button>
    <button type="button" data-session="jdg_b_44de">Judge B</button>
    <button type="button" data-session="prt_2e88">Participant</button>
    <button type="button" data-session="">Sign out</button>
  </div>`;
}

function miniCard(project: LandingProject): string {
  const date = project.submitted_at.slice(0, 10);
  return `<a class="mini-card" href="/projects/${escapeHtml(project.id)}">
    <div class="mini-cover">${trackArt(project.track)}</div>
    <div class="mini-body">
      ${chip(project.track)}
      <strong>${escapeHtml(project.title)}</strong>
      <span>${escapeHtml(project.team)} · ${escapeHtml(date)}</span>
    </div>
  </a>`;
}

function browserChrome(url: string, urlId = ""): string {
  const id = urlId ? ` id="${urlId}"` : "";
  return `<div class="browser-top"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="browser-url"${id}>${escapeHtml(url)}</span></div>`;
}

export function landingPage(opts: { sessionLabel: string | null; projects: LandingProject[] }): string {
  const scenes = buildScenes();
  const heroField = renderLines(generateField({ width: 720, height: 640, count: 400, seed: 10 }), {
    width: 720,
    height: 640,
    color: "#3b5bff",
  });
  const cards = opts.projects.map((project) => miniCard(project)).join("");
  const featured = opts.projects[0];
  const signed = opts.sessionLabel ? `Signed in as ${escapeHtml(opts.sessionLabel)}` : "Not signed in";
  const json = JSON.stringify(scenes).replaceAll("<", "\\u003c");
  const feedPreview = featured
    ? `<div class="feed-mini">
        <div>
          ${chip(featured.track)}
          <h3>${escapeHtml(featured.title)}</h3>
          <p>${escapeHtml(featured.team)}</p>
        </div>
        <div>
          <p class="kicker">Criteria</p>
          <div class="scale" aria-hidden="true"><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
          <p>0 to 5. Enter saves a ballot on the feed.</p>
        </div>
      </div>`
    : `<p class="pad-note">No fixture projects are loaded.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>calibr8</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body {
      font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      color: #171717;
      background: #f4f4f2;
    }
    a { color: inherit; text-decoration: none; }
    button { font: inherit; cursor: pointer; }
    a:focus-visible, button:focus-visible { outline: 2px solid #3b5bff; outline-offset: 3px; }
    .wrap { width: min(1120px, calc(100% - 48px)); margin: 0 auto; }
    .site-nav {
      display: flex;
      align-items: center;
      gap: 28px;
      height: 72px;
      position: sticky;
      top: 0;
      z-index: 4;
      background: #f4f4f2;
      border-bottom: 1px solid transparent;
    }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 650; letter-spacing: -0.03em; }
    .mark { width: 28px; height: 28px; display: block; }
    .site-nav nav { display: flex; gap: 22px; color: #3f3f46; font-size: 14px; }
    .site-nav nav a:hover { color: #171717; }
    .nav-cta { margin-left: auto; }
    .btn, .btn-ghost {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      padding: 11px 16px;
      font-size: 14px;
      line-height: 1;
      border: 1px solid #171717;
      white-space: nowrap;
    }
    .btn { background: #171717; color: #fff; }
    .btn:hover { background: #000; }
    .btn-ghost { background: #fff; color: #171717; }
    .hero { display: grid; grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr); gap: 36px; align-items: center; padding: 28px 0 72px; }
    .eyebrow { margin: 0 0 14px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b6b73; }
    h1, h2, .step b {
      font-family: Georgia, Palatino, "Iowan Old Style", "Palatino Linotype", serif;
      font-weight: 500;
      letter-spacing: -0.03em;
    }
    h1 { font-size: clamp(44px, 5.4vw, 72px); line-height: 0.98; margin: 0 0 18px; }
    h2 { font-size: clamp(32px, 4vw, 48px); line-height: 1.05; margin: 0 0 14px; }
    .lede { margin: 0 0 22px; max-width: 46ch; color: #3f3f46; font-size: 16px; }
    .cta-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 22px; }
    .signed { margin: 0 0 8px; color: #71717a; font-size: 13px; }
    .session-btns { display: flex; flex-wrap: wrap; gap: 6px; }
    .session-btns button {
      background: #fff;
      color: #171717;
      border: 1px solid #e4e4e0;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 13px;
    }
    .session-btns button.on, .session-btns button:hover { background: #171717; color: #fff; border-color: #171717; }
    .hero-visual { position: relative; min-height: 460px; min-width: 0; overflow: hidden; }
    .hero-field { position: absolute; right: -8%; top: 0; width: 118%; height: 100%; color: #3b5bff; pointer-events: none; z-index: 0; }
    .hero-field svg { width: 100%; height: 100%; display: block; }
    .browser {
      position: relative;
      z-index: 1;
      background: #fff;
      border: 1px solid #e6e6e1;
      border-radius: 16px;
      box-shadow: 0 24px 60px rgba(23, 23, 23, 0.08);
      overflow: hidden;
      max-width: 100%;
    }
    .browser-top { display: flex; align-items: center; gap: 6px; padding: 12px 14px; border-bottom: 1px solid #eeeae4; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #deded8; display: block; }
    .browser-url {
      margin-left: 8px;
      background: #f4f4f2;
      color: #71717a;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 12px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mini-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; padding: 14px; }
    .mini-card { min-width: 0; display: grid; gap: 8px; }
    .mini-cover { height: 78px; border-radius: 10px; overflow: hidden; background: #f7f7f5; border: 1px solid #eeeae4; }
    .mini-cover svg, .frame svg, .cluster svg { width: 100%; height: 100%; display: block; }
    .mini-body { display: grid; gap: 4px; }
    .mini-body strong { font-size: 13px; letter-spacing: -0.02em; }
    .mini-body span, .feed-mini p { margin: 0; color: #71717a; font-size: 12px; }
    .chip {
      display: inline-flex;
      width: fit-content;
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 999px;
      background: #f4f4f2;
      border: 1px solid #e6e6e1;
      color: #3f3f46;
    }
    .section { padding: 88px 0; }
    .copy { max-width: 62ch; }
    .copy p, .step p, .point p { color: #3f3f46; margin: 0; }
    .clusters { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 28px; }
    .cluster { background: #fff; border: 1px solid #e6e6e1; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(23, 23, 23, 0.04); min-width: 0; }
    .cluster > div { aspect-ratio: 240 / 188; }
    .frame { aspect-ratio: 16 / 7; }
    #integrity-field { aspect-ratio: 760 / 210; }
    #pairwise-field { aspect-ratio: 680 / 240; }
    #calibration-field { aspect-ratio: 640 / 280; }
    .cluster figcaption, .caption, .kicker { font-size: 13px; color: #71717a; }
    .cluster figcaption { padding: 0 12px 12px; }
    .caption { margin: 14px 0 0; }
    .frame {
      margin-top: 28px;
      background: #fff;
      border: 1px solid #e6e6e1;
      border-radius: 16px;
      min-height: 260px;
      box-shadow: 0 10px 30px rgba(23, 23, 23, 0.04);
      overflow: hidden;
    }
    .points, .steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 22px; margin-top: 8px; }
    .point, .step { min-width: 0; padding-top: 14px; border-top: 1px solid #171717; }
    .point h3, .step b { display: block; font-size: 18px; margin: 0 0 8px; }
    .point h3 { font-family: Georgia, Palatino, "Iowan Old Style", "Palatino Linotype", serif; font-weight: 500; letter-spacing: -0.03em; }
    .step span { display: block; font-size: 12px; letter-spacing: 0.08em; color: #3b5bff; margin-bottom: 8px; }
    .workspace-grid { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); gap: 36px; align-items: center; }
    .feed-mini { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr); gap: 18px; padding: 22px; }
    .feed-mini h3 { font-family: Georgia, Palatino, "Iowan Old Style", serif; font-size: 28px; font-weight: 500; margin: 10px 0 6px; letter-spacing: -0.03em; }
    .scale { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
    .scale span { width: 32px; height: 32px; display: grid; place-items: center; border: 1px solid #e4e4e0; border-radius: 8px; background: #fff; font-size: 13px; }
    .text-link { display: inline-flex; margin: 16px 0 0; font-size: 14px; border-bottom: 1px solid #171717; }
    .chain-labels { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 8px; color: #71717a; font-size: 13px; }
    .note { margin-top: 18px; color: #3f3f46; }
    .closed { margin-top: 22px; color: #71717a; font-size: 14px; }
    .site-foot { border-top: 1px solid #e6e6e1; padding: 22px 0 32px; }
    .foot-row { display: flex; justify-content: space-between; gap: 16px; font-size: 14px; }
    .foot-row span { display: flex; gap: 16px; }
    .pad-note { padding: 16px; color: #71717a; }
    @media (max-width: 800px) {
      .wrap { width: min(1120px, calc(100% - 32px)); }
      .site-nav { height: auto; flex-wrap: wrap; padding: 14px 0; gap: 12px 18px; }
      .site-nav nav { order: 3; width: 100%; flex-wrap: wrap; gap: 12px 16px; }
      .nav-cta { margin-left: 0; }
      .hero, .workspace-grid, .clusters, .points, .steps, .feed-mini, .mini-grid { grid-template-columns: 1fr; }
      .hero { padding-top: 18px; }
      .hero-visual { min-height: 0; }
      .hero-field { position: relative; right: auto; top: auto; width: 100%; height: 160px; margin-bottom: 12px; }
      .section { padding: 64px 0; }
      .chain-labels { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <header class="wrap site-nav">
    <a class="brand" href="/">${markSvg()}calibr8</a>
    <nav>
      <a href="#how">The problem</a>
      <a href="#calibration">Calibration</a>
      <a href="#workspace">Workspace</a>
      <a href="/docs">Docs</a>
    </nav>
    <a class="btn nav-cta" href="/projects">Open portal</a>
  </header>
  <main>
    <section class="wrap hero">
      <div>
        <p class="eyebrow">Evaluation platform for hackathons</p>
        <h1>Fairer judging<br>for bigger ideas.</h1>
        <p class="lede">calibr8 is an offline portal. Calibration separates project quality from judge leniency. Each score sits on a SHA-256 hash chain. One Docker container, four fixture sessions, and no hosted accounts.</p>
        <div class="cta-row">
          <a class="btn" href="/projects">Open portal</a>
          <a class="btn-ghost" href="#calibration">How it works</a>
        </div>
        <p class="signed">${signed}</p>
        ${sessionButtons()}
      </div>
      <div class="hero-visual">
        <div class="hero-field" id="hero-field">${heroField}</div>
        <div class="browser">
          ${browserChrome("/projects")}
          <div class="mini-grid">${cards}</div>
        </div>
      </div>
    </section>
    <section class="section" id="how">
      <div class="wrap">
        <div class="copy">
          <h2>Most hackathon judging is inconsistent.</h2>
          <p>Different judges, different standards. A generous scale and a harsh scale are not the same measurement. Scroll, and the three scales move onto one distribution.</p>
        </div>
        <div class="clusters">
          <figure class="cluster"><div id="cluster-generous">${renderLines(unpackPreview(scenes.problem.generous.from), { width: scenes.problem.width, height: scenes.problem.height, color: "#171717" })}</div><figcaption>Generous</figcaption></figure>
          <figure class="cluster"><div id="cluster-neutral">${renderLines(unpackPreview(scenes.problem.neutral.from), { width: scenes.problem.width, height: scenes.problem.height, color: "#171717" })}</div><figcaption>Neutral</figcaption></figure>
          <figure class="cluster"><div id="cluster-harsh">${renderLines(unpackPreview(scenes.problem.harsh.from), { width: scenes.problem.width, height: scenes.problem.height, color: "#171717" })}</div><figcaption>Harsh</figcaption></figure>
        </div>
        <p class="caption" id="problem-caption">Different standards.</p>
      </div>
    </section>
    <section class="section" id="calibration">
      <div class="wrap">
        <div class="copy">
          <h2>Separate the project from the judge.</h2>
          <p>Each raw score is project quality θ plus judge bias b plus noise. Ridge pulls project scores toward the global mean and biases toward 0. Facts from a source tree are shown to the judge and are not terms in that equation. Community votes are a separate column.</p>
        </div>
        <div class="frame" id="calibration-field">${renderLines(unpackPreview(scenes.calibration.from), { width: scenes.calibration.width, height: scenes.calibration.height, color: "#3b5bff" })}</div>
      </div>
    </section>
    <section class="section" id="practice">
      <div class="wrap">
        <div class="points">
          <article class="point">
            <h3>Offline first</h3>
            <p>One container. No network required to judge.</p>
          </article>
          <article class="point">
            <h3>Hash chain</h3>
            <p>Each score's hash includes the previous hash. Changing a stored score fails verification.</p>
          </article>
          <article class="point">
            <h3>Fact scan</h3>
            <p>Reads dependency manifests from a local tree. Fixture rows have no tree, so they are not given invented packages.</p>
          </article>
          <article class="point">
            <h3>Close comparisons</h3>
            <p>A pairwise ballot is stored only when the calibrated gap is under 0.05. Quadratic votes use an integer V, cost V², budget 100. Public totals stay sealed until an organizer unfreezes them. Rank is by the sum of votes.</p>
          </article>
        </div>
      </div>
    </section>
    <section class="section" id="workspace">
      <div class="wrap workspace-grid">
        <div class="copy">
          <h2>The judging screen.</h2>
          <p>One project, criteria from 0 to 5, and the track. Judge B's session opens Judge B's feed. The server still refuses a judge who asks for someone else's scores.</p>
          <a id="feed-link" class="text-link" href="/events/evt_01/judges/jdg_01/feed">Open the feed</a>
        </div>
        <div class="browser">
          ${browserChrome("/events/evt_01/judges/jdg_01/feed", "feed-url")}
          ${feedPreview}
        </div>
      </div>
    </section>
    <section class="section" id="integrity">
      <div class="wrap">
        <div class="copy">
          <h2>Each score carries the previous hash.</h2>
          <p>The chain is score, hash, score, hash. This drawing shows the check: a changed score breaks the chain after it. The page does not read the database.</p>
        </div>
        <div class="frame" id="integrity-field">${renderLines(unpackPreview(scenes.integrity.hidden), { width: scenes.integrity.width, height: scenes.integrity.height, color: "#171717" })}</div>
        <div class="chain-labels"><span>score</span><span>hash</span><span>score</span><span>hash</span></div>
        <p class="note" id="integrity-note" hidden>A changed score breaks the chain after it.</p>
      </div>
    </section>
    <section class="section" id="pairwise">
      <div class="wrap">
        <div class="copy">
          <h2>Only the close calls get a ballot.</h2>
          <p>A pairwise ballot is stored only when the calibrated gap is under 0.05. Quadratic votes are an integer V with cost V², on a budget of 100. A 2-vote ballot costs 4.</p>
        </div>
        <div class="frame" id="pairwise-field">${groupedSvg(scenes.pairwise.width, scenes.pairwise.height, [
          { rows: scenes.pairwise.left.from, color: "#171717" },
          { rows: scenes.pairwise.right.from, color: "#3b5bff" },
        ])}</div>
      </div>
    </section>
    <section class="section" id="organizers">
      <div class="wrap">
        <div class="copy">
          <h2>Run the seeded event.</h2>
          <p>Four fixture sessions are already in the database. Submissions for this event are closed.</p>
        </div>
        <div class="steps">
          <article class="step"><span>01</span><b>Open the gallery</b><p>Every fixture project is listed on <a href="/projects">/projects</a>.</p></article>
          <article class="step"><span>02</span><b>Pick a session</b><p>Organizer, Judge A, Judge B, or Participant. The button sets that fixture cookie.</p></article>
          <article class="step"><span>03</span><b>Score on the feed</b><p>A judge sets 0 to 5. Enter saves the ballot for that judge only.</p></article>
          <article class="step"><span>04</span><b>Export CSV</b><p>The organizer session downloads the score export.</p></article>
        </div>
        <div class="closed">${sessionButtons()}<p>Submissions in the seeded event closed at 2026-03-01T18:00:00Z.</p></div>
      </div>
    </section>
  </main>
  <footer class="site-foot">
    <div class="wrap foot-row">
      <span>calibr8</span>
      <span><a href="/projects">Open portal</a><a href="/docs">Docs</a></span>
    </div>
  </footer>
  <script>
${CLIENT}
boot(${json});
  </script>
</body>
</html>`;
}

function unpackPreview(rows: number[][]): Stroke[] {
  return rows.map((row) => ({ x: row[0], y: row[1], width: row[2], opacity: row[3] }));
}

function groupedSvg(width: number, height: number, groups: { rows: number[][]; color: string }[]): string {
  const body = groups
    .map(
      (group) =>
        `<g fill="none" stroke="${group.color}" stroke-linecap="round">${strokeMarkup(unpackPreview(group.rows))}</g>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" aria-hidden="true">${body}</svg>`;
}
