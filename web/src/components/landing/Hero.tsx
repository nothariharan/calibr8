import { BookOpen, FolderKanban, GitCompare, LayoutGrid, List, Lock, Monitor, Scale, Search, Table } from "lucide-react";
import { Mark } from "../Mark";
import { PROJECT_DATE, PROJECTS } from "./data";
import { AppWindow, Container, Eyebrow, PrimaryButton, SecondaryButton, Streaks, Thumb } from "./ui";

const SIDE = [
  { label: "Projects", icon: FolderKanban, active: true },
  { label: "Standings", icon: Scale, active: false },
  { label: "My Judging", icon: LayoutGrid, active: false },
  { label: "Pair Comparison", icon: GitCompare, active: false },
  { label: "Records", icon: Table, active: false },
  { label: "Documentation", icon: BookOpen, active: false },
];

export function Hero({ start }: { start: string }) {
  return (
    <section className="relative overflow-hidden pb-20 pt-8 lg:pt-6">
      <Streaks className="absolute -right-10 -top-6 w-[420px] opacity-60" />
      <Streaks className="absolute -bottom-16 -right-6 w-[480px] opacity-50" />
      <Container className="relative grid items-center gap-10 lg:grid-cols-[4fr_7fr]">
        <div className="hero-rise">
          <Eyebrow>Evaluation platform for hackathons</Eyebrow>
          <h1 className="mb-5 text-[52px] text-[var(--ink)] sm:text-[64px]">
            Fairer judging
            <br />
            for bigger ideas.
          </h1>
          <p className="mb-8 max-w-[440px] text-[15px] leading-relaxed text-[var(--muted)]">
            calibr8 is an offline, calibration-based evaluation platform that helps you run transparent and
            tamper-evident hackathon judging — on a single machine.
          </p>
          <div className="mb-10 flex flex-wrap gap-3">
            <PrimaryButton to={start}>
              Get started <span aria-hidden="true">→</span>
            </PrimaryButton>
            <SecondaryButton href="#experience">
              <span aria-hidden="true">▷</span> Watch Demo
            </SecondaryButton>
          </div>
          <div className="grid gap-4 border-t border-[var(--line)] pt-8 sm:grid-cols-3">
            <Mini icon="scale" title="Calibrated scoring" body="Separates project quality from judge bias." />
            <Mini icon="lock" title="Tamper-evident" body="Hash chain records for every score." />
            <Mini icon="monitor" title="Runs offline" body="One Docker container. No accounts. No network." />
          </div>
        </div>
        <AppWindow className="hero-rise hero-rise-late">
          <div className="grid min-h-[420px] lg:grid-cols-[130px_minmax(0,1fr)]">
            <aside className="hidden border-r border-[var(--line)] lg:flex lg:flex-col">
              <div className="flex items-center gap-2 px-3 py-3 text-[12px] font-semibold">
                <Mark size={18} />
                calibr8
              </div>
              <nav className="flex flex-col gap-0.5 px-2 text-[11px]" aria-hidden="true">
                {SIDE.map((item) => {
                  const Icon = item.icon;
                  return (
                    <span
                      key={item.label}
                      className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 ${item.active ? "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]" : "text-[var(--muted)]"}`}
                    >
                      <Icon size={12} strokeWidth={1.7} />
                      {item.label}
                    </span>
                  );
                })}
              </nav>
              <div className="mt-auto flex items-center gap-2 border-t border-[var(--line)] px-3 py-3 text-[11px]">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,white)] text-[10px] font-semibold text-[var(--accent)]">
                  J
                </span>
                Judge A
              </div>
            </aside>
            <div className="p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-[var(--ink)]">Projects</p>
                  <p className="text-[11px] text-[var(--muted)]">All submitted projects across tracks.</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]" aria-hidden="true">
                  <span className="flex h-7 items-center gap-1 rounded-md border border-[var(--line)] px-2">
                    <Search size={12} /> Search projects...
                  </span>
                  <span className="flex h-7 items-center rounded-md border border-[var(--line)] px-2">All Tracks</span>
                  <span className="flex h-7 items-center gap-1 rounded-md border border-[var(--line)] px-1.5">
                    <LayoutGrid size={12} />
                    <List size={12} />
                  </span>
                </div>
              </div>
              <div className="hero-cards grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {PROJECTS.map((project) => (
                  <article key={project.name} className="rounded-xl border border-[var(--line)] bg-white p-2.5">
                    <Thumb variant={project.thumb} />
                    <p className="mt-2 w-fit rounded-full bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                      {project.tag}
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-[var(--ink)]">{project.name}</p>
                    <p className="line-clamp-2 text-[11px] leading-snug text-[var(--muted)]">{project.description}</p>
                    <p className="mt-2 flex justify-between text-[10px] text-[var(--muted)]">
                      <span>{project.team}</span>
                      <span>{PROJECT_DATE}</span>
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </AppWindow>
      </Container>
    </section>
  );
}

function Mini({ icon, title, body }: { icon: "scale" | "lock" | "monitor"; title: string; body: string }) {
  return (
    <article className="grid gap-1.5">
      <Icon name={icon} />
      <p className="text-[13px] font-semibold text-[var(--ink)]">{title}</p>
      <p className="text-[12px] leading-snug text-[var(--muted)]">{body}</p>
    </article>
  );
}

function Icon({ name }: { name: "scale" | "lock" | "monitor" }) {
  const common = { size: 18, strokeWidth: 1.7, "aria-hidden": true as const };
  if (name === "scale") return <Scale {...common} />;
  if (name === "lock") return <Lock {...common} />;
  return <Monitor {...common} />;
}
