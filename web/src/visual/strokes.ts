export type Stroke = {
  x: number;
  y: number;
  width: number;
  opacity: number;
};

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function generateField(opts: { width: number; height: number; count: number; seed: number }): Stroke[] {
  const rand = mulberry32(opts.seed);
  const strokes: Stroke[] = [];
  for (let i = 0; i < opts.count; i++) {
    const width = opts.width * (0.035 + rand() * 0.2);
    const x = rand() * Math.max(1, opts.width - width);
    strokes.push({ x, y: rand() * opts.height, width, opacity: 0.18 + rand() * 0.72 });
  }
  return strokes;
}

export function sampleShape(opts: {
  width: number;
  height: number;
  mask: (x: number, y: number) => boolean;
  step?: number;
}): Stroke[] {
  const step = opts.step ?? 4;
  const strokes: Stroke[] = [];
  for (let y = step / 2; y < opts.height; y += step) {
    let runStart: number | null = null;
    for (let x = 0; x <= opts.width; x += 1) {
      const inside = x < opts.width && opts.mask(x, y);
      if (inside && runStart === null) runStart = x;
      if (!inside && runStart !== null) {
        const width = x - runStart;
        if (width >= 2) strokes.push({ x: runStart, y, width, opacity: 0.88 });
        runStart = null;
      }
    }
  }
  return strokes;
}

function resample(strokes: Stroke[], count: number): Stroke[] {
  if (count <= 0) return [];
  if (strokes.length === count) return strokes;
  if (strokes.length === 0) return Array.from({ length: count }, () => ({ x: 0, y: 0, width: 0, opacity: 0 }));
  if (strokes.length === 1) return Array.from({ length: count }, () => ({ ...strokes[0] }));
  const out: Stroke[] = [];
  for (let i = 0; i < count; i++) {
    const pos = (i * (strokes.length - 1)) / (count - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(strokes.length - 1, lo + 1);
    const f = pos - lo;
    const a = strokes[lo];
    const b = strokes[hi];
    out.push({
      x: a.x + (b.x - a.x) * f,
      y: a.y + (b.y - a.y) * f,
      width: a.width + (b.width - a.width) * f,
      opacity: a.opacity + (b.opacity - a.opacity) * f,
    });
  }
  return out;
}

export function lerpStrokes(a: Stroke[], b: Stroke[], progress: number): Stroke[] {
  const t = Math.min(1, Math.max(0, progress));
  const count = Math.max(a.length, b.length, 1);
  const left = resample(a, count);
  const right = resample(b, count);
  return left.map((stroke, i) => ({
    x: stroke.x + (right[i].x - stroke.x) * t,
    y: stroke.y + (right[i].y - stroke.y) * t,
    width: stroke.width + (right[i].width - stroke.width) * t,
    opacity: stroke.opacity + (right[i].opacity - stroke.opacity) * t,
  }));
}

export function inRoundRect(
  x: number,
  y: number,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number,
): boolean {
  if (x < left || y < top || x > left + width || y > top + height) return false;
  const onLeft = x < left + radius;
  const onRight = x > left + width - radius;
  const onTop = y < top + radius;
  const onBottom = y > top + height - radius;
  if ((onLeft || onRight) && (onTop || onBottom)) {
    const cx = onLeft ? left + radius : left + width - radius;
    const cy = onTop ? top + radius : top + height - radius;
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= radius * radius;
  }
  return true;
}
