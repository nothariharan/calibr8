import { inRoundRect, mulberry32, sampleShape, type Stroke } from "./strokes";

export type SceneCluster = {
  id: string;
  label: string;
  from: Stroke[];
  to: Stroke[];
};

export type Scenes = {
  problem: { width: number; height: number; clusters: SceneCluster[] };
  calibration: { width: number; height: number; from: Stroke[]; to: Stroke[] };
  integrity: { width: number; height: number; hidden: Stroke[]; intact: Stroke[]; broken: Stroke[] };
  pairwise: {
    width: number;
    height: number;
    left: { from: Stroke[]; to: Stroke[] };
    right: { from: Stroke[]; to: Stroke[] };
  };
};

function cluster(
  seed: number,
  width: number,
  height: number,
  count: number,
  span: (unit: number) => number,
): Stroke[] {
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

function ellipse(cx: number, cy: number, rx: number, ry: number, width: number, height: number, step: number): Stroke[] {
  return sampleShape({
    width,
    height,
    step,
    mask: (x, y) => {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      return dx * dx + dy * dy <= 1;
    },
  });
}

function buildChain(step: number): Scenes["integrity"] {
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
        step,
        mask: (x, y) => inRoundRect(x, y, ox + 16, 62, nodeW - 32, nodeH - 24, 6),
      });
    }
    return sampleShape({
      width,
      height,
      step,
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
  return { width, height, hidden: retouch("hidden"), intact, broken: retouch("broken") };
}

export function buildScenes(opts: { step: number; clusters: number }): Scenes {
  const boxW = 240;
  const boxH = 188;
  const count = opts.clusters;
  const target = sharedCluster(count, boxW, boxH);
  const problem = {
    width: boxW,
    height: boxH,
    clusters: [
      {
        id: "generous",
        label: "Generous",
        from: cluster(11, boxW, boxH, count, (unit) => 0.58 + unit * 0.28),
        to: target,
      },
      {
        id: "neutral",
        label: "Neutral",
        from: cluster(22, boxW, boxH, count, (unit) => 0.3 + unit * 0.18),
        to: target,
      },
      {
        id: "harsh",
        label: "Harsh",
        from: cluster(33, boxW, boxH, count, (unit) => 0.08 + unit * 0.14),
        to: target,
      },
    ],
  };

  const calW = 640;
  const calH = 280;
  const blob = sampleShape({
    width: calW,
    height: calH,
    step: opts.step,
    mask: (x, y) => {
      const dx = (x - calW / 2) / 108;
      const dy = (y - calH / 2) / 46;
      return dx * dx + dy * dy <= 1;
    },
  }).map((stroke) => ({ ...stroke, opacity: 0.9 }));
  const scatter = mulberry32(7);
  const raw = blob.map((stroke) => {
    const width = Math.min(calW * 0.7, Math.max(14, 18 + scatter() * calW * 0.45));
    return { x: scatter() * Math.max(1, calW - width), y: stroke.y, width, opacity: 0.3 + scatter() * 0.55 };
  });

  const pairW = 680;
  const pairH = 240;
  const leftFrom = ellipse(168, 120, 96, 52, pairW, pairH, opts.step);
  const rightFrom = ellipse(512, 120, 96, 52, pairW, pairH, opts.step);
  const shift = 130;

  return {
    problem,
    calibration: { width: calW, height: calH, from: raw, to: blob },
    integrity: buildChain(opts.step),
    pairwise: {
      width: pairW,
      height: pairH,
      left: { from: leftFrom, to: leftFrom.map((stroke) => ({ ...stroke, x: stroke.x + shift })) },
      right: { from: rightFrom, to: rightFrom.map((stroke) => ({ ...stroke, x: stroke.x - shift })) },
    },
  };
}
