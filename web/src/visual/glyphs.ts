import { hashSeed, inRoundRect, mulberry32, sampleShape, type Stroke } from "./strokes";

export const GLYPH_W = 160;
export const GLYPH_H = 108;

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

const cache = new Map<string, { base: Stroke[]; accent: Stroke[] }>();

export function glyphStrokes(track: string): { base: Stroke[]; accent: Stroke[] } {
  const key = track || "Developer tools";
  const cached = cache.get(key);
  if (cached) return cached;
  const rand = mulberry32(hashSeed(key));
  const base = sampleShape({
    width: GLYPH_W,
    height: GLYPH_H,
    step: 4,
    mask: (x, y) => codeWindow(x, y) && !markMask(key, x, y),
  });
  const accent = sampleShape({
    width: GLYPH_W,
    height: GLYPH_H,
    step: 3,
    mask: (x, y) => codeWindow(x, y) && markMask(key, x, y),
  });
  for (const stroke of base) stroke.opacity = 0.42 + rand() * 0.5;
  for (const stroke of accent) stroke.opacity = 0.8 + rand() * 0.2;
  const value = { base, accent };
  cache.set(key, value);
  return value;
}
