import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { asApiError, getStandings, postScore, type HomeEvent, type HomeParticipant, type Rubric } from "../api";
import { Empty } from "./Status";
import { TrackGlyph } from "./TrackGlyph";

type Facts = NonNullable<HomeParticipant["facts"]>;

const ANCHORS = [
  ["functionality", "Functionality"],
  ["quality", "Quality"],
  ["innovation", "Innovation"],
] as const;

const SCORE_WORDS = ["Absent", "Barely there", "Partial", "Works", "Strong", "Done carefully"] as const;

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
}

function submissionLinks(project: HomeParticipant): { label: string; href: string }[] {
  const name = slug(project.title);
  const links = [
    project.repoUrl ? { label: "Repository", href: project.repoUrl } : null,
    { label: "GitHub", href: `https://github.com/harbor-demo/${name}` },
    { label: "Demo", href: `https://${name}.demo.local` },
  ];
  return links.filter((link): link is { label: string; href: string } => link != null);
}

function list(values: string[] | undefined): string[] {
  if (!values) return [];
  return values.map((item) => item.trim()).filter(Boolean);
}

function runner(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readFacts(participant: HomeParticipant): Facts {
  const facts = participant.facts;
  return {
    scanned: facts?.scanned === true,
    databaseDrivers: list(facts?.databaseDrivers),
    validators: list(facts?.validators),
    testRunner: runner(facts?.testRunner),
    testFiles: list(facts?.testFiles),
  };
}

function hasAnyFact(facts: Facts): boolean {
  return (
    facts.databaseDrivers.length > 0 ||
    facts.validators.length > 0 ||
    facts.testRunner != null ||
    facts.testFiles.length > 0
  );
}

function sameTrack(a: HomeParticipant, b: HomeParticipant): boolean {
  if (a.trackId && b.trackId) return a.trackId === b.trackId;
  return a.track === b.track;
}

function testRunnerLine(project: HomeParticipant, participants: HomeParticipant[]): string {
  const scanned = participants.filter((item) => sameTrack(item, project) && readFacts(item).scanned);
  const listed = scanned.filter((item) => readFacts(item).testRunner != null).length;
  const total = scanned.length;
  const track = project.track;
  if (total === 1) return `${listed} of 1 scanned ${track} project lists a test runner.`;
  return `${listed} of ${total} scanned ${track} projects list a test runner.`;
}

function nextUnscored(participants: HomeParticipant[], currentId: string): string | null {
  const index = participants.findIndex((item) => item.id === currentId);
  if (index < 0) return null;
  const later = participants.slice(index + 1).find((item) => item.criteria == null);
  if (later) return later.id;
  const earlier = participants.slice(0, index).find((item) => item.criteria == null);
  return earlier?.id ?? null;
}

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

export function JudgeReel({
  event,
  role,
  focusId,
  onSaved,
}: {
  event: HomeEvent;
  role: "judge" | "participant";
  focusId?: string;
  onSaved: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const idsRef = useRef<string[]>([]);
  const focusRef = useRef(focusId);
  const eventIdRef = useRef(event.id);
  const [active, setActive] = useState(0);
  const [scrollTo, setScrollTo] = useState<string | null>(null);
  const [storedId, setStoredId] = useState<string | null>(null);
  const [ranks, setRanks] = useState<Map<string, number>>(() => new Map());

  const shown = focusId ? event.participants.filter((item) => item.id === focusId) : event.participants;
  const slideKey = shown.map((item) => item.id).join("|");
  const focusIndex = focusId ? event.participants.findIndex((item) => item.id === focusId) : -1;
  const previous = focusIndex > 0 ? event.participants[focusIndex - 1] : null;
  const following =
    focusIndex >= 0 && focusIndex < event.participants.length - 1 ? event.participants[focusIndex + 1] : null;
  const place = focusId ? Math.max(1, focusIndex + 1) : Math.min(active, Math.max(shown.length - 1, 0)) + 1;
  const scored = event.participants.filter((item) => item.criteria != null).length;

  activeRef.current = active;
  idsRef.current = event.participants.map((item) => item.id);
  focusRef.current = focusId;
  eventIdRef.current = event.id;

  useEffect(() => {
    setActive(0);
  }, [event.id, focusId]);

  useEffect(() => {
    if (role === "judge") return;
    let cancel = false;
    getStandings()
      .then((data) => {
        if (cancel) return;
        setRanks(new Map(data.projects.flatMap((project) => (project.calibratedRank == null ? [] : [[project.id, project.calibratedRank]]))));
      })
      .catch(() => {
        if (!cancel) setRanks(new Map());
      });
    return () => {
      cancel = true;
    };
  }, [role, event.id]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || focusId) return;
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
  }, [focusId, slideKey]);

  useEffect(() => {
    if (!scrollTo || focusId) return;
    const root = scrollerRef.current;
    if (!root) return;
    const el = [...root.querySelectorAll<HTMLElement>("[data-reel-id]")].find((node) => node.dataset.reelId === scrollTo);
    if (!el) return;
    const index = event.participants.findIndex((item) => item.id === scrollTo);
    if (index >= 0) setActive(index);
    alignSlide(root, el);
    setScrollTo(null);
  }, [scrollTo, focusId, slideKey, event.participants]);

  useEffect(() => {
    function onKey(eventKey: KeyboardEvent) {
      if (eventKey.metaKey || eventKey.ctrlKey || eventKey.altKey) return;
      if (fieldTarget(eventKey.target)) return;
      const down = eventKey.key === "j" || eventKey.key === "J" || eventKey.key === "ArrowDown";
      const up = eventKey.key === "k" || eventKey.key === "K" || eventKey.key === "ArrowUp";
      if (!down && !up) return;
      eventKey.preventDefault();
      const ids = idsRef.current;
      const currentId = focusRef.current ?? ids[activeRef.current];
      const index = ids.indexOf(currentId ?? "");
      if (index < 0) return;
      const nextIndex = index + (down ? 1 : -1);
      const next = ids[nextIndex];
      if (!next) return;
      if (focusRef.current) {
        navigate(`/dashboard/${eventIdRef.current}/projects/${next}`);
        return;
      }
      const root = scrollerRef.current;
      if (!root) return;
      const el = [...root.querySelectorAll<HTMLElement>("[data-reel-id]")].find((node) => node.dataset.reelId === next);
      if (!el) return;
      setActive(nextIndex);
      alignSlide(root, el);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  async function handleSaved(projectId: string) {
    const nextId = nextUnscored(event.participants, projectId);
    await onSaved();
    if (nextId) {
      setStoredId(null);
      if (focusId) navigate(`/dashboard/${event.id}/projects/${nextId}`);
      else setScrollTo(nextId);
      return;
    }
    setStoredId(projectId);
  }

  if (!shown.length) {
    return (
      <div className="reel-empty">
        <p>
          <Link className="text-link" to="/dashboard">
            All hackathons
          </Link>
        </p>
        <Empty>No projects in this hackathon.</Empty>
      </div>
    );
  }

  return (
    <div className="reel-frame">
      <div className="reel-progress">
        <Link className="text-link reel-back" to="/dashboard">
          All hackathons
        </Link>
        <p className="reel-event">{event.name}</p>
        <p className="reel-progress-count" aria-live="polite">
          <span>
            {place} of {event.participants.length}
          </span>
          {role === "judge" ? <span className="reel-scored">{scored} scored</span> : null}
          <Link className="text-link" to="/standings">
            Standings
          </Link>
        </p>
      </div>
      <div className="reel" ref={scrollerRef}>
      {shown.map((project, index) => {
        const position = focusId ? place : index + 1;
        return (
          <section
            className="reel-slide"
            key={project.id}
            data-reel-id={project.id}
            aria-label={`${position} of ${event.participants.length}, ${project.title}`}
          >
            <ProjectPane
              project={project}
              participants={event.participants}
              role={role}
              eventId={event.id}
              previousId={previous?.id}
              followingId={following?.id}
              focusId={focusId}
              stored={storedId === project.id}
              rank={ranks.get(project.id) ?? null}
              onSaved={handleSaved}
            />
          </section>
        );
      })}
      </div>
    </div>
  );
}

function Facts({ project, participants }: { project: HomeParticipant; participants: HomeParticipant[] }) {
  const facts = readFacts(project);
  if (!facts.scanned) {
    return (
      <div className="reel-block">
        <p className="reel-label">From the project tree</p>
        <p className="reel-scan">No local tree was scanned. The claim above is the team’s own description.</p>
      </div>
    );
  }
  if (!hasAnyFact(facts)) {
    return (
      <div className="reel-facts">
        <p className="reel-label">From the project tree</p>
        <p className="reel-scan">This tree was scanned. The manifest has no database driver, validator, or test runner.</p>
        <p className="reel-peer">{testRunnerLine(project, participants)}</p>
      </div>
    );
  }
  return (
    <div className="reel-facts">
      <p className="reel-label">From the project tree</p>
      <ChipRow label="Database" values={facts.databaseDrivers} />
      <ChipRow label="Validators" values={facts.validators} />
      <ChipRow label="Test runner" values={facts.testRunner ? [facts.testRunner] : []} />
      <ChipRow label="Test files" values={facts.testFiles} />
      <p className="reel-peer">{testRunnerLine(project, participants)}</p>
    </div>
  );
}

function ResultPane({ project, rank }: { project: HomeParticipant; rank: number | null }) {
  const notes = project.notes ?? [];
  return (
    <div className="reel-ballot">
      <p className="reel-label">How this project placed</p>
      <p className="reel-scale">Rank uses the calibrated score. Feedback is what the judges wrote. It is not part of the rank.</p>
      <div className="read-scores result-figures">
        <div>
          <p className="reel-label">Rank</p>
          <p>{rank ?? "—"}</p>
        </div>
        <div>
          <p className="reel-label">Raw</p>
          <p>{project.raw == null ? "—" : project.raw.toFixed(2)}</p>
        </div>
        <div>
          <p className="reel-label">Calibrated</p>
          <p>{project.calibrated == null ? "—" : project.calibrated.toFixed(2)}</p>
        </div>
      </div>
      <div>
        <p className="reel-label">Feedback</p>
        {notes.length ? (
          <ul className="note-list">
            {notes.map((note) => (
              <li key={`${note.author}-${note.text}`}>
                <p>{note.author}</p>
                <p>{note.text}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No written feedback yet.</p>
        )}
      </div>
    </div>
  );
}

function ChipRow({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div className="reel-chip-row">
      <p>{label}</p>
      <div>
        {values.map((value, index) => (
          <span className="chip" key={`${value}-${index}`}>
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProjectPane({
  project,
  participants,
  role,
  eventId,
  previousId,
  followingId,
  focusId,
  stored,
  rank,
  onSaved,
}: {
  project: HomeParticipant;
  participants: HomeParticipant[];
  role: "judge" | "participant";
  eventId: string;
  previousId?: string;
  followingId?: string;
  focusId?: string;
  stored: boolean;
  rank: number | null;
  onSaved: (projectId: string) => Promise<void>;
}) {
  const [criteria, setCriteria] = useState<Rubric>(project.criteria ?? { functionality: 3, quality: 3, innovation: 3 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const links = submissionLinks(project);

  useEffect(() => {
    setCriteria(project.criteria ?? { functionality: 3, quality: 3, innovation: 3 });
  }, [project.id, project.criteria]);

  async function save(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (role !== "judge") return;
    setSaving(true);
    setError(null);
    try {
      await postScore(project.id, criteria, project.note ?? "");
      await onSaved(project.id);
    } catch (err) {
      setError(asApiError(err).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="reel-layout is-judge" onSubmit={(formEvent) => void save(formEvent)}>
      <div className="reel-story">
        <div className="reel-identity">
          <div className="reel-glyph">
            <TrackGlyph track={project.track} />
          </div>
          <div>
            <p className="reel-kicker">{project.track}</p>
            <h2>{project.title}</h2>
            <p className="reel-team">{project.team}</p>
          </div>
        </div>
        {project.summary ? (
          <div className="reel-block">
            <p className="reel-label">What they claim it is</p>
            <p className="reel-summary">{project.summary}</p>
          </div>
        ) : null}
        <div className="reel-block">
          <p className="reel-label">Links on the submission</p>
          <ul className="submission-links">
            {links.map((link) => (
              <li key={link.label}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
                <span>{link.href}</span>
              </li>
            ))}
          </ul>
        </div>
        <Facts project={project} participants={participants} />
        {focusId ? (
          <p className="reel-neighbors">
            {previousId ? (
              <Link className="text-link" to={`/dashboard/${eventId}/projects/${previousId}`}>
                Previous project
              </Link>
            ) : null}
            {followingId ? (
              <Link className="text-link" to={`/dashboard/${eventId}/projects/${followingId}`}>
                Next project
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>
      {role === "judge" ? (
        <div className="reel-ballot">
          <p className="reel-scale">
            {SCORE_WORDS.map((word, index) => `${index} ${word.toLowerCase()}`).join(" · ")}
          </p>
          {ANCHORS.map(([key, label]) => (
            <fieldset key={key}>
              <legend>{label}</legend>
              <div className="stars" role="group" aria-label={label}>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={criteria[key] === n}
                    onClick={() => setCriteria((current) => ({ ...current, [key]: n }))}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="reel-choice">
                {criteria[key]} — {SCORE_WORDS[criteria[key]]}
              </p>
            </fieldset>
          ))}
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Commit ballot"}
          </button>
          {stored ? <p className="reel-stored">Ballot stored.</p> : null}
        </div>
      ) : (
        <ResultPane project={project} rank={rank} />
      )}
    </form>
  );
}

