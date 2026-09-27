import type { FastifyRequest } from "fastify";
import { db } from "./db/index.js";

export interface SessionUser {
  id: string;
  name: string;
  role: string;
}

export function currentUser(req: FastifyRequest): SessionUser | null {
  const header = req.headers.cookie ?? "";
  const match = header.match(/(?:^|;)\s*session=([^;]+)/);
  if (!match) return null;
  const token = decodeURIComponent(match[1].trim());
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .get(token) as SessionUser | undefined;
  return row ?? null;
}

export function canonicalJudgeId(value: string): string {
  if (value === "judge_a") return "jdg_01";
  if (value === "judge_b") return "jdg_02";
  return value;
}
