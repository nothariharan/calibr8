import { canonicalJudgeId, currentUser } from "./auth.js";
import { db, initSchema } from "./db/index.js";
import { escapeHtml, shell } from "./ui.js";
import Fastify from "fastify";

initSchema();

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true, service: "calibr8" }));

app.get("/", async (_req, reply) => reply.redirect("/projects"));

app.get("/projects", async (_req, reply) => {
  const rows = db.prepare(`
    SELECT p.id, p.title, p.summary, p.submitted_at, t.name AS track, tm.name AS team
    FROM projects p
    JOIN tracks t ON t.id = p.track_id
    JOIN teams tm ON tm.id = p.team_id
    ORDER BY p.submitted_at, p.id
  `).all() as { id: string; title: string; summary: string; submitted_at: string; track: string; team: string }[];

  const body = rows
    .map(
      (row) => `<tr>
        <td><a href="/projects/${escapeHtml(row.id)}">${escapeHtml(row.title)}</a></td>
        <td>${escapeHtml(row.track)}</td>
        <td>${escapeHtml(row.team)}</td>
        <td class="muted">${escapeHtml(row.submitted_at.slice(0, 10))}</td>
        <td>${escapeHtml(row.summary)}</td>
      </tr>`,
    )
    .join("");

  return reply.type("text/html").send(
    shell(
      "Projects",
      `<table>
        <thead><tr><th>Project</th><th>Track</th><th>Team</th><th>Submitted</th><th>Summary</th></tr></thead>
        <tbody>${body}</tbody>
      </table>`,
      `${rows.length} projects`,
    ),
  );
});

app.get("/projects/new", async (_req, reply) => {
  const event = db.prepare("SELECT name, submissions_close FROM events LIMIT 1").get() as
    | { name: string; submissions_close: string }
    | undefined;
  const closed = !event || Date.parse(event.submissions_close) <= Date.now();
  return reply.type("text/html").send(
    shell(
      "Submit",
      `<form class="stack" id="submit-form">
        <h1>Submit</h1>
        <p class="muted">${escapeHtml(event?.name ?? "Event")} closes ${escapeHtml(event?.submissions_close ?? "unknown")}.</p>
        <input name="title" placeholder="Title" required ${closed ? "disabled" : ""}>
        <textarea name="summary" rows="3" placeholder="Summary" required ${closed ? "disabled" : ""}></textarea>
        <button type="submit" ${closed ? "disabled" : ""}>${closed ? "Submissions closed" : "Submit"}</button>
        <p id="result" class="muted"></p>
      </form>
      <script>
        document.getElementById("submit-form").addEventListener("submit", async (event) => {
          event.preventDefault();
          const data = Object.fromEntries(new FormData(event.target));
          const res = await fetch("/projects/new", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(data),
          });
          document.getElementById("result").textContent = res.status + " " + await res.text();
        });
      </script>`,
    ),
  );
});

