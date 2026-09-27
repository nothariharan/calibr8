export function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; }
    body {
      font: 13px/1.35 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      color: #161616;
      background: #fff;
    }
    a { color: inherit; }
    header {
      display: flex;
      gap: 14px;
      align-items: baseline;
      padding: 6px 10px;
      border-bottom: 1px solid #e6e6e6;
      position: sticky;
      top: 0;
      background: #fff;
    }
    header strong { font-size: 13px; letter-spacing: 0; }
    header nav { display: flex; gap: 12px; color: #444; }
    header .spacer { flex: 1; }
    header .meta { color: #666; }
    main { padding: 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 3px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
    th {
      font-size: 11px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      position: sticky;
      top: 29px;
      background: #fafafa;
    }
    tr:hover td { background: #f7f7f7; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .muted { color: #666; }
    .split { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr); height: calc(100vh - 30px); }
    .pane { overflow: auto; padding: 8px 10px; }
    .pane + .pane { border-left: 1px solid #e6e6e6; }
    h1 { font-size: 16px; font-weight: 600; margin: 0 0 4px; }
    p { margin: 0 0 8px; }
    button, input, textarea, select {
      font: inherit;
      color: inherit;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 2px;
      padding: 3px 6px;
    }
    button { cursor: pointer; }
    button:hover { background: #f5f5f5; }
    .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .stars button { min-width: 28px; }
    .stars button[aria-pressed="true"] { background: #161616; color: #fff; border-color: #161616; }
    pre { margin: 0; white-space: pre-wrap; font: 12px/1.4 ui-monospace, "Cascadia Code", Consolas, monospace; }
    form .stack { display: grid; gap: 6px; max-width: 520px; padding: 10px; }
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
    `<header>
      <strong>calibr8</strong>
      <nav>
        <a href="/projects">Projects</a>
        <a href="/projects/new">Submit</a>
      </nav>
      <span class="spacer"></span>
      <span class="meta">${meta}</span>
    </header>
    <main>${main}</main>`,
  );
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
