import type { Stroke } from "../visual/strokes";

export function StrokeLines({
  width,
  height,
  groups,
}: {
  width: number;
  height: number;
  groups: { strokes: Stroke[]; color: string }[];
}) {
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" fill="none" aria-hidden="true">
      {groups.map((group, groupIndex) => (
        <g key={groupIndex} stroke={group.color} strokeLinecap="round">
          {group.strokes.map((stroke, index) => (
            <line
              key={index}
              x1={stroke.x}
              y1={stroke.y}
              x2={stroke.x + stroke.width}
              y2={stroke.y}
              strokeWidth="1.6"
              opacity={Math.max(0, Math.min(1, stroke.opacity))}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
