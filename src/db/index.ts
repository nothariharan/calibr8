import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dataDir = path.dirname(process.env.DB_PATH ?? path.join(process.cwd(), "data", "calibr8.db"));
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DB_PATH ?? path.join(dataDir, "calibr8.db");

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      submissions_close TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('visitor', 'participant', 'judge', 'organizer', 'admin')),
      tracks_json TEXT NOT NULL DEFAULT '[]',
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      members_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id),
      team_id TEXT NOT NULL REFERENCES teams(id),
      track_id TEXT NOT NULL REFERENCES tracks(id),
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      repo_url TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      facts_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS judge_assignments (
      event_id TEXT NOT NULL REFERENCES events(id),
      judge_id TEXT NOT NULL REFERENCES users(id),
      tracks_json TEXT NOT NULL,
      PRIMARY KEY (event_id, judge_id)
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judge_id TEXT NOT NULL REFERENCES users(id),
      project_id TEXT NOT NULL REFERENCES projects(id),
      criteria_json TEXT NOT NULL,
      raw_score REAL NOT NULL,
      normalized_score REAL NOT NULL DEFAULT 0,
      comment TEXT NOT NULL DEFAULT '',
      prev_hash TEXT NOT NULL DEFAULT '',
      hash TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (judge_id, project_id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      prev_hash TEXT NOT NULL,
      hash TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS votes (
      voter_id TEXT NOT NULL REFERENCES users(id),
      project_id TEXT NOT NULL REFERENCES projects(id),
      vote_value INTEGER NOT NULL,
      credits INTEGER NOT NULL,
      PRIMARY KEY (voter_id, project_id)
    );

    CREATE TABLE IF NOT EXISTS voting_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      frozen INTEGER NOT NULL DEFAULT 1,
      budget INTEGER NOT NULL DEFAULT 100
    );

    CREATE TABLE IF NOT EXISTS pairwise_comparisons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judge_id TEXT NOT NULL REFERENCES users(id),
      project_a_id TEXT NOT NULL REFERENCES projects(id),
      project_b_id TEXT NOT NULL REFERENCES projects(id),
      winner_id TEXT NOT NULL,
      UNIQUE (judge_id, project_a_id, project_b_id)
    );

    CREATE INDEX IF NOT EXISTS idx_scores_judge ON scores(judge_id);
    CREATE INDEX IF NOT EXISTS idx_scores_project ON scores(project_id);
    CREATE INDEX IF NOT EXISTS idx_projects_track ON projects(track_id);
  `);
}

export function resetSchema(): void {
  db.pragma("foreign_keys = OFF");
  db.exec(`
    DROP TABLE IF EXISTS pairwise_comparisons;
    DROP TABLE IF EXISTS votes;
    DROP TABLE IF EXISTS voting_config;
    DROP TABLE IF EXISTS audit_log;
    DROP TABLE IF EXISTS scores;
    DROP TABLE IF EXISTS judge_assignments;
    DROP TABLE IF EXISTS projects;
    DROP TABLE IF EXISTS teams;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS tracks;
    DROP TABLE IF EXISTS events;
  `);
  db.pragma("foreign_keys = ON");
  initSchema();
}
