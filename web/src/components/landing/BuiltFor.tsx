import { Box, GitCompare, Lock, ScanSearch } from "lucide-react";
import { Container, Eyebrow } from "./ui";

const ITEMS = [
  { icon: Box, title: "Offline first", body: "One Docker container. No network required." },
  { icon: Lock, title: "Tamper-evident", body: "Every score is a cryptographic hash chain." },
  { icon: ScanSearch, title: "Rich project context", body: "Auto scans source code, deps, tests and shows real facts." },
  { icon: GitCompare, title: "Pairwise comparison", body: "Compare close projects with a 100-credit voting budget." },
];

export function BuiltFor() {
  return (
    <section id="features" className="border-y border-[var(--line)] bg-[var(--bg)] py-8">
      <Container className="grid items-center gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div data-reveal="up">
          <Eyebrow>Built for real hackathons</Eyebrow>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className={`flex gap-3 ${index > 0 ? "lg:border-l lg:border-[var(--line)] lg:pl-4" : ""}`}
                data-reveal="up"
                style={{ ["--reveal-delay" as string]: `${index * 90}ms` }}
              >
                <Icon size={20} strokeWidth={1.7} aria-hidden="true" className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold">{item.title}</p>
                  <p className="text-[12px] leading-snug text-[var(--muted)]">{item.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
