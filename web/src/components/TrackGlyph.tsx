import { GLYPH_H, GLYPH_W, glyphStrokes } from "../visual/glyphs";

export function TrackGlyph({ track }: { track: string }) {
  const { base, accent } = glyphStrokes(track);
  return (
    <svg viewBox={`0 0 ${GLYPH_W} ${GLYPH_H}`} width="100%" height="100%" aria-hidden="true">
      <rect width={GLYPH_W} height={GLYPH_H} fill="#f7f7f5" />
      <g fill="none" stroke="#171717" strokeLinecap="round" strokeWidth="1.6">
        {base.map((stroke, index) => (
          <line key={index} x1={stroke.x} y1={stroke.y} x2={stroke.x + stroke.width} y2={stroke.y} opacity={stroke.opacity} />
        ))}
      </g>
      <g fill="none" stroke="#3b5bff" strokeLinecap="round" strokeWidth="1.6">
        {accent.map((stroke, index) => (
          <line key={index} x1={stroke.x} y1={stroke.y} x2={stroke.x + stroke.width} y2={stroke.y} opacity={stroke.opacity} />
        ))}
      </g>
    </svg>
  );
}
