import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  addHackathonParticipant,
  asApiError,
  assignHackathonJudge,
  createHackathon,
  getDashboard,
  getStandings,
  postScore,
  type ApiError,
  type HomeEvent,
  type HomeParticipant,
  type HomePayload,
  type Rubric,
  type StandingProject,
} from "../api";
import { usePageTitle } from "../components/Shell";
import { Empty, Loading, Status } from "../components/Status";
import { useSession } from "../session";

const RUBRIC = [
  ["functionality", "Functionality"],
  ["quality", "Quality"],
  ["innovation", "Innovation"],
] as const;

function num(value: number | null): string {
  return value == null ? "—" : value.toFixed(2);
}

export function Dashboard() {
  const { eventId } = useParams();
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
        <header className="event-head">
          <div>
            <p className="eyebrow">{role}</p>
            <h2>{session.name}</h2>
            <p className="muted">
              {role === "judge"
                ? "Hackathons you are assigned to. Open one to see its projects."
                : role === "organizer"
                  ? "Hackathons you run. Open one to see its participants and standings."
                  : "Hackathons that list your email on a team."}
            </p>
          </div>
        </header>
        {notice ? <p className="form-error">{notice}</p> : null}
        {home.events.length ? (
          <div className="hack-cards">
            {home.events.map((event) => (
              <Link className="hack-card" key={event.id} to={`/dashboard/${event.id}`}>
                <p className="eyebrow">{event.closed ? "Closed" : "Open"}</p>
                <h2>{event.name}</h2>
                <p>{event.tracks.length ? event.tracks.map((track) => track.name).join(", ") : "No tracks assigned"}</p>
                <p className="muted">{event.participants.length} participants</p>
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
        {role === "organizer" ? (
          <CreateEvent
            onCreated={async () => {
              setNotice(null);
              await reload();
            }}
            onError={(message) => setNotice(message)}
          />
        ) : null}
      </div>
    );
  }

  const event = home.events.find((item) => item.id === eventId);
  if (!event) return <Empty>This hackathon is not on your account.</Empty>;

  return (
    <div className="desk">
      <p>
        <Link to="/dashboard">All hackathons</Link>
      </p>
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
      {role === "judge" || role === "organizer" ? <EventStandings event={event} /> : null}
      {role === "organizer" && home.audit ? <AuditField audit={home.audit} /> : null}
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
  const [selected, setSelected] = useState<string | null>(null);
  const open = event.participants.find((row) => row.id === selected) ?? null;

  return (
    <section className="panel stack">
      <div className="event-head">
        <div>
          <h2>{event.name}</h2>
          <p className="muted">
            {event.closed ? `Submissions closed ${event.submissionsClose}` : `Submissions open until ${event.submissionsClose}`}
            {event.tracks.length ? ` · ${event.tracks.map((track) => track.name).join(", ")}` : ""}
          </p>
        </div>
        <p className="count">{event.participants.length} participants</p>
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
                <tr key={row.id} className={selected === row.id ? "on" : ""}>
                  <td>
                    {role === "judge" ? (
                      <button type="button" className="linkish" onClick={() => setSelected(row.id)}>
                        {row.title}
                      </button>
                    ) : (
                      <Link to={`/projects/${row.id}`}>{row.title}</Link>
                    )}
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
      {role === "judge" && open ? (
        <ScoreCard
          participant={open}
          onSaved={async () => {
            await onChange();
          }}
          onError={onError}
        />
      ) : null}
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

function ScoreCard({
  participant,
  onSaved,
  onError,
}: {
  participant: HomeParticipant;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [criteria, setCriteria] = useState<Rubric>(
    participant.criteria ?? { functionality: 3, quality: 3, innovation: 3 },
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCriteria(participant.criteria ?? { functionality: 3, quality: 3, innovation: 3 });
  }, [participant]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await postScore(participant.id, criteria);
      await onSaved();
    } catch (err) {
      onError(asApiError(err).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="score-card" onSubmit={(event) => void save(event)}>
      <strong>{participant.title}</strong>
      <p className="muted">0 is broken. 3 works. 5 is exceptional. The raw score sent to calibration is the mean of the three.</p>
      {RUBRIC.map(([key, label]) => (
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
        </fieldset>
      ))}
      <button className="btn" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Commit ballot"}
      </button>
    </form>
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
      <h2>Standings</h2>
      <p className="muted">Calibrated rank for this hackathon. Raw is the average of the ballots. Calibration is the project score after judge bias is removed.</p>
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
      <h2>Create a hackathon</h2>
      <p className="muted">A new event starts empty. Participants can be added until the close time.</p>
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
      <p className="muted">
        A score hash is SHA-256 of the previous hash, the judge, the project, the criteria, and the raw score. Changing a
        stored score breaks the chain.
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
