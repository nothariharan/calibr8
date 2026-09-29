import { randomBytes } from "node:crypto";
import { fixturePassword, hashPassword } from "../auth.js";
import { db } from "../db/index.js";
import { appendAudit, verifyDatabase } from "./audit.js";

export const RUBRIC = ["functionality", "quality", "innovation"] as const;
export type RubricName = (typeof RUBRIC)[number];
export type Rubric = Record<RubricName, number>;

export type HomeFacts = {
  scanned: boolean;
  databaseDrivers: string[];
  validators: string[];
  testRunner: string | null;
  testFiles: string[];
};

export type HomeParticipant = {
  id: string;
  title: string;
  summary: string;
  team: string;
  track: string;
  trackId: string;
  emails: string[];
  facts: HomeFacts;
  criteria: Rubric | null;
  raw: number | null;
  calibrated: number | null;
};

export type HomeJudge = {
  email: string;
  name: string;
  tracks: string[];
};

export type HomeEvent = {
  id: string;
  name: string;
  submissionsClose: string;
  closed: boolean;
  tracks: { id: string; name: string }[];
  judges: HomeJudge[];
  participants: HomeParticipant[];
};

export type HomeAudit = {
  verified: boolean;
  scoreChainValid: boolean;
  auditChainValid: boolean;
  totalScores: number;
  totalAuditEntries: number;
  recent: { actorId: string; action: string; hash: string; timestamp: string }[];
};

export type HomePayload = {
  role: string;
  tracks: { id: string; name: string }[];
  judges: { email: string; name: string }[];
  events: HomeEvent[];
  audit: HomeAudit | null;
};

type ProjectRow = {
  id: string;
  event_id: string;
  title: string;
  summary: string;
  track_id: string;
  track: string;
  team: string;
  members_json: string;
  facts_json: string;
};

type ScoreRow = {
  project_id: string;
  judge_id: string;
  criteria_json: string;
  raw_score: number;
  normalized_score: number;
};

export function rubricFromBody(body: { criteria?: unknown; stars?: unknown }): Rubric | null {
  if (body.criteria && typeof body.criteria === "object") {
    const raw = body.criteria as Record<string, unknown>;
    const out = {} as Rubric;
    for (const name of RUBRIC) {
      const value = raw[name];
      if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 5) return null;
      out[name] = value as number;
    }
    return out;
  }
  if (Number.isInteger(body.stars) && (body.stars as number) >= 0 && (body.stars as number) <= 5) {
    const stars = body.stars as number;
    return { functionality: stars, quality: stars, innovation: stars };
  }
  return null;
}

export function rubricMean(criteria: Rubric): number {
  return RUBRIC.reduce((sum, name) => sum + criteria[name], 0) / RUBRIC.length;
}

function readRubric(json: string | null): Rubric | null {
  if (!json) return null;
  try {
    const value = JSON.parse(json) as Record<string, unknown>;
    const out = {} as Rubric;
    for (const name of RUBRIC) {
      const n = value[name];
      if (!Number.isInteger(n)) return null;
      out[name] = n as number;
    }
    return out;
  } catch {
    return null;
  }
}

