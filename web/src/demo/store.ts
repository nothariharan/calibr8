import { useSyncExternalStore } from "react";
import { JUDGES, PROJECTS } from "./data";

export type Ballot = {
  functionality: number;
  quality: number;
  innovation: number;
  note: string;
};

type DemoState = {
  judgeId: string | null;
  ballots: Record<string, Record<string, Ballot>>;
};

const KEY = "calibr8.demo.ieh.v1";
const EMPTY: DemoState = { judgeId: null, ballots: {} };

function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 5;
}

function isBallot(value: unknown): value is Ballot {
  if (!value || typeof value !== "object") return false;
  const row = value as Ballot;
  return isScore(row.functionality) && isScore(row.quality) && isScore(row.innovation) && typeof row.note === "string";
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    const judgeId = JUDGES.some((judge) => judge.id === parsed.judgeId) ? parsed.judgeId ?? null : null;
    const ballots: DemoState["ballots"] = {};
    if (parsed.ballots && typeof parsed.ballots === "object") {
      for (const judge of JUDGES) {
        const rows = parsed.ballots[judge.id];
        if (!rows || typeof rows !== "object") continue;
        const kept: Record<string, Ballot> = {};
        for (const project of PROJECTS) {
          const ballot = rows[project.id];
          if (isBallot(ballot)) kept[project.id] = { ...ballot, note: ballot.note.slice(0, 800) };
        }
        if (Object.keys(kept).length) ballots[judge.id] = kept;
      }
    }
    return { judgeId, ballots };
  } catch {
    return EMPTY;
  }
}

let state: DemoState = typeof localStorage === "undefined" ? EMPTY : load();
const listeners = new Set<() => void>();

function emit() {
  localStorage.setItem(KEY, JSON.stringify(state));
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useDemo() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getDemo() {
  return state;
}

export function setJudge(judgeId: string) {
  if (!JUDGES.some((judge) => judge.id === judgeId)) return;
  if (state.judgeId === judgeId) return;
  state = { ...state, judgeId };
  emit();
}

export function saveBallot(judgeId: string, projectId: string, ballot: Ballot) {
  if (!isBallot(ballot)) return;
  const forJudge = { ...(state.ballots[judgeId] ?? {}), [projectId]: ballot };
  state = { ...state, judgeId, ballots: { ...state.ballots, [judgeId]: forJudge } };
  emit();
}

export function clearDemo() {
  state = EMPTY;
  emit();
}

export function ballotFor(demo: DemoState, judgeId: string, projectId: string): Ballot | null {
  return demo.ballots[judgeId]?.[projectId] ?? null;
}

export function scoredCount(demo: DemoState, judgeId: string): number {
  return PROJECTS.filter((project) => demo.ballots[judgeId]?.[project.id]).length;
}

export function nextUnscored(demo: DemoState, judgeId: string, currentId: string): string | null {
  const index = PROJECTS.findIndex((project) => project.id === currentId);
  if (index < 0) return null;
  const open = (project: (typeof PROJECTS)[number]) => !demo.ballots[judgeId]?.[project.id];
  return (PROJECTS.slice(index + 1).find(open) ?? PROJECTS.slice(0, index).find(open))?.id ?? null;
}

export function rawMean(ballot: Ballot): number {
  return (ballot.functionality + ballot.quality + ballot.innovation) / 3;
}
