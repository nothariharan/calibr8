import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  addHackathonParticipant,
  asApiError,
  assignHackathonJudge,
  createHackathon,
  getDashboard,
  getStandings,
  type ApiError,
  type HomeEvent,
  type HomePayload,
  type StandingProject,
} from "../api";
import { JudgeReel } from "../components/JudgeReel";
import { DemoBanner } from "../demo/DemoBanner";
import { usePageTitle } from "../components/Shell";
import { Empty, Loading, Status } from "../components/Status";
import { useSession } from "../session";

function num(value: number | null): string {
  return value == null ? "—" : value.toFixed(2);
}

const ROLE_COPY: Record<string, { eyebrow: string; lede: string }> = {
  judge: {
    eyebrow: "Judge",
    lede: "Open a hackathon and score one project at a time. Standings shows the ranking after calibration. Your ballot is the three scores on the reel.",
  },
  organizer: {
    eyebrow: "Organizer",
    lede: "Set a new hackathon, then add the projects and the judges. Standings rank by the calibrated score. Raw is the average of the ballots. Calibrated is that average after each judge’s tendency to score high or low is removed.",
  },
  participant: {
    eyebrow: "Participant",
    lede: "Open your project to see where it placed and what the judges wrote. The rank uses the calibrated score. The notes are feedback, and they are not part of that score.",
  },
};