app.get("/projects/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const project = db.prepare(`
    SELECT p.id, p.title, p.summary, p.repo_url, p.submitted_at, t.name AS track, tm.name AS team
    FROM projects p
    JOIN tracks t ON t.id = p.track_id
    JOIN teams tm ON tm.id = p.team_id
    WHERE p.id = ?
  `).get(id) as
    | { id: string; title: string; summary: string; repo_url: string; submitted_at: string; track: string; team: string }
    | undefined;
  if (!project) return reply.code(404).send("project not found");
  return reply.type("text/html").send(
    shell(
      project.title,
      `<div class="pane">
        <h1>${escapeHtml(project.title)}</h1>
        <p>${escapeHtml(project.summary)}</p>
        <p class="muted">${escapeHtml(project.team)} · ${escapeHtml(project.track)} · ${escapeHtml(project.submitted_at)}</p>
        <p><a href="${escapeHtml(project.repo_url)}">${escapeHtml(project.repo_url)}</a></p>
      </div>`,
    ),
  );
});

app.post("/projects/new", async (req, reply) => {
  const event = db.prepare("SELECT submissions_close FROM events LIMIT 1").get() as
    | { submissions_close: string }
    | undefined;
  if (!event || Date.parse(event.submissions_close) <= Date.now()) {
    return reply.code(400).send({ error: "submissions are closed" });
  }
  const user = currentUser(req);
  if (!user) return reply.code(401).send({ error: "authentication required" });
  if (user.role !== "participant" && user.role !== "organizer" && user.role !== "admin") {
    return reply.code(403).send({ error: "this role cannot submit" });
  }
  return reply.code(400).send({ error: "submission payload is incomplete for an open event" });
});

app.get("/api/judge/scores", async (req, reply) => {
  const user = currentUser(req);
  if (!user) return reply.code(401).send({ error: "authentication required" });
  if (user.role === "participant" || user.role === "visitor") {
    return reply.code(403).send({ error: "participants cannot read scores" });
  }

  const query = req.query as { judge?: string };
  if (query.judge && user.role === "judge") {
    const target = canonicalJudgeId(query.judge);
    if (target !== user.id) {
      return reply.code(403).send({
        error: "judges cannot read another judge's scores",
        authenticated_judge: user.id,
        attempted_target: query.judge,
      });
    }
  }

  const judgeId = user.role === "judge" ? user.id : canonicalJudgeId(query.judge ?? user.id);
  const scores = db
    .prepare(
      `SELECT id, project_id, judge_id, criteria_json, raw_score, normalized_score, comment
       FROM scores WHERE judge_id = ? ORDER BY id`,
    )
    .all(judgeId) as {
    id: number;
    project_id: string;
    judge_id: string;
    criteria_json: string;
    raw_score: number;
    normalized_score: number;
    comment: string;
  }[];

  return {
    judge_id: judgeId,
    scores_count: scores.length,
    scores: scores.map((score) => ({
      id: score.id,
      project_id: score.project_id,
      judge_id: score.judge_id,
      criteria: JSON.parse(score.criteria_json) as Record<string, number>,
      raw_score: score.raw_score,
      normalized_score: score.normalized_score,
      comment: score.comment,
    })),
  };
});

app.get("/api/export.csv", async (req, reply) => {
  const user = currentUser(req);
  if (!user) return reply.code(401).send({ error: "authentication required" });
  if (user.role !== "organizer" && user.role !== "admin") {
    return reply.code(403).send({ error: "only organizers can export" });
  }

  const rows = db.prepare(`
    SELECT p.id AS project_id, p.title, t.name AS track,
           COUNT(s.id) AS reviews_count,
           ROUND(AVG(s.raw_score), 3) AS raw_average,
           ROUND(MAX(s.normalized_score), 3) AS calibrated_score
    FROM projects p
    JOIN tracks t ON t.id = p.track_id
    LEFT JOIN scores s ON s.project_id = p.id
    GROUP BY p.id
    ORDER BY calibrated_score DESC, raw_average DESC, p.id
  `).all() as {
    project_id: string;
    title: string;
    track: string;
    reviews_count: number;
    raw_average: number | null;
    calibrated_score: number | null;
  }[];

  const header = "project_id,title,track,reviews_count,raw_average,calibrated_score";
  const lines = rows.map((row) =>
    [
      csv(row.project_id),
      csv(row.title),
      csv(row.track),
      String(row.reviews_count),
      String(row.raw_average ?? 0),
      String(row.calibrated_score ?? 0),
    ].join(","),
  );
  return reply
    .header("content-type", "text/csv; charset=utf-8")
    .header("content-disposition", 'attachment; filename="calibr8-scores.csv"')
    .send([header, ...lines].join("\n"));
});

function csv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

const port = Number(process.env.PORT ?? 8080);
await app.listen({ port, host: "0.0.0.0" });
