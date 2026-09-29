import { PROJECT_DATE } from "./data";
import { AppWindow, Container, Eyebrow, PrimaryButton, Thumb, cardShadow } from "./ui";

const SCORES = [
  ["Innovation", 4],
  ["Technical Execution", 5],
  ["Impact", 3],
  ["Presentation", 4],
] as const;

const FILES = ["README.md", "package.json", "src", "Dockerfile"];
const FACTS = [
  ["Dependencies", "zod"],
  ["Test runner", "vitest"],
  ["Database", "better-sqlite3"],
];

export function Experience({ start }: { start: string }) {
  return (
    <section id="experience" className="bg-[var(--peach)] py-20">
      <Container className="grid items-center gap-10 lg:grid-cols-[4fr_7fr]">
        <div data-reveal="up">
          <Eyebrow>A modern judging experience</Eyebrow>
          <h2 className="mb-5 text-[40px] sm:text-[46px]">
            Everything you need,
            <br />
            in one place.
          </h2>
          <p className="mb-8 max-w-[440px] text-[15px] leading-relaxed text-[var(--muted)]">
            Browse projects, read real context, score with a clean interface, compare close entries and see instant
            calibrated standings — all in a fast, offline workspace.
          </p>
          <PrimaryButton href="#features">Explore Features</PrimaryButton>
        </div>
        <div className="relative h-[340px] overflow-hidden" aria-hidden="true">
          <AppWindow path="Standings" className={`absolute left-0 top-10 w-[230px] ${cardShadow}`} reveal="left">
            <div className="p-3 text-[11px]">
              <p className="mb-2 font-semibold">Standings</p>
              <ul className="grid gap-1.5">
                {["Iron Switch", "Salt Ledger", "Dry Relay", "MediTrace"].map((name, index) => (
                  <li key={name} className="flex items-center gap-2">
                    <Thumb variant={index % 2 === 0 ? "burst" : "diamond"} className="h-6 w-8 p-0.5" />
                    <span className="truncate">
                      {index + 1}. {name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </AppWindow>
          <AppWindow path="Pair Comparison" className="absolute right-8 top-6 w-[200px]" reveal="right" delay={80}>
            <div className="p-3 text-[11px]">
              <p className="mb-2 font-semibold">Pair Comparison</p>
              <p className="text-[var(--muted)]">Iron Switch</p>
              <span className="my-2 block h-1.5 rounded-full bg-[color-mix(in_srgb,var(--accent)_25%,white)]">
                <span className="block h-1.5 w-1/2 rounded-full bg-[var(--accent)]" />
              </span>
              <p className="text-[var(--muted)]">Salt Ledger</p>
            </div>
          </AppWindow>
          <AppWindow path="Records" className="absolute -right-6 top-24 w-[180px]" reveal="right" delay={160}>
            <div className="p-3 text-[10px]">
              <p className="mb-2 font-semibold">Records</p>
              <p className="text-[var(--muted)]">score · hash</p>
              <p className="text-[var(--muted)]">score · hash</p>
              <p className="text-[var(--muted)]">chain holds</p>
            </div>
          </AppWindow>
          <AppWindow path="Judge Project" className="absolute left-[12%] top-4 z-10 w-[min(460px,78%)]" reveal="up" delay={120}>
            <div className="grid sm:grid-cols-2">
              <div className="border-b border-[var(--line)] p-3 sm:border-b-0 sm:border-r">
                <p className="text-[14px] font-semibold">Iron Switch</p>
                <p className="mb-2 text-[11px] text-[var(--muted)]">Team Vector · {PROJECT_DATE}</p>
                <ul className="mb-2 grid gap-0.5 text-[11px] text-[var(--muted)]">
                  {FILES.map((file) => (
                    <li key={file}>{file}</li>
                  ))}
                </ul>
                <p className="text-[11px] font-semibold">Fact Scan</p>
                {FACTS.map(([label, value]) => (
                  <p key={label} className="flex justify-between text-[10px] text-[var(--muted)]">
                    <span>{label}</span>
                    <span>{value}</span>
                  </p>
                ))}
                <p className="mt-1 text-[10px] text-[var(--accent)]">View Details</p>
              </div>
              <div className="p-3">
                <p className="mb-2 text-[12px] font-semibold">Your Scores</p>
                {SCORES.map(([label, value]) => (
                  <div key={label} className="mb-1.5">
                    <p className="text-[10px] text-[var(--muted)]">{label}</p>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          className={`grid h-4 w-4 place-items-center rounded-[3px] text-[9px] ${n === value ? "bg-[var(--accent)] text-white" : "border border-[var(--line)]"}`}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                <span className="mb-2 mt-1 block h-8 rounded-md border border-[var(--line)]" />
                <span className="block rounded-md bg-[var(--ink)] py-1.5 text-center text-[11px] text-white">Save Scores</span>
              </div>
            </div>
          </AppWindow>
        </div>
        <span className="sr-only">
          Illustration of standings, a judge score sheet, a pair comparison, and the record chain. Open the workspace to
          score. <a href={start}>Get started</a>
        </span>
      </Container>
    </section>
  );
}
