export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;

  constructor(status: number, statusText: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
  }
}

export function asApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const message = err instanceof Error ? err.message : "Request failed";
  return new ApiError(0, "Network error", message);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("accept", "application/json");
  if (init?.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const res = await fetch(path, { ...init, credentials: "same-origin", headers });
  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText || `HTTP ${res.status}`;
    if (text && !text.trim().startsWith("<")) {
      try {
        const body = JSON.parse(text) as { error?: unknown; message?: unknown };
        if (typeof body.error === "string" && body.error.trim()) message = body.error.trim();
        else if (typeof body.message === "string" && body.message.trim()) message = body.message.trim();
        else message = text.trim();
      } catch {
        message = text.trim();
      }
    }
    throw new ApiError(res.status, res.statusText || "Error", message);
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(res.status, res.statusText || "Error", "The server did not return JSON.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (isRecord(value)) {
      if (typeof value.name === "string") return value.name;
      if (typeof value.title === "string") return value.title;
    }
  }
  return "";
}

function pickNum(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

const LIST_KEYS = ["rows", "records", "items", "data", "projects", "teams", "tracks", "judges", "scores", "results"];

function asList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return [];
  for (const key of LIST_KEYS) {
    if (Array.isArray(data[key])) return data[key] as unknown[];
  }
  return [];
}

export type Project = {
  id: string;
  title: string;
  summary: string;
  track: string;
  team: string;
  submitted_at: string;
  repo_url: string;
};

function normalizeProject(value: unknown): Project | null {
  if (Array.isArray(value)) return value.length ? normalizeProject(value[0]) : null;
  if (!isRecord(value)) return null;
  if (isRecord(value.project)) return normalizeProject(value.project);
  const id = pickStr(value, ["id", "project_id"]);
  const title = pickStr(value, ["title", "name"]);
  if (!id && !title) return null;
  return {
    id,
    title: title || id,
    summary: pickStr(value, ["summary", "description"]),
    track: pickStr(value, ["track", "track_name"]),
    team: pickStr(value, ["team", "team_name"]),
    submitted_at: pickStr(value, ["submitted_at", "submittedAt", "submitted"]),
    repo_url: pickStr(value, ["repo_url", "repoUrl", "repository"]),
  };
}

export async function getProjects(): Promise<Project[]> {
  const data = await request<unknown>("/api/projects");
  return asList(data).map(normalizeProject).filter((row): row is Project => row !== null);
}

export async function getProject(id: string): Promise<Project> {
  const data = await request<unknown>(`/api/projects/${encodeURIComponent(id)}`);
  const project = normalizeProject(data);
  if (!project) throw new ApiError(404, "Not Found", "project not found");
  return project;
}

export type StandingProject = {
  id: string;
  title: string;
  calibratedRank: number | null;
  rawAvg: number | null;
  calibrated: number | null;
  rankDelta: number | null;
  reviewCount: number | null;
};

export type StandingJudge = {
  id: string;
  name: string;
  bias: number | null;
  rawMean: number | null;
  reviewCount: number | null;
};

export type Standings = {
  globalMean: number | null;
  projects: StandingProject[];
  judges: StandingJudge[];
};

function normalizeStandingProject(value: unknown): StandingProject | null {
  if (!isRecord(value)) return null;
  const id = pickStr(value, ["id", "project_id", "projectId"]);
  if (!id && !pickStr(value, ["title"])) return null;
  return {
    id,
    title: pickStr(value, ["title", "name"]) || id,
    calibratedRank: pickNum(value, ["calibratedRank", "calibrated_rank", "rank"]),
    rawAvg: pickNum(value, ["rawAvg", "raw_avg", "raw", "raw_average", "rawMean", "raw_mean"]),
    calibrated: pickNum(value, ["calibrated", "calibrated_score", "normalized_score"]),
    rankDelta: pickNum(value, ["rankDelta", "rank_delta", "shift"]),
    reviewCount: pickNum(value, ["reviewCount", "review_count", "reviews", "reviews_count"]),
  };
}

function normalizeStandingJudge(value: unknown): StandingJudge | null {
  if (!isRecord(value)) return null;
  const id = pickStr(value, ["id", "judge_id", "judgeId"]);
  const name = pickStr(value, ["name", "judge"]) || id;
  if (!id && !name) return null;
  return {
    id,
    name,
    bias: pickNum(value, ["bias"]),
    rawMean: pickNum(value, ["rawMean", "raw_mean"]),
    reviewCount: pickNum(value, ["reviewCount", "review_count", "reviews"]),
  };
}

