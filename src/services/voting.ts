import { db } from "../db/index.js";
import { appendAudit } from "./audit.js";

export function ensureVotingConfig(): void {
  db.prepare("INSERT OR IGNORE INTO voting_config (id, frozen, budget) VALUES (1, 1, 100)").run();
}

export function isVotingFrozen(): boolean {
  ensureVotingConfig();
  const row = db.prepare("SELECT frozen FROM voting_config WHERE id = 1").get() as { frozen: number };
  return Boolean(row.frozen);
}

export function setVotingFrozen(frozen: boolean, actorId: string): void {
  ensureVotingConfig();
  db.prepare("UPDATE voting_config SET frozen = ? WHERE id = 1").run(frozen ? 1 : 0);
  appendAudit(actorId, frozen ? "VOTING_FROZEN" : "VOTING_UNFROZEN", { frozen });
}

export function voterStatus(voterId: string): {
  budget: number;
  creditsUsed: number;
  creditsRemaining: number;
  allocations: { projectId: string; votes: number; credits: number }[];
} {
  ensureVotingConfig();
  const budget = (db.prepare("SELECT budget FROM voting_config WHERE id = 1").get() as { budget: number }).budget;
  const rows = db
    .prepare("SELECT project_id, vote_value, credits FROM votes WHERE voter_id = ?")
    .all(voterId) as { project_id: string; vote_value: number; credits: number }[];
  const creditsUsed = rows.reduce((sum, row) => sum + row.credits, 0);
  return {
    budget,
    creditsUsed,
    creditsRemaining: budget - creditsUsed,
    allocations: rows.map((row) => ({ projectId: row.project_id, votes: row.vote_value, credits: row.credits })),
  };
}

export function castQuadraticVote(voterId: string, projectId: string, votes: number): { ok: true; credits: number; remaining: number } | { ok: false; error: string } {
  if (!Number.isInteger(votes) || votes < 0 || votes > 10) {
    return { ok: false, error: "votes must be an integer from 0 to 10" };
  }
  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!project) return { ok: false, error: "project not found" };
  const credits = votes * votes;
  const status = voterStatus(voterId);
  const current = status.allocations.find((row) => row.projectId === projectId)?.credits ?? 0;
  const other = status.creditsUsed - current;
  if (other + credits > status.budget) {
    return { ok: false, error: `that ballot costs ${credits} credits and ${status.budget - other} remain` };
  }
  if (votes === 0) {
    db.prepare("DELETE FROM votes WHERE voter_id = ? AND project_id = ?").run(voterId, projectId);
  } else {
    db.prepare(`
      INSERT INTO votes (voter_id, project_id, vote_value, credits) VALUES (?, ?, ?, ?)
      ON CONFLICT (voter_id, project_id) DO UPDATE SET vote_value = excluded.vote_value, credits = excluded.credits
    `).run(voterId, projectId, votes, credits);
  }
  appendAudit(voterId, "QUADRATIC_VOTE_CAST", { projectId, votes, credits });
  return { ok: true, credits, remaining: status.budget - other - credits };
}

export function publicResults(isOrganizer: boolean): { status: string; frozen: boolean; results?: unknown[] } {
  const frozen = isVotingFrozen();
  if (frozen && !isOrganizer) {
    return { status: "BLIND_VOTING_ACTIVE", frozen: true };
  }
  const rows = db.prepare(`
    SELECT p.id AS project_id, p.title, t.name AS track,
           COALESCE(SUM(v.vote_value), 0) AS total_votes,
           COALESCE(SUM(v.credits), 0) AS total_credits,
           COUNT(v.voter_id) AS unique_voters
    FROM projects p
    JOIN tracks t ON t.id = p.track_id
    LEFT JOIN votes v ON v.project_id = p.id
    GROUP BY p.id
    ORDER BY total_votes DESC, p.id
  `).all();
  return { status: frozen ? "ORGANIZER_PREVIEW" : "RESULTS_PUBLIC", frozen, results: rows };
}
