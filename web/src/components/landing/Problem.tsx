import { Container, Eyebrow } from "./ui";

const NOTES = [
  { name: "Judge A", quote: "This is a 5/5. Amazing project!", tint: "bg-[var(--accent)]" },
  { name: "Judge B", quote: "3/5. It's okay.", tint: "bg-[#3d9a62]" },
  { name: "Judge C", quote: "1/5. Not sure about this.", tint: "bg-[#7a5af5]" },
];

export function Problem() {
  return (
    <section id="problem" className="border-t border-[var(--line)] bg-[var(--bg)] py-20">
      <Container className="grid items-center gap-10 lg:grid-cols-[4fr_7fr]">
        <div data-reveal="up">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mb-5 text-[40px] text-[var(--ink)] sm:text-[46px]">
            Most hackathon
            <br />
            judging is inconsistent.
          </h2>
          <p className="max-w-[440px] text-[15px] leading-relaxed text-[var(--muted)]">
            Different judges, different standards. Great projects get overlooked, and scoring is hard to trust. We built
            calibr8 to make judging fair, transparent and verifiable.
          </p>
        </div>
        <div className="relative h-[280px]">
          {NOTES.map((note, index) => (
            <article
              key={note.name}
              className="absolute w-[230px] rounded-xl border border-[var(--line)] bg-white p-3 shadow-[0_1px_2px_rgba(20,20,40,.04),0_12px_32px_-12px_rgba(20,20,60,.14)]"
              data-reveal="left"
              style={{ top: 18 + index * 58, left: 8 + index * 36, zIndex: index + 1, ["--reveal-delay" as string]: `${index * 120}ms` }}
            >
              <header className="mb-1 flex items-center gap-2 text-[12px] font-semibold">
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] text-white ${note.tint}`}>
                  {note.name.slice(-1)}
                </span>
                {note.name}
              </header>
              <p className="text-[12px] leading-snug text-[var(--muted)]">{note.quote}</p>
            </article>
          ))}
          <aside className="absolute right-0 top-8 w-[210px] rounded-2xl bg-[var(--lavender)] p-4" data-reveal="right" style={{ ["--reveal-delay" as string]: "180ms" }}>
            <p className="mb-3 text-[12px] font-semibold">With Calibration</p>
            <div className="mb-3 grid grid-cols-4 gap-3" aria-hidden="true">
              {[0, 1, 2, 3].map((item) => (
                <span key={item} className="relative h-24 rounded-full bg-white">
                  <span className="absolute left-1/2 top-[38%] h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-[var(--accent)]" />
                </span>
              ))}
            </div>
            <p className="text-[11px] leading-snug text-[var(--muted)]">Different standards. Same fair results.</p>
          </aside>
          <svg className="pointer-events-none absolute right-[180px] top-16 hidden h-16 w-24 lg:block" viewBox="0 0 96 64" aria-hidden="true">
            <path d="M8 48 C 30 48, 40 16, 88 18" fill="none" stroke="var(--accent)" strokeWidth="1.2" opacity="0.7" />
            <path d="M80 12 L88 18 L78 22" fill="none" stroke="var(--accent)" strokeWidth="1.2" opacity="0.7" />
          </svg>
        </div>
      </Container>
    </section>
  );
}