export async function getStandings(): Promise<Standings> {
  const data = await request<unknown>("/api/standings");
  const root = isRecord(data) ? data : {};
  const projects = asList(isRecord(data) && Array.isArray(data.projects) ? data.projects : data)
    .map(normalizeStandingProject)
    .filter((row): row is StandingProject => row !== null)
    .sort((a, b) => (b.calibrated ?? -Infinity) - (a.calibrated ?? -Infinity) || a.title.localeCompare(b.title))
    .map((project, index) => ({ ...project, calibratedRank: project.calibratedRank ?? index + 1 }));
  const judges = (isRecord(data) && Array.isArray(data.judges) ? data.judges : [])
    .map(normalizeStandingJudge)
    .filter((row): row is StandingJudge => row !== null)
    .sort((a, b) => (a.bias ?? 0) - (b.bias ?? 0));
  return {
    globalMean: pickNum(root, ["globalMean", "global_mean", "mean"]),
    projects,
    judges,
  };
}

export type TableData = { columns: string[]; rows: string[][] };

function cell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.length > 180 ? `${value.slice(0, 177)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(cell).filter(Boolean).join(", ");
  if (isRecord(value)) {
    if (typeof value.name === "string") return value.name;
    if (typeof value.title === "string") return value.title;
    const text = JSON.stringify(value);
    return text.length > 180 ? `${text.slice(0, 177)}…` : text;
  }
  return String(value);
}

function header(key: string): string {
  return key.replaceAll("_", " ");
}

export async function getRecords(object: string): Promise<TableData> {
  const data = await request<unknown>(`/api/records?object=${encodeURIComponent(object)}`);
  const list = asList(data);
  if (!list.length) return { columns: [], rows: [] };
  if (Array.isArray(list[0])) {
    const rows = list.map((row) => (Array.isArray(row) ? row.map(cell) : [cell(row)]));
    const width = Math.max(...rows.map((row) => row.length));
    return {
      columns: Array.from({ length: width }, (_, index) => `Column ${index + 1}`),
      rows,
    };
  }
  const objects = list.filter(isRecord);
  const columns: string[] = [];
  for (const row of objects) {
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  return {
    columns: columns.map(header),
    rows: objects.map((row) => columns.map((key) => cell(row[key]))),
  };
}

export type FeedItem = Project & { stars: number | null };

function pickStars(row: Record<string, unknown>): number | null {
  const value = row.stars ?? row.raw_score ?? row.score;
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function getFeed(): Promise<FeedItem[]> {
  const data = await request<unknown>("/api/feed");
  return asList(data)
    .map((value) => {
      if (!isRecord(value)) return null;
      const project = normalizeProject(value);
      if (!project) return null;
      return { ...project, stars: pickStars(value) };
    })
    .filter((row): row is FeedItem => row !== null);
}

export type Rubric = { functionality: number; quality: number; innovation: number };

export async function postScore(projectId: string, criteria: Rubric, comment: string): Promise<void> {
  await request<unknown>("/api/judge/scores", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, criteria, comment }),
  });
}

export type HomeParticipant = {
  id: string;
  title: string;
  summary: string;
  team: string;
  track: string;
  trackId: string;
  repoUrl?: string;
  emails: string[];
  criteria: Rubric | null;
  raw: number | null;
  calibrated: number | null;
  note?: string;
  notes?: { author: string; text: string }[];
  facts?: {
    scanned?: boolean;
    databaseDrivers: string[];
    validators: string[];
    testRunner: string | null;
    testFiles: string[];
  };
};

export type HomeEvent = {
  id: string;
  name: string;
  submissionsClose: string;
  closed: boolean;
  tracks: { id: string; name: string }[];
  judges: { email: string; name: string; tracks: string[] }[];
  participants: HomeParticipant[];
};

export type HomeAudit = {
  verified: boolean;
  scoreChainValid: boolean;
  auditChainValid: boolean;
  totalScores: number;
  totalAuditEntries: number;
  recent: { actorId: string; action: string; hash: string; timestamp: string }[];
};

export type HomePayload = {
  role: string;
  tracks: { id: string; name: string }[];
  judges: { email: string; name: string }[];
  events: HomeEvent[];
  audit: HomeAudit | null;
};

export async function getDashboard(): Promise<HomePayload> {
  return request<HomePayload>("/api/dashboard");
}

export async function createHackathon(name: string, submissionsClose: string): Promise<void> {
  await request<unknown>("/api/events", {
    method: "POST",
    body: JSON.stringify({ name, submissions_close: submissionsClose }),
  });
}

export async function addHackathonParticipant(
  eventId: string,
  input: { teamName: string; emails: string; title: string; summary: string; trackId: string; repoUrl: string },
): Promise<void> {
  await request<unknown>(`/api/events/${encodeURIComponent(eventId)}/participants`, {
    method: "POST",
    body: JSON.stringify({
      team_name: input.teamName,
      emails: input.emails.split(/[,\s]+/).filter(Boolean),
      title: input.title,
      summary: input.summary,
      track_id: input.trackId,
      repo_url: input.repoUrl,
    }),
  });
}

export async function assignHackathonJudge(eventId: string, email: string, tracks: string[]): Promise<void> {
  await request<unknown>(`/api/events/${encodeURIComponent(eventId)}/judges`, {
    method: "POST",
    body: JSON.stringify({ email, tracks }),
  });
}

export type PairSide = {
  id: string;
  title: string;
  summary: string;
  track: string;
  team: string;
  calibrated: number | null;
};

export type Matchup = {
  projectA: PairSide;
  projectB: PairSide;
  gap: number | null;
  inTieBand: boolean | null;
};

function normalizeSide(value: unknown): PairSide | null {
  if (!isRecord(value)) return null;
  const id = pickStr(value, ["id", "project_id", "projectId"]);
  const title = pickStr(value, ["title", "name"]) || id;
  if (!id && !title) return null;
  return {
    id,
    title,
    summary: pickStr(value, ["summary"]),
    track: pickStr(value, ["track", "track_name"]),
    team: pickStr(value, ["team", "team_name"]),
    calibrated: pickNum(value, ["calibrated", "calibrated_score", "normalized_score"]),
  };
}

export function pairIsOpen(match: Matchup): boolean {
  return match.gap != null && match.gap < 0.05;
}

export async function getNextPair(): Promise<Matchup | null> {
  const data = await request<unknown>("/api/pairwise/next");
  if (data == null) return null;
  if (!isRecord(data)) return null;
  if ("matchup" in data && data.matchup == null) return null;
  const root = isRecord(data.matchup) ? data.matchup : data;
  const projectA = normalizeSide(root.projectA ?? root.project_a ?? root.left ?? root.a);
  const projectB = normalizeSide(root.projectB ?? root.project_b ?? root.right ?? root.b);
  if (!projectA || !projectB) return null;
  const gap = pickNum(root, ["gap", "calibrated_gap"]);
  let inTieBand: boolean | null = null;
  if (typeof root.inTieBand === "boolean") inTieBand = root.inTieBand;
  else if (typeof root.in_tie_band === "boolean") inTieBand = root.in_tie_band;
  return { projectA, projectB, gap, inTieBand };
}

export async function postCompare(projectAId: string, projectBId: string, winnerId: string): Promise<void> {
  await request<unknown>("/api/pairwise/compare", {
    method: "POST",
    body: JSON.stringify({ project_a_id: projectAId, project_b_id: projectBId, winner_id: winnerId }),
  });
}

export type SessionPayload = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  eventName?: string;
  tracks?: string[];
  next?: string;
};

export async function getSession(): Promise<SessionPayload> {
  const data = await request<unknown>("/api/session");
  return readSession(data);
}

export async function login(email: string, password: string): Promise<SessionPayload> {
  const data = await request<unknown>("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return readSession(data);
}

export async function logout(): Promise<void> {
  await request<unknown>("/api/session", {
    method: "POST",
    body: JSON.stringify({ token: "" }),
  });
}

function readSession(data: unknown): SessionPayload {
  if (!isRecord(data)) return {};
  const user = isRecord(data.user) ? data.user : null;
  if (!user) return {};
  const event = isRecord(user.event) ? user.event : null;
  const tracks = Array.isArray(user.tracks)
    ? user.tracks
        .map((track) => (isRecord(track) ? pickStr(track, ["name", "id"]) : ""))
        .filter(Boolean)
    : [];
  return {
    id: pickStr(user, ["id", "user_id"]) || undefined,
    name: pickStr(user, ["name"]) || undefined,
    email: pickStr(user, ["email"]) || undefined,
    role: pickStr(user, ["role"]) || undefined,
    eventName: event ? pickStr(event, ["name"]) || undefined : undefined,
    tracks,
    next: pickStr(data, ["next"]) || undefined,
  };
}
