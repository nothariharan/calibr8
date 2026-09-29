import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { asApiError, postScore, type HomeEvent, type HomeParticipant, type Rubric } from "../api";
import { Empty } from "./Status";
import { TrackGlyph } from "./TrackGlyph";

type Facts = NonNullable<HomeParticipant["facts"]>;

const ANCHORS = [
  ["functionality", "Functionality", "0 does not boot. 3 survives a reload. 5 is solid end to end."],
  ["quality", "Quality", "0 is a façade. 3 has a real path. 5 has validation, errors, and tests."],
  ["innovation", "Innovation", "0 is a generic shell. 3 fits the track. 5 is specific to the problem."],
] as const;

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
    <div className="reel" ref={scrollerRef}>
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
        </p>
      </div>
      {shown.map((project, index) => {
        const position = focusId ? place : index + 1;
        return (
          <section
            className="reel-slide"
            key={project.id}
            data-reel-id={project.id}
            aria-label={`${position} of ${event.participants.length}, ${project.title}`}
          >
            <div className={role === "judge" ? "reel-layout is-judge" : "reel-layout"}>
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
                {project.summary ? <p className="reel-summary">{project.summary}</p> : null}
                <Facts project={project} participants={event.participants} />
                {focusId ? (
                  <p className="reel-neighbors">
                    {previous ? (
                      <Link className="text-link" to={`/dashboard/${event.id}/projects/${previous.id}`}>
                        Previous project
                      </Link>
                    ) : null}
                    {following ? (
                      <Link className="text-link" to={`/dashboard/${event.id}/projects/${following.id}`}>
                        Next project
                      </Link>
                    ) : null}
                  </p>
                ) : null}
              </div>
              {role === "judge" ? (
                <Ballot participant={project} stored={storedId === project.id} onSaved={handleSaved} />
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Facts({ project, participants }: { project: HomeParticipant; participants: HomeParticipant[] }) {
  const facts = readFacts(project);
  if (!facts.scanned) {
    return <p className="reel-scan">No local tree was scanned for this project.</p>;
  }
  if (!hasAnyFact(facts)) {
    return (
      <div className="reel-facts">
        <p className="reel-scan">This tree was scanned. The manifest has no database driver, validator, or test runner.</p>
        <p className="reel-peer">{testRunnerLine(project, participants)}</p>
      </div>
    );
  }
  return (
    <div className="reel-facts">
      <ChipRow label="Database" values={facts.databaseDrivers} />
      <ChipRow label="Validators" values={facts.validators} />
      <ChipRow label="Test runner" values={facts.testRunner ? [facts.testRunner] : []} />
      <ChipRow label="Test files" values={facts.testFiles} />
      <p className="reel-peer">{testRunnerLine(project, participants)}</p>
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

function Ballot({
  participant,
  stored,
  onSaved,
}: {
  participant: HomeParticipant;
  stored: boolean;
  onSaved: (projectId: string) => Promise<void>;
}) {
  const [criteria, setCriteria] = useState<Rubric>(participant.criteria ?? { functionality: 3, quality: 3, innovation: 3 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCriteria(participant.criteria ?? { functionality: 3, quality: 3, innovation: 3 });
  }, [participant.id, participant.criteria]);

  async function save(formEvent: FormEvent) {
    formEvent.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await postScore(participant.id, criteria);
      await onSaved(participant.id);
    } catch (err) {
      setError(asApiError(err).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="reel-ballot" onSubmit={(formEvent) => void save(formEvent)}>
      {ANCHORS.map(([key, label, anchor]) => (
        <fieldset key={key}>
          <legend>{label}</legend>
          <div className="stars" role="group" aria-label={label} aria-describedby={`${participant.id}-${key}-anchor`}>
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
          <p className="reel-anchor" id={`${participant.id}-${key}-anchor`}>
            {anchor}
          </p>
        </fieldset>
      ))}
      {error ? <p className="form-error">{error}</p> : null}
      <button className="btn" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Commit ballot"}
      </button>
      {stored ? <p className="reel-stored">Ballot stored.</p> : null}
    </form>
  );
}
