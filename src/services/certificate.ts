import crypto from "node:crypto";
import { db } from "../db/index.js";

export const DEMO_SEAL_KEY = "calibr8-demo-seal";

export interface CertificateData {
  projectId: string;
  title: string;
  team: string;
  track: string;
  calibrated: number | null;
  signature: string;
}

export function certificateFor(projectId: string): CertificateData | null {
  const row = db.prepare(`
    SELECT p.id, p.title, tm.name AS team, t.name AS track, MAX(s.normalized_score) AS calibrated
    FROM projects p
    JOIN teams tm ON tm.id = p.team_id
    JOIN tracks t ON t.id = p.track_id
    LEFT JOIN scores s ON s.project_id = p.id
    WHERE p.id = ?
    GROUP BY p.id
  `).get(projectId) as { id: string; title: string; team: string; track: string; calibrated: number | null } | undefined;
  if (!row) return null;
  const calibrated = row.calibrated === null ? null : Number(row.calibrated);
  return {
    projectId: row.id,
    title: row.title,
    team: row.team,
    track: row.track,
    calibrated,
    signature: sign(row.id, row.team, row.track, calibrated),
  };
}

export function sign(projectId: string, team: string, track: string, calibrated: number | null): string {
  const score = calibrated === null ? "unscored" : calibrated.toFixed(3);
  return crypto.createHmac("sha256", DEMO_SEAL_KEY).update(`${projectId}|${team}|${track}|${score}`).digest("hex");
}

export function checkSeal(projectId: string, signature: string): { valid: boolean; data?: CertificateData } {
  const data = certificateFor(projectId);
  if (!data) return { valid: false };
  const valid = data.signature.toLowerCase() === signature.trim().toLowerCase();
  return { valid, data: valid ? data : undefined };
}

export function certificateSvg(data: CertificateData): string {
  const score = data.calibrated === null ? "unscored" : data.calibrated.toFixed(3);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="480" viewBox="0 0 900 480" data-project="${escapeAttr(data.projectId)}" data-signature="${data.signature}">
  <rect width="900" height="480" fill="#ffffff"/>
  <rect x="16" y="16" width="868" height="448" fill="none" stroke="#161616"/>
  <text x="40" y="70" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" fill="#666">calibr8 demo seal</text>
  <text x="40" y="120" font-family="ui-sans-serif, system-ui, sans-serif" font-size="32" fill="#161616">${escapeText(data.title)}</text>
  <text x="40" y="160" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" fill="#161616">${escapeText(data.team)} · ${escapeText(data.track)}</text>
  <text x="40" y="210" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" fill="#161616">Calibrated ${escapeText(score)}</text>
  <text x="40" y="270" font-family="ui-monospace, monospace" font-size="12" fill="#444">${data.signature}</text>
  <text x="40" y="420" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" fill="#666">Demo seal. The HMAC key is the constant DEMO_SEAL_KEY in src/services/certificate.ts.</text>
</svg>`;
}

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttr(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;");
}
