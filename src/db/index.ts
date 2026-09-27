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
      tracks_json TEXT NOT NULL DEFAULT '[]'
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
      team_id TEXT NOT NULL REFERENCES teams(id),
      track_id TEXT NOT NULL REFERENCES tracks(id),
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      repo_url TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      facts_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judge_id TEXT NOT NULL REFERENCES users(id),
      project_id TEXT NOT NULL REFERENCES projects(id),
      criteria_json TEXT NOT NULL,
      raw_score REAL NOT NULL,
      normalized_score REAL NOT NULL DEFAULT 0,
      comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (judge_id, project_id)
    );

    CREATE INDEX IF NOT EXISTS idx_scores_judge ON scores(judge_id);
    CREATE INDEX IF NOT EXISTS idx_scores_project ON scores(project_id);
    CREATE INDEX IF NOT EXISTS idx_projects_track ON projects(track_id);
  `);
}

export function resetSchema(): void {
  db.pragma("foreign_keys = OFF");
  db.exec(`
    DROP TABLE IF EXISTS scores;
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
