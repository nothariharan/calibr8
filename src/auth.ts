import { scryptSync, timingSafeEqual } from "node:crypto";
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

export function fixturePassword(email: string): string {
  return email.trim().toLowerCase().split("@")[0].replaceAll(".", "-");
}

export function hashPassword(password: string, salt: string): string {
  const hash = scryptSync(password, salt, 32);
  return `scrypt$${Buffer.from(salt, "utf8").toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, saltHex, hashHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function canonicalJudgeId(value: string): string {
  if (value === "judge_a") return "jdg_01";
  if (value === "judge_b") return "jdg_02";
  return value;
}
