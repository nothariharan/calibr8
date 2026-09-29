import fs from "node:fs";
import path from "node:path";
import { hashPassword, fixturePassword } from "../auth.js";
import { appendAudit, rechainScores } from "../services/audit.js";
import { ensureVotingConfig } from "../services/voting.js";
import { calibrate } from "../services/lsc.js";
import { seedHarborDemo } from "./demo-harbor.js";
import { db, resetSchema } from "./index.js";

interface Fixture {
  event: { id: string; name: string; submissions_close: string };
  tracks: { id: string; name: string }[];
  judges: { id: string; name: string; email: string; tracks?: string[] }[];
  teams: { id: string; name: string; members?: string[] }[];
  projects: {
    id: string;
    team: string;
    track: string;
    title: string;
    summary: string;
    repo_url: string;
    submitted_at: string;
  }[];
  scores: {
    judge: string;
    project: string;
    criteria?: Record<string, number>;
    comment?: string;
  }[];
}

const fixturePath = process.argv[2] ?? path.join(process.cwd(), "fixtures.json");
const data = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as Fixture;

resetSchema();

const seed = db.transaction(() => {
  db.prepare("INSERT INTO events (id, name, submissions_close) VALUES (?, ?, ?)").run(
    data.event.id,
    data.event.name,
    data.event.submissions_close,
  );

  const insertTrack = db.prepare("INSERT INTO tracks (id, name) VALUES (?, ?)");
  for (const track of data.tracks) insertTrack.run(track.id, track.name);

  const insertUser = db.prepare(
    "INSERT INTO users (id, email, name, role, tracks_json, password_hash) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const addUser = (id: string, email: string, name: string, role: string, tracks: string[]) => {
    const password = fixturePassword(email);
    insertUser.run(id, email, name, role, JSON.stringify(tracks), hashPassword(password, email));
  };
  addUser("usr_organizer", "organizer@example.org", "Organizer", "organizer", []);
  addUser("usr_participant", "participant@example.org", "Participant", "participant", []);
  for (const judge of data.judges) addUser(judge.id, judge.email, judge.name, "judge", judge.tracks ?? []);

  const checkerToken: Record<string, string> = {
    usr_organizer: "org_7f2a",
    usr_participant: "prt_2e88",
    jdg_01: "jdg_a_91bc",
    jdg_02: "jdg_b_44de",
  };
  const insertSession = db.prepare("INSERT INTO sessions (token, user_id, role) VALUES (?, ?, ?)");
  const users = db.prepare("SELECT id, role FROM users").all() as { id: string; role: string }[];
  for (const user of users) insertSession.run(checkerToken[user.id] ?? `sess_${user.id}`, user.id, user.role);

  const insertTeam = db.prepare("INSERT INTO teams (id, name, members_json) VALUES (?, ?, ?)");
  for (const team of data.teams) insertTeam.run(team.id, team.name, JSON.stringify(team.members ?? []));

  const insertAssignment = db.prepare(
    "INSERT INTO judge_assignments (event_id, judge_id, tracks_json) VALUES (?, ?, ?)",
  );
  for (const judge of data.judges) {
    insertAssignment.run(data.event.id, judge.id, JSON.stringify(judge.tracks ?? []));
  }

  const insertProject = db.prepare(`
    INSERT INTO projects (id, event_id, team_id, track_id, title, summary, repo_url, submitted_at, facts_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}')
  `);
  for (const project of data.projects) {
    insertProject.run(
      project.id,
      data.event.id,
      project.team,
      project.track,
      project.title,
      project.summary,
      project.repo_url,
      project.submitted_at,
    );
  }

  const insertScore = db.prepare(`
    INSERT INTO scores (judge_id, project_id, criteria_json, raw_score, comment)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const score of data.scores) {
    const criteria = score.criteria ?? {};
    const values = Object.values(criteria);
    const raw = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    insertScore.run(score.judge, score.project, JSON.stringify(criteria), raw, score.comment ?? "");
  }

  const reviews = data.scores.map((score) => {
    const values = Object.values(score.criteria ?? {});
    const value = values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : 0;
    return { projectId: score.project, judgeId: score.judge, value };
  });
  const result = calibrate(
    data.projects.map((project) => project.id).sort(),
    data.judges.map((judge) => judge.id).sort(),
    reviews,
  );
  const update = db.prepare("UPDATE scores SET normalized_score = ? WHERE project_id = ?");
  for (const project of result.projects) update.run(project.calibrated, project.id);

  seedHarborDemo();
});

seed();
rechainScores();
ensureVotingConfig();
appendAudit("usr_organizer", "SEED", { source: "fixtures.json" });

const counts = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM projects) AS projects,
    (SELECT COUNT(*) FROM scores) AS scores,
    (SELECT COUNT(*) FROM sessions) AS sessions
`).get();
console.log(`seeded ${JSON.stringify(counts)}`);
