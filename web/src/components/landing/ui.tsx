import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";

export const cardShadow =
  "shadow-[0_1px_2px_rgba(20,20,40,.04),0_12px_32px_-12px_rgba(20,20,60,.14)]";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
      <span className="h-0.5 w-6 bg-[var(--accent)]" aria-hidden="true" />
      {children}
    </p>
  );
}

const buttonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--accent)]";

export function PrimaryButton({
  children,
  to,
  href,
}: {
  children: ReactNode;
  to?: string;
  href?: string;
}) {
  const className = `${buttonClass} is-primary bg-[var(--ink)] text-white hover:bg-black`;
  if (to) {
    return (
      <Link className={className} to={to}>
        {children}
      </Link>
    );
  }
  return (
    <a className={className} href={href ?? "#"}>
      {children}
    </a>
  );
}

export function SecondaryButton({ children, href }: { children: ReactNode; href: string }) {
  return (
    <a
      className={`${buttonClass} border border-[color-mix(in_srgb,var(--ink)_20%,transparent)] bg-white/60 text-[var(--ink)] hover:bg-white`}
      href={href}
    >
      {children}
    </a>
  );
}

export function AppWindow({
  path,
  children,
  className = "",
  reveal,
  delay = 0,
}: {
  path?: string;
  children: ReactNode;
  className?: string;
  reveal?: "up" | "left" | "right";
  delay?: number;
}) {
  const motion = reveal
    ? { "data-reveal": reveal, style: { "--reveal-delay": `${delay}ms` } as CSSProperties }
    : {};
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--white)] ${cardShadow} ${className}`}
      {...motion}
    >
      <div className="flex h-10 items-center gap-2 border-b border-[var(--line)] px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" aria-hidden="true" />
        {path ? (
          <span className="ml-2 rounded-full bg-[#f3f2ef] px-2.5 py-0.5 text-[11px] text-[var(--muted)]">{path}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

const THUMBS = ["burst", "diamond", "ring", "cross", "triangle", "bars"] as const;
export type ThumbVariant = (typeof THUMBS)[number];

export function Thumb({ variant, className = "" }: { variant: ThumbVariant; className?: string }) {
  const count = 22;
  const widths = Array.from({ length: count }, (_, index) => {
    const y = (index / (count - 1)) * 2 - 1;
    if (variant === "burst") return 0.28 + 0.62 * Math.abs(Math.sin(index * 0.85));
    if (variant === "diamond") return Math.max(0.16, 1 - Math.abs(y));
    if (variant === "ring") return Math.max(0.16, Math.sqrt(Math.max(0, 1 - y * y)));
    if (variant === "cross") return Math.abs(y) < 0.18 ? 1 : 0.22;
    if (variant === "triangle") return 0.18 + (index / (count - 1)) * 0.82;
    return 0.22 + 0.7 * Math.abs(Math.cos(index * 1.35));
  });
  return (
    <div className={`h-[70px] rounded-md bg-[#f6f5f2] p-1.5 ${className}`} aria-hidden="true">
      <svg viewBox="0 0 100 22" className="h-full w-full" preserveAspectRatio="none">
        {widths.map((width, index) => (
          <line
            key={index}
            x1={50 - width * 46}
            x2={50 + width * 46}
            y1={index + 0.5}
            y2={index + 0.5}
            stroke="var(--accent)"
            strokeWidth="0.72"
            strokeLinecap="round"
            opacity="0.85"
          />
        ))}
      </svg>
    </div>
  );
}

export function Streaks({ className = "" }: { className?: string }) {
  return (
    <img
      src="/hero-hatch.png"
      alt=""
      aria-hidden="true"
      className={`streak-drift pointer-events-none hidden select-none lg:block ${className}`}
    />
  );
}
