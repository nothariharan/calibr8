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
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('visitor', 'participant', 'judge', 'organizer', 'admin'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL
    );
  `);
}
