import { db } from "../db/index.js";
import { appendAudit } from "./audit.js";

export interface Matchup {
  projectA: ProjectCard;
  projectB: ProjectCard;
  gap: number;
  inTieBand: boolean;
}

interface ProjectCard {
  id: string;
  eventId: string;
  title: string;
  summary: string;
  track: string;
  calibrated: number;
}

export function nextMatchup(judgeId: string): Matchup | null {
  const tracks = judgeTracks(judgeId);
  if (!tracks.length) return null;
  const projects = db.prepare(`
    SELECT p.id, p.event_id AS eventId, p.title, p.summary, t.name AS track, MAX(s.normalized_score) AS calibrated
    FROM projects p
    JOIN tracks t ON t.id = p.track_id
    JOIN scores s ON s.project_id = p.id
    WHERE p.track_id IN (${tracks.map(() => "?").join(",")})
      AND s.normalized_score IS NOT NULL
    GROUP BY p.id
    ORDER BY p.id
  `).all(...tracks) as ProjectCard[];

  const compared = new Set(
    (db.prepare("SELECT project_a_id, project_b_id FROM pairwise_comparisons WHERE judge_id = ?").all(judgeId) as {
      project_a_id: string;
      project_b_id: string;
    }[]).map((row) => `${row.project_a_id}|${row.project_b_id}`),
  );

  let closest: Matchup | null = null;
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      if (projects[i].eventId !== projects[j].eventId || projects[i].track !== projects[j].track) continue;
      const [a, b] = [projects[i], projects[j]].sort((left, right) => left.id.localeCompare(right.id));
      if (compared.has(`${a.id}|${b.id}`)) continue;
      const gap = Math.abs(a.calibrated - b.calibrated);
      const matchup = { projectA: a, projectB: b, gap, inTieBand: gap < 0.05 };
      if (!closest || gap < closest.gap) closest = matchup;
    }
  }
  if (!closest) return null;
  return closest.inTieBand ? closest : { ...closest, inTieBand: false };
}

export function recordComparison(judgeId: string, leftId: string, rightId: string, winnerId: string): { ok: boolean; error?: string } {
  if (winnerId !== leftId && winnerId !== rightId) return { ok: false, error: "winner must be one of the two projects" };
  const [a, b] = [leftId, rightId].sort();
  db.prepare(`
    INSERT INTO pairwise_comparisons (judge_id, project_a_id, project_b_id, winner_id)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (judge_id, project_a_id, project_b_id) DO UPDATE SET winner_id = excluded.winner_id
  `).run(judgeId, a, b, winnerId);
  appendAudit(judgeId, "PAIRWISE_COMPARISON", { projectA: a, projectB: b, winner: winnerId });
  return { ok: true };
}

export function bradleyTerry(): { rankings: { projectId: string; title: string; wins: number; matches: number; strength: number }[] } {
  const comparisons = db.prepare("SELECT project_a_id, project_b_id, winner_id FROM pairwise_comparisons").all() as {
    project_a_id: string;
    project_b_id: string;
    winner_id: string;
  }[];
  const ids = [...new Set(comparisons.flatMap((row) => [row.project_a_id, row.project_b_id]))];
  const index = new Map(ids.map((id, position) => [id, position]));
  const wins = new Array<number>(ids.length).fill(0);
  const played = new Array<number>(ids.length).fill(0);
  const matrix = Array.from({ length: ids.length }, () => new Array<number>(ids.length).fill(0));
  for (const row of comparisons) {
    const winner = index.get(row.winner_id)!;
    const loser = index.get(row.winner_id === row.project_a_id ? row.project_b_id : row.project_a_id)!;
    wins[winner] += 1;
    played[index.get(row.project_a_id)!] += 1;
    played[index.get(row.project_b_id)!] += 1;
    matrix[winner][loser] += 1;
  }
  let strength = new Array<number>(ids.length).fill(1);
  for (let iteration = 0; iteration < 40; iteration++) {
    const next = new Array<number>(ids.length).fill(0);
    for (let i = 0; i < ids.length; i++) {
      let denom = 0;
      for (let j = 0; j < ids.length; j++) {
        if (i === j) continue;
        const meetings = matrix[i][j] + matrix[j][i];
        if (meetings) denom += meetings / (strength[i] + strength[j]);
      }
      next[i] = denom ? wins[i] / denom : 0;
    }
    const sum = next.reduce((total, value) => total + value, 0) || 1;
    strength = next.map((value) => value / sum);
  }
  const titles = new Map(
    (db.prepare("SELECT id, title FROM projects").all() as { id: string; title: string }[]).map((row) => [row.id, row.title]),
  );
  const rankings = ids
    .map((id, position) => ({
      projectId: id,
      title: titles.get(id) ?? id,
      wins: wins[position],
      matches: played[position],
      strength: Number(strength[position].toFixed(6)),
    }))
    .sort((a, b) => b.strength - a.strength);
  return { rankings };
}

function judgeTracks(judgeId: string): string[] {
  const row = db.prepare("SELECT tracks_json FROM users WHERE id = ?").get(judgeId) as { tracks_json: string } | undefined;
  return row ? (JSON.parse(row.tracks_json) as string[]) : [];
}