export function Dashboard() {
  const { eventId, projectId } = useParams();
  const { session } = useSession();
  usePageTitle(eventId ? "Hackathon" : "Hackathons");
  const [home, setHome] = useState<HomePayload | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function reload() {
    const next = await getDashboard();
    setHome(next);
  }

  useEffect(() => {
    if (!session.ready || !session.signedIn) return;
    let cancel = false;
    getDashboard().then(
      (payload) => {
        if (!cancel) setHome(payload);
      },
      (err: unknown) => {
        if (!cancel) setError(asApiError(err));
      },
    );
    return () => {
      cancel = true;
    };
  }, [session.ready, session.signedIn]);

  if (!session.ready) return <Loading />;
  if (!session.signedIn) return <Navigate to="/signin" replace />;
  if (error) return <Status error={error} />;
  if (!home) return <Loading />;

  const role = session.role ?? "";
  if (!eventId) {
    return (
      <div className="desk">
        <header className="desk-intro">
          <p className="eyebrow">{ROLE_COPY[role]?.eyebrow ?? role}</p>
          <h2>{session.name}</h2>
          <p className="lede">{ROLE_COPY[role]?.lede}</p>
        </header>
        {notice ? <p className="form-error">{notice}</p> : null}
        {role === "organizer" ? (
          <CreateEvent
            onCreated={async () => {
              setNotice(null);
              await reload();
            }}
            onError={(message) => setNotice(message)}
          />
        ) : null}
        <DemoBanner />
        {home.events.length ? (
          <div className="hack-cards">
            {home.events.map((event) => (
              <Link className="hack-card" key={event.id} to={`/dashboard/${event.id}`}>
                <p className={event.closed ? "hack-state is-closed" : "hack-state"}>{event.closed ? "Closed" : "Open"}</p>
                <h2>{event.name}</h2>
                <p>{event.tracks.length ? event.tracks.map((track) => track.name).join(", ") : "No tracks"}</p>
                <p className="muted">
                  {event.participants.length} {event.participants.length === 1 ? "project" : "projects"}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <Empty>
            {role === "participant"
              ? "No hackathon lists this email on a team."
              : "No hackathon is assigned to this account."}
          </Empty>
        )}
      </div>
    );
  }

  const event = home.events.find((item) => item.id === eventId);
  if (!event) return <Empty>This hackathon is not on your account.</Empty>;

  const project = projectId ? event.participants.find((item) => item.id === projectId) : undefined;
  if (projectId) {
    if (!project) return <Empty>This project is not in your hackathon.</Empty>;
    if (role === "judge" || role === "participant") {
      return (
        <div className="desk desk-reel">
          <JudgeReel
            event={event}
            role={role}
            focusId={project.id}
            onSaved={async () => {
              setNotice(null);
              await reload();
            }}
          />
        </div>
      );
    }
    return (
      <div className="desk">
        <p>
          <Link className="text-link" to={`/dashboard/${event.id}`}>
            {event.name}
          </Link>
        </p>
        {notice ? <p className="form-error">{notice}</p> : null}
        <article className="panel stack project-read">
          <p className="eyebrow">{project.track}</p>
          <h2>{project.title}</h2>
          <p className="reel-team">{project.team}</p>
          {project.summary ? (
            <div>
              <p className="reel-label">What the team said it does</p>
              <p>{project.summary}</p>
            </div>
          ) : null}
          <div className="read-scores">
            <div>
              <p className="reel-label">Raw mean</p>
              <p>{num(project.raw)}</p>
              <p className="muted">Average of the ballots on this project.</p>
            </div>
            <div>
              <p className="reel-label">Calibrated</p>
              <p>{num(project.calibrated)}</p>
              <p className="muted">The same ballots after judge leniency is removed. Notes are not in this number.</p>
            </div>
          </div>
          <div>
            <p className="reel-label">What the judges said it is doing</p>
            {project.notes?.length ? (
              <ul className="note-list">
                {project.notes.map((note) => (
                  <li key={`${note.author}-${note.text}`}>
                    <p>{note.author}</p>
                    <p>{note.text}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No note yet.</p>
            )}
          </div>
        </article>
      </div>
    );
  }

  if (role === "judge" || role === "participant") {
    return (
      <div className="desk desk-reel">
        <JudgeReel
          event={event}
          role={role}
          onSaved={async () => {
            setNotice(null);
            await reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="desk">
      <header className="desk-intro">
        <p>
          <Link className="text-link" to="/dashboard">
            All hackathons
          </Link>
        </p>
        <p className="eyebrow">Organizer</p>
        <h2>{event.name}</h2>
        <p className="lede">
          Participants are the projects judges will read one at a time. Standings rank by the calibrated score. A judge’s
          note describes what they think the project is trying to do, and that sentence is not part of the rank.
        </p>
      </header>
      {notice ? <p className="form-error">{notice}</p> : null}
      <EventBlock
        event={event}
        role={role}
        catalogTracks={home.tracks}
        catalogJudges={home.judges}
        onChange={async () => {
          setNotice(null);
          await reload();
        }}
        onError={(message) => setNotice(message)}
      />
      <EventStandings event={event} />
      {home.audit ? <AuditField audit={home.audit} /> : null}
    </div>
  );
}

function EventBlock({
  event,
  role,
  catalogTracks,
  catalogJudges,
  onChange,
  onError,
}: {
  event: HomeEvent;
  role: string;
  catalogTracks: { id: string; name: string }[];
  catalogJudges: { email: string; name: string }[];
  onChange: () => Promise<void>;
  onError: (message: string) => void;
}) {
  return (
    <section className="panel stack">
      <div className="event-head">
        <p className="muted">
          {event.closed ? `Submissions closed ${event.submissionsClose}` : `Submissions open until ${event.submissionsClose}`}
          {event.tracks.length ? ` · ${event.tracks.map((track) => track.name).join(", ")}` : ""}
        </p>
        <p className="count">{event.participants.length} projects</p>
      </div>
      {role === "organizer" && event.judges.length ? (
        <p className="muted">
          Judges: {event.judges.map((judge) => `${judge.name} (${judge.tracks.join(", ") || "no tracks"})`).join(" · ")}
        </p>
      ) : null}
      {event.participants.length ? (
        <div className="table-wrap">
          <table className="roster">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Team</th>
                <th>Track</th>
                {role === "judge" ? <th>Your raw</th> : <th>Raw mean</th>}
                <th>Calibrated</th>
              </tr>
            </thead>
            <tbody>
              {event.participants.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link to={`/dashboard/${event.id}/projects/${row.id}`}>{row.title}</Link>
                    <div className="muted">{row.summary}</div>
                  </td>
                  <td>
                    {row.team}
                    {role === "organizer" ? <div className="muted">{row.emails.join(", ")}</div> : null}
                  </td>
                  <td>{row.track}</td>
                  <td>{num(row.raw)}</td>
                  <td>{num(row.calibrated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No participants in this hackathon yet.</p>
      )}
      {role === "organizer" ? (
        <OrganizerForms
          event={event}
          tracks={catalogTracks}
          judges={catalogJudges}
          onChange={onChange}
          onError={onError}
        />
      ) : null}
    </section>
  );
}

function OrganizerForms({
  event,
  tracks,
  judges,
  onChange,
  onError,
}: {
  event: HomeEvent;
  tracks: { id: string; name: string }[];
  judges: { email: string; name: string }[];
  onChange: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [teamName, setTeamName] = useState("");
  const [emails, setEmails] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? "");
  const [judgeEmail, setJudgeEmail] = useState(judges[0]?.email ?? "");
  const [judgeTracks, setJudgeTracks] = useState<string[]>(tracks[0] ? [tracks[0].id] : []);
  const [pending, setPending] = useState(false);

  async function addPerson(formEvent: FormEvent) {
    formEvent.preventDefault();
    setPending(true);
    try {
      await addHackathonParticipant(event.id, { teamName, emails, title, summary, trackId, repoUrl: "" });
      setTeamName("");
      setEmails("");
      setTitle("");
      setSummary("");
      await onChange();
    } catch (err) {
      onError(asApiError(err).message);
    } finally {
      setPending(false);
    }
  }

  async function assign(formEvent: FormEvent) {
    formEvent.preventDefault();
    setPending(true);
    try {
      await assignHackathonJudge(event.id, judgeEmail, judgeTracks);
      await onChange();
    } catch (err) {
      onError(asApiError(err).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="org-forms">
      <form className="stack" onSubmit={(formEvent) => void addPerson(formEvent)}>
        <h3>Add a participant</h3>
        {event.closed ? (
          <p className="muted">This hackathon is closed. Create another hackathon with a future close time to add people.</p>
        ) : (
          <>
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team name" required />
            <input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="Emails, separated by commas" required />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" required />
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What it does" rows={3} required />
            <select value={trackId} onChange={(e) => setTrackId(e.target.value)}>
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
            <p className="muted">Each new email can sign in. The password is the mailbox name, with dots written as hyphens.</p>
            <button className="btn" type="submit" disabled={pending}>
              Add participant
            </button>
          </>
        )}
      </form>
      <form className="stack" onSubmit={(formEvent) => void assign(formEvent)}>
        <h3>Assign a judge</h3>
        <select value={judgeEmail} onChange={(e) => setJudgeEmail(e.target.value)}>
          {judges.map((judge) => (
            <option key={judge.email} value={judge.email}>
              {judge.name}
            </option>
          ))}
        </select>
        <div className="checks">
          {tracks.map((track) => (
            <label key={track.id}>
              <input
                type="checkbox"
                checked={judgeTracks.includes(track.id)}
                onChange={(e) =>
                  setJudgeTracks((current) =>
                    e.target.checked ? [...current, track.id] : current.filter((id) => id !== track.id),
                  )
                }
              />
              {track.name}
            </label>
          ))}
        </div>
        <button className="btn" type="submit" disabled={pending || !judgeEmail}>
          Save assignment
        </button>
      </form>
    </div>
  );
}

function EventStandings({ event }: { event: HomeEvent }) {
  const [rows, setRows] = useState<StandingProject[] | null>(null);
  const ids = new Set(event.participants.map((row) => row.id));

  useEffect(() => {
    let cancel = false;
    getStandings().then(
      (data) => {
        if (cancel) return;
        const ranked = data.projects
          .filter((project) => ids.has(project.id))
          .sort((a, b) => (b.calibrated ?? 0) - (a.calibrated ?? 0))
          .map((project, index) => ({ ...project, calibratedRank: index + 1 }));
        setRows(ranked);
      },
      () => {
        if (!cancel) setRows([]);
      },
    );
    return () => {
      cancel = true;
    };
  }, [event.id, event.participants]);

  return (
    <section className="panel stack">
      <p className="eyebrow">After the ballots</p>
      <h2>Standings</h2>
      <p className="lede">
        Rank uses the calibrated score. Raw is the average of the 0–5 ballots. Calibrated is that average once each
        judge’s habit of scoring high or low has been taken out. Written notes are not in either column.
      </p>
      {!rows ? (
        <Loading />
      ) : rows.length ? (
        <div className="table-wrap">
          <table className="roster">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Project</th>
                <th>Raw</th>
                <th>Calibrated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.calibratedRank ?? "—"}</td>
                  <td>{row.title}</td>
                  <td>{num(row.rawAvg)}</td>
                  <td>{num(row.calibrated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No calibrated standings for this hackathon yet.</p>
      )}
    </section>
  );
}

function CreateEvent({ onCreated, onError }: { onCreated: () => Promise<void>; onError: (message: string) => void }) {
  const [name, setName] = useState("");
  const [close, setClose] = useState("2026-12-01T18:00");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await createHackathon(name, close.endsWith("Z") ? close : `${close}:00Z`);
      setName("");
      await onCreated();
    } catch (err) {
      onError(asApiError(err).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="panel stack" onSubmit={(event) => void submit(event)}>
      <p className="eyebrow">New event</p>
      <h2>Create a hackathon</h2>
      <p className="lede">A new event starts empty. Participants can be added until the close time, and it is calibrated on its own scored projects.</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hackathon name" required />
      <label>
        Submissions close, UTC
        <input type="datetime-local" value={close} onChange={(e) => setClose(e.target.value)} required />
      </label>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create hackathon"}
      </button>
    </form>
  );
}

function AuditField({ audit }: { audit: HomePayload["audit"] }) {
  if (!audit) return null;
  return (
    <section className="panel audit-field">
      <p className="eyebrow">Integrity</p>
        <h2>Every ballot is on a hash chain.</h2>
        <p className="lede">
          A score hash is SHA-256 of the previous hash, the judge, the project, the criteria, and the raw score. Changing a
          stored score breaks the chain. The written note is kept with the ballot and is not part of that hash.
        </p>
      <dl>
        <div>
          <dt>Score chain</dt>
          <dd>{audit.scoreChainValid ? "Valid" : "Broken"}</dd>
        </div>
        <div>
          <dt>Audit chain</dt>
          <dd>{audit.auditChainValid ? "Valid" : "Broken"}</dd>
        </div>
        <div>
          <dt>Scores</dt>
          <dd>{audit.totalScores}</dd>
        </div>
        <div>
          <dt>Audit rows</dt>
          <dd>{audit.totalAuditEntries}</dd>
        </div>
      </dl>
      {audit.recent.length ? (
        <ol>
          {audit.recent.map((row) => (
            <li key={`${row.timestamp}-${row.hash}`}>
              <span>{row.action}</span>
              <code>{row.hash}</code>
              <em>{row.timestamp}</em>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
