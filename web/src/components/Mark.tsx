export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect x="0.75" y="0.75" width="26.5" height="26.5" rx="8" fill="#f7f7f5" stroke="#171717" strokeWidth="1" />
      <g fill="none" stroke="#171717" strokeLinecap="round" strokeWidth="1.6">
        <line x1="7" y1="9" x2="20" y2="9" />
        <line x1="7" y1="13" x2="16" y2="13" />
        <line x1="7" y1="17" x2="19" y2="17" />
      </g>
      <line x1="7" y1="21" x2="13" y2="21" stroke="#3b5bff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