function parseStringList(json: string): string[] {
  try {
    const value = JSON.parse(json) as unknown;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function readFacts(json: string | null | undefined): HomeFacts {
  const empty: HomeFacts = { scanned: false, databaseDrivers: [], validators: [], testRunner: null, testFiles: [] };
  if (!json) return empty;
  try {
    const value = JSON.parse(json) as Record<string, unknown>;
    const strings = (key: string): string[] => {
      const raw = value[key];
      return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : [];
    };
    const runner = value.testRunner;
    return {
      scanned: value.scanned === true,
      databaseDrivers: strings("databaseDrivers"),
      validators: strings("validators"),
      testRunner: typeof runner === "string" ? runner : null,
      testFiles: strings("testFiles"),
    };
  } catch {
    return empty;
  }
}

function closedAt(iso: string): boolean {
  const time = Date.parse(iso);
  return Number.isNaN(time) || time <= Date.now();
}

function freshId(prefix: string, exists: (id: string) => boolean): string {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const id = `${prefix}_${randomBytes(4).toString("hex")}`;
    if (!exists(id)) return id;
  }
  throw new Error("could not allocate an id");
}

export function assignmentLabel(userId: string, role: string): string | null {
  if (role === "organizer") {
    const events = db.prepare("SELECT name FROM events ORDER BY rowid").all() as { name: string }[];
    if (events.length === 1) return events[0].name;
    return events.length ? `${events.length} hackathons` : null;
  }
  if (role === "judge") {
    const rows = db
      .prepare(
        `SELECT e.name FROM judge_assignments a JOIN events e ON e.id = a.event_id
         WHERE a.judge_id = ? ORDER BY e.rowid`,
      )
      .all(userId) as { name: string }[];
    return rows.map((row) => row.name).join(", ") || null;
  }
  const user = db.prepare("SELECT email FROM users WHERE id = ?").get(userId) as { email: string } | undefined;
  const email = (user?.email ?? "").toLowerCase();
  if (!email) return null;
  const teams = db.prepare("SELECT members_json FROM teams").all() as { members_json: string }[];
  const memberTeams = new Set(
    teams
      .filter((team) => parseStringList(team.members_json).some((member) => member.toLowerCase() === email))
      .map((team) => team.members_json),
  );
  if (!memberTeams.size) return null;
  const projects = db
    .prepare(
      `SELECT e.name, tm.members_json FROM projects p
       JOIN events e ON e.id = p.event_id JOIN teams tm ON tm.id = p.team_id`,
    )
    .all() as { name: string; members_json: string }[];
  const names = [
    ...new Set(
      projects
        .filter((project) => parseStringList(project.members_json).some((member) => member.toLowerCase() === email))
        .map((project) => project.name),
    ),
  ];
  return names.join(", ") || null;
}

export function judgeCovers(judgeId: string, eventId: string, trackId: string): boolean {
  const row = db
    .prepare("SELECT tracks_json FROM judge_assignments WHERE event_id = ? AND judge_id = ?")
    .get(eventId, judgeId) as { tracks_json: string } | undefined;
  if (!row) return false;
  return parseStringList(row.tracks_json).includes(trackId);
}

export function loadHome(userId: string, role: string): HomePayload {
  const user = db.prepare("SELECT email FROM users WHERE id = ?").get(userId) as { email: string } | undefined;
  const email = (user?.email ?? "").toLowerCase();
  const allTracks = db.prepare("SELECT id, name FROM tracks ORDER BY name").all() as { id: string; name: string }[];
  const trackName = new Map(allTracks.map((track) => [track.id, track.name]));
  const events = db
    .prepare("SELECT id, name, submissions_close FROM events ORDER BY rowid")
    .all() as { id: string; name: string; submissions_close: string }[];
  const assignments = db
    .prepare("SELECT event_id, judge_id, tracks_json FROM judge_assignments")
    .all() as { event_id: string; judge_id: string; tracks_json: string }[];
  const judges = db
    .prepare("SELECT id, email, name FROM users WHERE role = 'judge' ORDER BY name")
    .all() as { id: string; email: string; name: string }[];
  const judgeById = new Map(judges.map((judge) => [judge.id, judge]));
  const projects = db
    .prepare(
      `SELECT p.id, p.event_id, p.title, p.summary, p.track_id, p.facts_json, t.name AS track, tm.name AS team, tm.members_json
       FROM projects p
       JOIN tracks t ON t.id = p.track_id
       JOIN teams tm ON tm.id = p.team_id
       ORDER BY p.title`,
    )
    .all() as ProjectRow[];
  const scores = db
    .prepare("SELECT project_id, judge_id, criteria_json, raw_score, normalized_score FROM scores")
    .all() as ScoreRow[];

  const homeEvents: HomeEvent[] = events.map((event) => {
    const eventAssignments = assignments.filter((row) => row.event_id === event.id);
    const myTracks = new Set(
      eventAssignments
        .filter((row) => row.judge_id === userId)
        .flatMap((row) => parseStringList(row.tracks_json)),
    );
    const eventProjects = projects.filter((project) => {
      if (project.event_id !== event.id) return false;
      if (role === "judge") return myTracks.has(project.track_id);
      if (role === "participant") return parseStringList(project.members_json).some((member) => member.toLowerCase() === email);
      return role === "organizer";
    });
    const assignedTracks =
      role === "judge"
        ? allTracks.filter((track) => myTracks.has(track.id))
        : allTracks;
    return {
      id: event.id,
      name: event.name,
      submissionsClose: event.submissions_close,
      closed: closedAt(event.submissions_close),
      tracks: assignedTracks,
      judges: eventAssignments.map((row) => {
        const judge = judgeById.get(row.judge_id);
        return {
          email: judge?.email ?? row.judge_id,
          name: judge?.name ?? row.judge_id,
          tracks: parseStringList(row.tracks_json).map((id) => trackName.get(id) ?? id),
        };
      }),
      participants: eventProjects.map((project) => {
        const projectScores = scores.filter((score) => score.project_id === project.id);
        const own = projectScores.find((score) => score.judge_id === userId);
        const rawPool = role === "judge" ? (own ? [own] : []) : projectScores;
        const calibrated = projectScores.find((score) => Number.isFinite(score.normalized_score))?.normalized_score ?? null;
        return {
          id: project.id,
          title: project.title,
          summary: project.summary,
          team: project.team,
          track: project.track,
          trackId: project.track_id,
          emails: parseStringList(project.members_json),
          facts: readFacts(project.facts_json),
          criteria: role === "judge" && own ? readRubric(own.criteria_json) : null,
          raw: rawPool.length ? rawPool.reduce((sum, score) => sum + score.raw_score, 0) / rawPool.length : null,
          calibrated,
        };
      }),
    };
  });

  const visible = homeEvents
    .filter((event) => {
      if (role === "organizer") return true;
      if (role === "judge") return event.tracks.length > 0;
      return event.participants.length > 0;
    })
    .sort((a, b) => Number(a.closed) - Number(b.closed));

  const chain = role === "participant" ? null : verifyDatabase();
  const recent =
    role === "organizer"
      ? (db
          .prepare("SELECT actor_id, action, hash, timestamp FROM audit_log ORDER BY id DESC LIMIT 6")
          .all() as { actor_id: string; action: string; hash: string; timestamp: string }[])
      : [];

  return {
    role,
    tracks: allTracks,
    judges: role === "organizer" ? judges.map((judge) => ({ email: judge.email, name: judge.name })) : [],
    events: visible,
    audit: chain
      ? {
          ...chain,
          recent: recent.map((row) => ({
            actorId: row.actor_id,
            action: row.action,
            hash: row.hash.slice(0, 12),
            timestamp: row.timestamp,
          })),
        }
      : null,
  };
}

export function createEvent(actorId: string, name: string, submissionsClose: string): { id: string } | { error: string } {
  const title = name.trim();
  if (title.length < 2 || title.length > 80) return { error: "Name the hackathon in 2 to 80 characters." };
  if (Number.isNaN(Date.parse(submissionsClose))) return { error: "Submissions close needs a real date." };
  const id = freshId("evt", (candidate) => Boolean(db.prepare("SELECT id FROM events WHERE id = ?").get(candidate)));
  db.prepare("INSERT INTO events (id, name, submissions_close) VALUES (?, ?, ?)").run(id, title, submissionsClose);
  appendAudit(actorId, "EVENT_CREATED", { eventId: id, name: title, submissionsClose });
  return { id };
}

export function addParticipant(
  actorId: string,
  eventId: string,
  input: { teamName: string; emails: string[]; title: string; summary: string; trackId: string; repoUrl: string },
): { id: string } | { error: string } {
  const event = db.prepare("SELECT id, submissions_close FROM events WHERE id = ?").get(eventId) as
    | { id: string; submissions_close: string }
    | undefined;
  if (!event) return { error: "Hackathon not found." };
  if (closedAt(event.submissions_close)) {
    return { error: `Submissions closed at ${event.submissions_close}.` };
  }
  const teamName = input.teamName.trim();
  const title = input.title.trim();
  const summary = input.summary.trim();
  const emails = [...new Set(input.emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (teamName.length < 2) return { error: "Team name is required." };
  if (title.length < 2) return { error: "Project title is required." };
  if (!summary) return { error: "Summary is required." };
  if (!emails.length || emails.some((email) => !email.includes("@") || email.includes(" "))) {
    return { error: "Add at least one participant email." };
  }
  const track = db.prepare("SELECT id FROM tracks WHERE id = ?").get(input.trackId);
  if (!track) return { error: "Pick a track." };

  const teamId = freshId("tm", (candidate) => Boolean(db.prepare("SELECT id FROM teams WHERE id = ?").get(candidate)));
  const projectId = freshId("prj", (candidate) => Boolean(db.prepare("SELECT id FROM projects WHERE id = ?").get(candidate)));
  const insertUser = db.prepare(
    "INSERT INTO users (id, email, name, role, tracks_json, password_hash) VALUES (?, ?, ?, 'participant', '[]', ?)",
  );
  const insertSession = db.prepare("INSERT INTO sessions (token, user_id, role) VALUES (?, ?, 'participant')");

  const write = db.transaction(() => {
    for (const email of emails) {
      const existing = db.prepare("SELECT id, role FROM users WHERE lower(email) = ?").get(email) as
        | { id: string; role: string }
        | undefined;
      if (existing && existing.role !== "participant") {
        throw new Error(`${email} already belongs to a ${existing.role}.`);
      }
      if (!existing) {
        const userId = freshId("usr", (candidate) => Boolean(db.prepare("SELECT id FROM users WHERE id = ?").get(candidate)));
        const local = email.split("@")[0] ?? email;
        insertUser.run(userId, email, local, hashPassword(fixturePassword(email), email));
        insertSession.run(`sess_${userId}`, userId);
      }
    }
    db.prepare("INSERT INTO teams (id, name, members_json) VALUES (?, ?, ?)").run(teamId, teamName, JSON.stringify(emails));
    db.prepare(
      `INSERT INTO projects (id, event_id, team_id, track_id, title, summary, repo_url, submitted_at, facts_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}')`,
    ).run(projectId, eventId, teamId, input.trackId, title, summary, input.repoUrl.trim() || "https://example.invalid/repo", new Date().toISOString());
  });

  try {
    write();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not add the participant." };
  }
  appendAudit(actorId, "PARTICIPANT_ADDED", { eventId, projectId, title, emails });
  return { id: projectId };
}

export function assignJudge(
  actorId: string,
  eventId: string,
  email: string,
  trackIds: string[],
): { ok: true } | { error: string } {
  const event = db.prepare("SELECT id FROM events WHERE id = ?").get(eventId);
  if (!event) return { error: "Hackathon not found." };
  const judge = db.prepare("SELECT id FROM users WHERE lower(email) = ? AND role = 'judge'").get(email.trim().toLowerCase()) as
    | { id: string }
    | undefined;
  if (!judge) return { error: "That email is not a judge account." };
  const unique = [...new Set(trackIds)];
  if (!unique.length) return { error: "Assign at least one track." };
  const known = new Set((db.prepare("SELECT id FROM tracks").all() as { id: string }[]).map((row) => row.id));
  if (unique.some((id) => !known.has(id))) return { error: "Unknown track." };
  db.prepare(
    `INSERT INTO judge_assignments (event_id, judge_id, tracks_json) VALUES (?, ?, ?)
     ON CONFLICT (event_id, judge_id) DO UPDATE SET tracks_json = excluded.tracks_json`,
  ).run(eventId, judge.id, JSON.stringify(unique));
  appendAudit(actorId, "JUDGE_ASSIGNED", { eventId, judgeId: judge.id, tracks: unique });
  return { ok: true };
}
