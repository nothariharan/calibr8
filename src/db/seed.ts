import fs from "node:fs";
import path from "node:path";
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
    "INSERT INTO users (id, email, name, role, tracks_json) VALUES (?, ?, ?, ?, ?)",
  );
  insertUser.run("usr_organizer", "organizer@example.org", "Organizer", "organizer", "[]");
  insertUser.run("usr_participant", "participant@example.org", "Participant", "participant", "[]");
  for (const judge of data.judges) {
    insertUser.run(judge.id, judge.email, judge.name, "judge", JSON.stringify(judge.tracks ?? []));
  }

  const insertSession = db.prepare("INSERT INTO sessions (token, user_id, role) VALUES (?, ?, ?)");
  insertSession.run("org_7f2a", "usr_organizer", "organizer");
  insertSession.run("jdg_a_91bc", "jdg_01", "judge");
  insertSession.run("jdg_b_44de", "jdg_02", "judge");
  insertSession.run("prt_2e88", "usr_participant", "participant");

  const insertTeam = db.prepare("INSERT INTO teams (id, name, members_json) VALUES (?, ?, ?)");
  for (const team of data.teams) insertTeam.run(team.id, team.name, JSON.stringify(team.members ?? []));

  const insertProject = db.prepare(`
    INSERT INTO projects (id, team_id, track_id, title, summary, repo_url, submitted_at, facts_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, '{}')
  `);
  for (const project of data.projects) {
    insertProject.run(
      project.id,
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
});

seed();

const counts = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM projects) AS projects,
    (SELECT COUNT(*) FROM scores) AS scores,
    (SELECT COUNT(*) FROM sessions) AS sessions
`).get();
console.log(`seeded ${JSON.stringify(counts)}`);
