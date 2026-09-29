import { Container, Eyebrow, PrimaryButton, Streaks, cardShadow } from "./ui";

const JUDGES = [
  { name: "Judge A", tone: "Generous", tint: "bg-[var(--accent)]" },
  { name: "Judge B", tone: "Neutral", tint: "bg-[#3d9a62]" },
  { name: "Judge C", tone: "Harsh", tint: "bg-[#7a5af5]" },
];

export function Approach() {
  return (
    <section id="approach" className="relative overflow-hidden bg-[var(--lavender)] py-20">
      <Streaks className="absolute -right-8 top-8 w-[360px] opacity-40" />
      <Container className="relative grid items-center gap-10 lg:grid-cols-[2fr_3fr]">
        <div data-reveal="up">
          <Eyebrow>Our approach</Eyebrow>
          <h2 className="mb-5 text-[40px] sm:text-[46px]">
            Separate signal
            <br />
            from bias.
          </h2>
          <p className="mb-8 max-w-[440px] text-[15px] leading-relaxed text-[var(--muted)]">
            We use a statistical calibration model to remove judge harshness or generosity, so the final scores reflect
            project quality, not individual bias.
          </p>
          <PrimaryButton href="#features">
            Learn how it works <span aria-hidden="true">→</span>
          </PrimaryButton>
        </div>
        <div className={`rounded-2xl border border-[var(--line)] bg-white p-5 ${cardShadow}`} data-reveal="right" style={{ ["--reveal-delay" as string]: "80ms" }}>
          <div className="grid items-center gap-4 lg:grid-cols-[150px_70px_140px_28px_minmax(0,1fr)]">
            <div className="grid gap-2">
              {JUDGES.map((judge) => (
                <article key={judge.name} className="flex items-center gap-2 rounded-xl border border-[var(--line)] px-2.5 py-2">
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold text-white ${judge.tint}`}>
                    {judge.name.slice(-1)}
                  </span>
                  <span>
                    <span className="block text-[12px] font-semibold">{judge.name}</span>
                    <span className="block text-[11px] text-[var(--muted)]">{judge.tone}</span>
                  </span>
                </article>
              ))}
            </div>
            <svg viewBox="0 0 70 140" className="hidden h-[140px] w-full lg:block" aria-hidden="true">
              <path d="M4 24 C 36 24, 34 70, 66 70" fill="none" stroke="var(--accent)" strokeWidth="1.2" opacity="0.5" vectorEffect="non-scaling-stroke" />
              <path d="M4 70 H 66" fill="none" stroke="var(--accent)" strokeWidth="1.2" opacity="0.5" />
              <path d="M4 116 C 36 116, 34 70, 66 70" fill="none" stroke="var(--accent)" strokeWidth="1.2" opacity="0.5" />
            </svg>
            <div className="grid h-[88px] place-items-center rounded-xl border border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-3 text-center text-[12px] font-semibold leading-tight text-[var(--accent)]">
              Calibration
              <br />
              Model
            </div>
            <svg viewBox="0 0 28 16" className="hidden w-full lg:block" aria-hidden="true">
              <path d="M1 8 H 20" stroke="var(--accent)" strokeWidth="1.2" />
              <path d="M16 3 L24 8 L16 13" fill="none" stroke="var(--accent)" strokeWidth="1.2" />
            </svg>
            <div className="rounded-xl border border-[var(--line)] p-3">
              <p className="mb-3 text-[12px] font-semibold">Fair Project Scores</p>
              <div className="flex h-16 items-end gap-2" aria-hidden="true">
                {[90, 78, 66, 54, 40].map((height) => (
                  <span key={height} className="w-3 rounded-sm bg-[var(--accent)]" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
