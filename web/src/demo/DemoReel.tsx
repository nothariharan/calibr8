import { LayoutGrid } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Mark } from "../components/Mark";
import { useSession } from "../session";
import {
  CRITERIA,
  HACKATHON,
  JUDGES,
  PROJECTS,
  SCORE_WORDS,
  TEST_RUNNER_LINE,
  judgeById,
  projectById,
  type DemoProject,
} from "./data";
import { ballotFor, getDemo, nextUnscored, saveBallot, scoredCount, setJudge, useDemo } from "./store";

type Scores = {
  functionality: number;
  quality: number;
  innovation: number;
};

const DEFAULT_SCORES: Scores = { functionality: 3, quality: 3, innovation: 3 };

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function alignSlide(root: HTMLElement, el: HTMLElement) {
  const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
  root.scrollTo({ top, behavior: scrollBehavior() });
}

function fieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function linksFor(project: DemoProject): { label: string; href: string }[] {
  return [
    { label: "Repository", href: `https://example.org/field/${project.id}` },
    { label: "GitHub", href: `https://github.com/field-demo/${project.id}` },
    { label: "Demo", href: `https://${project.id}.demo.local` },
  ];
}

export function DemoReel() {
  const { judgeId, projectId } = useParams();
  const navigate = useNavigate();
  const { session } = useSession();
  const demo = useDemo();
  const judge = judgeById(judgeId) ?? judgeById(demo.judgeId ?? undefined) ?? JUDGES[0];
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const idsRef = useRef(PROJECTS.map((project) => project.id));
  const aligned = useRef("");
  const [active, setActive] = useState(0);
  const [scrollTo, setScrollTo] = useState<string | null>(null);
  const [storedId, setStoredId] = useState<string | null>(null);

  const place = Math.min(active, PROJECTS.length - 1) + 1;
  const scored = scoredCount(demo, judge.id);
  const back = session.signedIn ? "/dashboard" : "/";

  activeRef.current = active;

  useEffect(() => {
    document.title = `${HACKATHON.name} · calibr8`;
  }, []);

  useEffect(() => {
    setJudge(judge.id);
  }, [judge.id]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const nodes = [...root.querySelectorAll<HTMLElement>("[data-reel-id]")];
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (!visible.length) return;
        visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const index = nodes.indexOf(visible[0].target as HTMLElement);
        if (index >= 0) setActive(index);
      },
      { root, threshold: [0.1, 0.25, 0.5, 0.75] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [judge.id]);

  useEffect(() => {
    if (!projectId || !projectById(projectId)) return;
    const token = `${judge.id}:${projectId}`;
    if (aligned.current === token) return;
    aligned.current = token;
    setScrollTo(projectId);
  }, [judge.id, projectId]);

  useEffect(() => {
    if (!scrollTo) return;
    const root = scrollerRef.current;
    if (!root) return;
    const el = [...root.querySelectorAll<HTMLElement>("[data-reel-id]")].find((node) => node.dataset.reelId === scrollTo);
    if (!el) return;
    const index = PROJECTS.findIndex((project) => project.id === scrollTo);
    if (index >= 0) setActive(index);
    alignSlide(root, el);
    setScrollTo(null);
  }, [scrollTo]);

  useEffect(() => {
    function onKey(eventKey: KeyboardEvent) {
      if (eventKey.metaKey || eventKey.ctrlKey || eventKey.altKey) return;
      if (fieldTarget(eventKey.target)) return;
      const down = eventKey.key === "j" || eventKey.key === "J" || eventKey.key === "ArrowDown";
      const up = eventKey.key === "k" || eventKey.key === "K" || eventKey.key === "ArrowUp";
      if (!down && !up) return;
      eventKey.preventDefault();
      const ids = idsRef.current;
      const index = activeRef.current;
      const nextIndex = index + (down ? 1 : -1);
      const next = ids[nextIndex];
      if (!next) return;
      const root = scrollerRef.current;
      if (!root) return;
      const el = [...root.querySelectorAll<HTMLElement>("[data-reel-id]")].find((node) => node.dataset.reelId === next);
      if (!el) return;
      setActive(nextIndex);
      alignSlide(root, el);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function chooseSeat(id: string) {
    const current = PROJECTS[activeRef.current]?.id ?? PROJECTS[0].id;
    navigate(`/demo/judge/${id}/projects/${current}`);
  }

  function handleSaved(projectId: string) {
    const next = nextUnscored(getDemo(), judge.id, projectId);
    if (next) {
      setStoredId(null);
      setScrollTo(next);
      return;
    }
    setStoredId(projectId);
  }

  return (
    <div className="shell">
      <aside className="side">
        <Link className="brand" to="/">
          <Mark />
          calibr8
        </Link>
        <nav className="side-nav">
          <Link to="/demo" className="on">
            <LayoutGrid size={16} strokeWidth={1.7} aria-hidden="true" />
            Hackathons
          </Link>
        </nav>
        <div className="session-card">
          <p className="eyebrow">{judge.seat}</p>
          <p className="session-label">{judge.name}</p>
          <div className="session-btns" role="group" aria-label="Judge seat">
            {JUDGES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === judge.id ? "on" : ""}
                aria-pressed={item.id === judge.id}
                onClick={() => chooseSeat(item.id)}
              >
                {item.name.split(" ")[0]}
              </button>
            ))}
          </div>
          <p className="muted session-note">Ballots stay in this browser.</p>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <h1>Hackathon</h1>
          <p className="role">{HACKATHON.name}</p>
        </header>
        <div className="workspace-body">
          <div className="desk desk-reel">
            <div className="reel-frame">
              <div className="reel-progress">
                <Link className="text-link reel-back" to={back}>
                  All hackathons
                </Link>
                <p className="reel-event">{HACKATHON.name}</p>
                <p className="reel-progress-count" aria-live="polite">
                  <span>
                    {place} of {PROJECTS.length}
                  </span>
                  <span className="reel-scored">{scored} scored</span>
                </p>
              </div>
              <div className="reel" ref={scrollerRef}>
                {PROJECTS.map((project, index) => (
                  <section
                    className="reel-slide"
                    key={project.id}
                    data-reel-id={project.id}
                    aria-label={`${index + 1} of ${PROJECTS.length}, ${project.title}`}
                  >
                    <ProjectSlide
                      key={`${judge.id}-${project.id}`}
                      project={project}
                      judgeId={judge.id}
                      stored={storedId === project.id}
                      onSaved={handleSaved}
                    />
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectSlide({
  project,
  judgeId,
  stored,
  onSaved,
}: {
  project: DemoProject;
  judgeId: string;
  stored: boolean;
  onSaved: (projectId: string) => void;
}) {
  const demo = useDemo();
  const saved = ballotFor(demo, judgeId, project.id);
  const [criteria, setCriteria] = useState<Scores>(
    saved
      ? { functionality: saved.functionality, quality: saved.quality, innovation: saved.innovation }
      : DEFAULT_SCORES,
  );

  useEffect(() => {
    const ballot = ballotFor(getDemo(), judgeId, project.id);
    setCriteria(
      ballot
        ? { functionality: ballot.functionality, quality: ballot.quality, innovation: ballot.innovation }
        : DEFAULT_SCORES,
    );
  }, [judgeId, project.id, saved?.functionality, saved?.quality, saved?.innovation]);

  function save(formEvent: FormEvent) {
    formEvent.preventDefault();
    saveBallot(judgeId, project.id, { ...criteria, note: "" });
    onSaved(project.id);
  }

  const facts = project.facts;
  const hasFacts = facts.databaseDrivers.length > 0 || facts.validators.length > 0 || facts.testRunner != null || facts.testFiles.length > 0;

  return (
    <form className="reel-layout is-judge" onSubmit={save}>
      <div className="reel-story">
        <div className="reel-identity">
          <div className="reel-glyph">
            <img src={`/demo/${project.id}.png`} alt="" />
          </div>
          <div>
            <p className="reel-kicker">{project.mark}</p>
            <h2>{project.title}</h2>
            <p className="reel-team">{project.team}</p>
          </div>
        </div>
        <div className="reel-block">
          <p className="reel-label">What they claim it is</p>
          <p className="reel-summary">{project.problem}</p>
        </div>
        <div className="reel-block">
          <p className="reel-label">Links on the submission</p>
          <ul className="submission-links">
            {linksFor(project).map((link) => (
              <li key={link.label}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
                <span>{link.href}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="reel-facts">
          <p className="reel-label">From the project tree</p>
          {hasFacts ? (
            <>
              <ChipRow label="Database" values={facts.databaseDrivers} />
              <ChipRow label="Validators" values={facts.validators} />
              <ChipRow label="Test runner" values={facts.testRunner ? [facts.testRunner] : []} />
              <ChipRow label="Test files" values={facts.testFiles} />
            </>
          ) : (
            <p className="reel-scan">This tree was scanned. The manifest has no database driver, validator, or test runner.</p>
          )}
          <p className="reel-peer">{TEST_RUNNER_LINE}</p>
        </div>
      </div>
      <div className="reel-ballot">
        <p className="reel-scale">{SCORE_WORDS.map((word, index) => `${index} ${word.toLowerCase()}`).join(" · ")}</p>
        {CRITERIA.map((item) => (
          <fieldset key={item.id}>
            <legend>{item.label}</legend>
            <div className="stars" role="group" aria-label={item.label}>
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={criteria[item.id] === n}
                  onClick={() => setCriteria((current) => ({ ...current, [item.id]: n }))}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="reel-choice">
              {criteria[item.id]} — {SCORE_WORDS[criteria[item.id]]}
            </p>
          </fieldset>
        ))}
        <button className="btn" type="submit">
          Commit ballot
        </button>
        {stored ? <p className="reel-stored">Ballot stored.</p> : null}
      </div>
    </form>
  );
}

function ChipRow({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div className="reel-chip-row">
      <p>{label}</p>
      <div>
        {values.map((value) => (
          <span className="chip" key={value}>
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}
