import crypto from "node:crypto";
import type Database from "better-sqlite3";
import { db } from "../db/index.js";

export const ZERO_HASH = "0".repeat(64);

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function rechainScores(database: Database.Database = db): void {
  const rows = database
    .prepare("SELECT id, judge_id, project_id, criteria_json, raw_score FROM scores ORDER BY id")
    .all() as { id: number; judge_id: string; project_id: string; criteria_json: string; raw_score: number }[];
  const update = database.prepare("UPDATE scores SET prev_hash = ?, hash = ? WHERE id = ?");
  let prev = ZERO_HASH;
  for (const row of rows) {
    const hash = sha256(`${prev}|${row.judge_id}|${row.project_id}|${row.criteria_json}|${row.raw_score}`);
    update.run(prev, hash, row.id);
    prev = hash;
  }
}

export function appendAudit(actorId: string, action: string, payload: Record<string, unknown>): string {
  const prev = (db.prepare("SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1").get() as { hash: string } | undefined)
    ?.hash ?? ZERO_HASH;
  const payloadJson = JSON.stringify(payload);
  const timestamp = new Date().toISOString();
  const hash = sha256(`${prev}|${actorId}|${action}|${payloadJson}|${timestamp}`);
  db.prepare(
    "INSERT INTO audit_log (actor_id, action, payload_json, prev_hash, hash, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(actorId, action, payloadJson, prev, hash, timestamp);
  return hash;
}

export function verifyDatabase(database: Database.Database = db): {
  verified: boolean;
  scoreChainValid: boolean;
  auditChainValid: boolean;
  totalScores: number;
  totalAuditEntries: number;
} {
  const scores = database
    .prepare("SELECT judge_id, project_id, criteria_json, raw_score, prev_hash, hash FROM scores ORDER BY id")
    .all() as { judge_id: string; project_id: string; criteria_json: string; raw_score: number; prev_hash: string; hash: string }[];
  let prev = ZERO_HASH;
  let scoreChainValid = true;
  for (const row of scores) {
    const hash = sha256(`${prev}|${row.judge_id}|${row.project_id}|${row.criteria_json}|${row.raw_score}`);
    if (row.prev_hash !== prev || row.hash !== hash) scoreChainValid = false;
    prev = row.hash;
  }

  const logs = database
    .prepare("SELECT actor_id, action, payload_json, prev_hash, hash, timestamp FROM audit_log ORDER BY id")
    .all() as { actor_id: string; action: string; payload_json: string; prev_hash: string; hash: string; timestamp: string }[];
  prev = ZERO_HASH;
  let auditChainValid = true;
  for (const row of logs) {
    const hash = sha256(`${prev}|${row.actor_id}|${row.action}|${row.payload_json}|${row.timestamp}`);
    if (row.prev_hash !== prev || row.hash !== hash) auditChainValid = false;
    prev = row.hash;
  }

  return {
    verified: scoreChainValid && auditChainValid,
    scoreChainValid,
    auditChainValid,
    totalScores: scores.length,
    totalAuditEntries: logs.length,
  };
}
