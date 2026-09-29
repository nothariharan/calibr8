import { Container, Eyebrow, PrimaryButton } from "./ui";

const STEPS = [
  ["01", "Add submissions", "Use the fixture format or import your own."],
  ["02", "Invite judges", "Use predefined roles (Organizer, Judge, Participant)."],
  ["03", "Run judging", "Let judges score and compare projects."],
  ["04", "Export results", "Get a full CSV and a verifiable audit trail."],
];

export function Organizers({ start }: { start: string }) {
  return (
    <section id="organizers" className="bg-[var(--bg)] py-20">
      <Container className="grid items-center gap-10 lg:grid-cols-[2fr_3fr]">
        <div data-reveal="up">
          <Eyebrow>For organizers</Eyebrow>
          <h2 className="mb-5 text-[40px] sm:text-[46px]">
            Run your own hackathon,
            <br />
            with confidence.
          </h2>
          <p className="mb-8 max-w-[440px] text-[15px] leading-relaxed text-[var(--muted)]">
            Single setup, no external services, complete transparency. Share results, export data and verify the entire
            judging process.
          </p>
          <PrimaryButton to={start}>
            Get started <span aria-hidden="true">→</span>
          </PrimaryButton>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([num, title, body], index) => (
            <article
              key={num}
              className={index > 0 ? "lg:border-l lg:border-[var(--line)] lg:pl-4" : ""}
              data-reveal="up"
              style={{ ["--reveal-delay" as string]: `${index * 90}ms` }}
            >
              <p className="numeral mb-3 text-[34px] text-[color-mix(in_srgb,var(--ink)_25%,transparent)]">{num}</p>
              <p className="mb-1 text-[13px] font-semibold">{title}</p>
              <p className="text-[12px] leading-snug text-[var(--muted)]">{body}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
