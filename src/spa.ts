import fs from "node:fs";
import path from "node:path";
import { escapeHtml } from "./ui.js";

const distRoot = path.resolve(process.cwd(), "web", "dist");

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
};

/**
 * Vite's default asset directory is `/assets`, which collides with the PNG
 * route. The client must set Vite `build.assetsDir` to `static` and `base`
 * to `/`. `/static/*` reads `web/dist/static`. If a requested file is missing
 * from `web/dist`, callers fall through to the existing `/assets/*` handler.
 * `web/dist/assets` is served only when that built file is actually present.
 */

export function spaIndexExists(): boolean {
  try {
    return fs.statSync(path.join(distRoot, "index.html")).isFile();
  } catch {
    return false;
  }
}

export function readSpaIndex(): string | null {
  if (!spaIndexExists()) return null;
  return fs.readFileSync(path.join(distRoot, "index.html"), "utf8");
}

export function injectProjectTitles(html: string, titles: string[]): string {
  const hidden = `<div hidden id="calibr8-project-titles">${titles.map((title) => escapeHtml(title)).join("\n")}</div>`;
  const match = html.match(/<body[^>]*>/i);
  if (!match || match.index === undefined) return `${hidden}${html}`;
  const at = match.index + match[0].length;
  return html.slice(0, at) + hidden + html.slice(at);
}

export function resolveDistFile(rel: string): string | null {
  if (!rel || rel.includes("\0")) return null;
  const segments: string[] = [];
  for (const piece of rel.replaceAll("\\", "/").split("/")) {
    if (!piece || piece === ".") continue;
    if (piece === "..") return null;
    segments.push(piece);
  }
  if (!segments.length) return null;
  const file = path.resolve(distRoot, ...segments);
  const relative = path.relative(distRoot, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  try {
    if (!fs.statSync(file).isFile()) return null;
  } catch {
    return null;
  }
  return file;
}

export function distContentType(file: string): string {
  return contentTypes[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}

export function distPathBlocked(pathname: string): boolean {
  const normalized = pathname.replaceAll("\\", "/").replace(/^\/+/, "");
  return (
    normalized === "api" ||
    normalized.startsWith("api/") ||
    normalized === "health" ||
    normalized === "docs" ||
    normalized === "projects/new" ||
    normalized.startsWith("events/")
  );
}
