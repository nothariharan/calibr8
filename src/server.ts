import { canonicalJudgeId, currentUser, type SessionUser } from "./auth.js";
import { db, initSchema } from "./db/index.js";
import { appendAudit, rechainScores, verifyDatabase } from "./services/audit.js";
import { certificateFor, certificateSvg, checkSeal } from "./services/certificate.js";
import { calibrate, type Calibration } from "./services/lsc.js";
import { docsPage, openApiSpec } from "./services/openapi.js";
import { bradleyTerry, nextMatchup, recordComparison } from "./services/pairwise.js";
import { castQuadraticVote, publicResults, setVotingFrozen, voterStatus } from "./services/voting.js";
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
        <p><a href="/projects/${escapeHtml(project.id)}/certificate">Demo seal</a></p>
        <form class="row" id="vote-form">
          <input name="votes" type="number" min="0" max="10" value="0">
          <button type="submit">Set votes</button>
          <span id="vote-result" class="muted"></span>
        </form>
        <p class="muted">V votes cost V² credits. Public totals stay sealed until an organizer unfreezes them.</p>
      </div>
      <script>
        document.getElementById("vote-form").addEventListener("submit", async (event) => {
          event.preventDefault();
          const votes = Number(new FormData(event.target).get("votes"));
          const res = await fetch("/api/projects/${escapeHtml(project.id)}/vote", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ votes }),
          });
          document.getElementById("vote-result").textContent = res.status + " " + await res.text();
        });
      </script>`,
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

app.get("/api/calibrate", async () => liveCalibration());

app.get("/standings", async (_req, reply) => {
  const result = liveCalibration();
  const titles = new Map(
    (db.prepare("SELECT id, title FROM projects").all() as { id: string; title: string }[]).map((row) => [row.id, row.title]),
  );
  const names = new Map(
    (db.prepare("SELECT id, name FROM users").all() as { id: string; name: string }[]).map((row) => [row.id, row.name]),
  );
  const projects = [...result.projects].sort((a, b) => a.calibratedRank - b.calibratedRank);
  const judges = [...result.judges].sort((a, b) => a.bias - b.bias);
  const projectRows = projects
    .map(
      (project) => `<tr>
        <td class="num">${project.calibratedRank}</td>
        <td><a href="/projects/${escapeHtml(project.id)}">${escapeHtml(titles.get(project.id) ?? project.id)}</a></td>
        <td class="num">${project.rawAvg.toFixed(2)}</td>
        <td class="num">${project.calibrated.toFixed(3)}</td>
        <td class="num">${project.rankDelta > 0 ? "+" : ""}${project.rankDelta}</td>
        <td class="num">${project.reviewCount}</td>
      </tr>`,
    )
    .join("");
  const judgeRows = judges
    .map(
      (judge) => `<tr>
        <td>${escapeHtml(names.get(judge.id) ?? judge.id)}</td>
        <td class="num">${judge.bias.toFixed(3)}</td>
        <td class="num">${judge.rawMean.toFixed(2)}</td>
        <td class="num">${judge.reviewCount}</td>
      </tr>`,
    )
    .join("");
  return reply.type("text/html").send(
    shell(
      "Standings",
      `<table>
        <thead><tr><th>Rank</th><th>Project</th><th>Raw</th><th>Calibrated</th><th>Shift</th><th>Reviews</th></tr></thead>
        <tbody>${projectRows}</tbody>
      </table>
      <table>
        <thead><tr><th>Judge</th><th>Bias</th><th>Raw mean</th><th>Reviews</th></tr></thead>
        <tbody>${judgeRows}</tbody>
      </table>`,
      `mean ${result.globalMean.toFixed(2)}`,
    ),
  );
});

function liveCalibration() {
  const projectIds = (db.prepare("SELECT id FROM projects ORDER BY id").all() as { id: string }[]).map((row) => row.id);
  const judgeIds = (db.prepare("SELECT id FROM users WHERE role = 'judge' ORDER BY id").all() as { id: string }[]).map(
    (row) => row.id,
  );
  const reviews = db.prepare("SELECT project_id, judge_id, raw_score FROM scores").all() as {
    project_id: string;
    judge_id: string;
    raw_score: number;
  }[];
  return calibrate(
    projectIds,
    judgeIds,
    reviews.map((review) => ({ projectId: review.project_id, judgeId: review.judge_id, value: review.raw_score })),
  );
}

function csv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

app.post("/api/judge/scores", async (req, reply) => {
  const user = requireRole(req, reply, ["judge"]);
  if (!user) return;
  const body = req.body as { project_id?: string; stars?: number };
  if (!body.project_id || !Number.isInteger(body.stars) || body.stars! < 0 || body.stars! > 5) {
    return reply.code(400).send({ error: "project_id and integer stars from 0 to 5 are required" });
  }
  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(body.project_id);
  if (!project) return reply.code(404).send({ error: "project not found" });
  const criteria = JSON.stringify({ bars: body.stars });
  db.prepare(`
    INSERT INTO scores (judge_id, project_id, criteria_json, raw_score, comment)
    VALUES (?, ?, ?, ?, '')
    ON CONFLICT (judge_id, project_id) DO UPDATE SET
      criteria_json = excluded.criteria_json,
      raw_score = excluded.raw_score
  `).run(user.id, body.project_id, criteria, body.stars);
  rechainScores();
  storeCalibration(liveCalibration());
  appendAudit(user.id, "SCORE_SUBMITTED", { projectId: body.project_id, stars: body.stars });
  return { ok: true };
});

app.get("/events/:event_id/judges/:judge_id/feed", async (req, reply) => {
  const user = requireRole(req, reply, ["judge"]);
  if (!user) return;
  const { event_id, judge_id } = req.params as { event_id: string; judge_id: string };
  if (judge_id !== user.id) return reply.code(403).send("this feed belongs to another judge");
  const event = db.prepare("SELECT id FROM events WHERE id = ?").get(event_id);
  if (!event) return reply.code(404).send("event not found");
  const tracks = JSON.parse(
    (db.prepare("SELECT tracks_json FROM users WHERE id = ?").get(user.id) as { tracks_json: string }).tracks_json,
  ) as string[];
  const projects = tracks.length
    ? (db.prepare(`
        SELECT p.id, p.title, p.summary, p.repo_url, t.name AS track, tm.name AS team,
               s.raw_score AS stars
        FROM projects p
        JOIN tracks t ON t.id = p.track_id
        JOIN teams tm ON tm.id = p.team_id
        LEFT JOIN scores s ON s.project_id = p.id AND s.judge_id = ?
        WHERE p.track_id IN (${tracks.map(() => "?").join(",")})
        ORDER BY p.id
      `).all(user.id, ...tracks) as Record<string, unknown>[])
    : [];
  return reply.type("text/html").send(shell("Feed", feedMarkup(projects), `${projects.length} in track`));
});

app.get("/events/:event_id/judges/:judge_id/pairwise", async (req, reply) => {
  const user = requireRole(req, reply, ["judge"]);
  if (!user) return;
  const { judge_id } = req.params as { judge_id: string };
  if (judge_id !== user.id) return reply.code(403).send("this comparison belongs to another judge");
  const matchup = nextMatchup(user.id);
  if (!matchup) return reply.type("text/html").send(shell("Pairs", `<div class="pane"><p>No remaining pair in your tracks.</p></div>`));
  const band = matchup.inTieBand
    ? `Gap ${matchup.gap.toFixed(3)}. Inside 0.05.`
    : `Closest gap is ${matchup.gap.toFixed(3)}, which is outside 0.05. No ballot is accepted.`;
  return reply.type("text/html").send(
    shell(
      "Pairs",
      `<div class="split">
        <section class="pane"><h1>${escapeHtml(matchup.projectA.title)}</h1><p>${escapeHtml(matchup.projectA.summary)}</p><p class="muted">${escapeHtml(matchup.projectA.track)} · ${matchup.projectA.calibrated.toFixed(3)}</p></section>
        <section class="pane"><h1>${escapeHtml(matchup.projectB.title)}</h1><p>${escapeHtml(matchup.projectB.summary)}</p><p class="muted">${escapeHtml(matchup.projectB.track)} · ${matchup.projectB.calibrated.toFixed(3)}</p></section>
      </div>
      <p class="muted" style="padding:6px 10px">${band} Keys 1 and 2 choose a side when the gap is inside the band.</p>
      <script>
        const bandOk = ${matchup.inTieBand ? "true" : "false"};
        const left = ${JSON.stringify(matchup.projectA.id)};
        const right = ${JSON.stringify(matchup.projectB.id)};
        document.addEventListener("keydown", async (event) => {
          if (!bandOk || (event.key !== "1" && event.key !== "2")) return;
          const winner = event.key === "1" ? left : right;
          const res = await fetch("/api/pairwise/compare", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ project_a_id: left, project_b_id: right, winner_id: winner }),
          });
          if (res.ok) location.reload();
        });
      </script>`,
    ),
  );
});

app.post("/api/pairwise/compare", async (req, reply) => {
  const user = requireRole(req, reply, ["judge"]);
  if (!user) return;
  const body = req.body as { project_a_id?: string; project_b_id?: string; winner_id?: string };
  if (!body.project_a_id || !body.project_b_id || !body.winner_id) return reply.code(400).send({ error: "missing projects" });
  const scores = db.prepare(`
    SELECT project_id, MAX(normalized_score) AS calibrated
    FROM scores WHERE project_id IN (?, ?) GROUP BY project_id
  `).all(body.project_a_id, body.project_b_id) as { project_id: string; calibrated: number }[];
  if (scores.length === 2 && Math.abs(scores[0].calibrated - scores[1].calibrated) >= 0.05) {
    return reply.code(400).send({ error: "this pair is outside the 0.05 tie band" });
  }
  const result = recordComparison(user.id, body.project_a_id, body.project_b_id, body.winner_id);
  if (!result.ok) return reply.code(400).send(result);
  return { ok: true };
});

app.get("/api/pairwise/rankings", async () => bradleyTerry());

app.post("/api/projects/:id/vote", async (req, reply) => {
  const user = currentUser(req);
  if (!user) return reply.code(401).send({ error: "authentication required" });
  if (user.role === "judge") return reply.code(403).send({ error: "judges do not cast community votes" });
  const { id } = req.params as { id: string };
  const votes = (req.body as { votes?: number }).votes;
  const result = castQuadraticVote(user.id, id, Number(votes));
  if (!result.ok) return reply.code(400).send(result);
  return result;
});

app.get("/api/voting/results", async (req) => {
  const user = currentUser(req);
  return publicResults(user?.role === "organizer" || user?.role === "admin");
});

app.post("/api/voting/unfreeze", async (req, reply) => {
  const user = requireRole(req, reply, ["organizer", "admin"]);
  if (!user) return;
  setVotingFrozen(false, user.id);
  return { ok: true, status: "RESULTS_PUBLIC" };
});

app.get("/api/audit/verify", async () => verifyDatabase());

app.get("/api/openapi.json", async () => openApiSpec);

app.get("/docs", async (_req, reply) => reply.type("text/html").send(shell("Docs", docsPage(openApiSpec))));

app.get("/projects/:id/certificate", async (req, reply) => {
  const data = certificateFor((req.params as { id: string }).id);
  if (!data) return reply.code(404).send("project not found");
  return reply.type("image/svg+xml").send(certificateSvg(data));
});

app.get("/verify", async (req, reply) => {
  const query = req.query as { project?: string; signature?: string };
  const result = query.project && query.signature ? checkSeal(query.project, query.signature) : null;
  return reply.type("text/html").send(
    shell(
      "Verify",
      `<form class="stack">
        <h1>Verify a demo seal</h1>
        <p class="muted">The HMAC key is committed in source. This checks that the SVG was produced by this server, not that a third party vouches for it.</p>
        <input name="project" placeholder="prj_01" value="${escapeHtml(query.project ?? "")}">
        <input name="signature" placeholder="signature" value="${escapeHtml(query.signature ?? "")}">
        <button>Check</button>
        <p>${result ? (result.valid ? "Valid demo seal." : "Not a match.") : "Drop an SVG or paste the signature."}</p>
      </form>
      <script>
        document.body.addEventListener("dragover", (event) => event.preventDefault());
        document.body.addEventListener("drop", async (event) => {
          event.preventDefault();
          const text = await event.dataTransfer.files[0].text();
          const project = text.match(/data-project="([^"]+)"/)?.[1];
          const signature = text.match(/data-signature="([^"]+)"/)?.[1];
          if (project && signature) location.search = "?project=" + project + "&signature=" + signature;
        });
      </script>`,
    ),
  );
});

function feedMarkup(projects: Record<string, unknown>[]): string {
  return `<div class="split">
    <section class="pane" id="left"></section>
    <section class="pane" id="right"></section>
  </div>
  <script>
    const projects = ${JSON.stringify(projects).replaceAll("<", "\\u003c")};
    const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    let index = 0;
    let stars = null;
    const left = document.getElementById("left");
    const right = document.getElementById("right");
    function render() {
      const project = projects[index];
      if (!project) { left.innerHTML = "<p>No projects in your tracks.</p>"; return; }
      stars = project.stars === null || project.stars === undefined ? null : Number(project.stars);
      left.innerHTML = "<h1>" + esc(project.title) + "</h1><p>" + esc(project.summary) + "</p><p class='muted'>" + esc(project.team) + " · " + esc(project.track) + "</p><p>" + esc(project.repo_url) + "</p><p class='muted'>No local tree scanned for this fixture row.</p>";
      const buttons = [0,1,2,3,4,5].map((n) => "<button type='button' data-star='" + n + "' aria-pressed='" + (stars === n) + "'>" + n + "</button>").join("");
      right.innerHTML = "<p>" + (index + 1) + " / " + projects.length + "</p><p>0 broken · 3 works · 5 exceptional</p><div class='stars row'>" + buttons + "</div><p class='muted'>J/K move. 0-5 rate. Enter commits.</p><p id='status'></p>";
      right.querySelectorAll("[data-star]").forEach((button) => button.addEventListener("click", () => { stars = Number(button.getAttribute("data-star")); render(); }));
    }
    document.addEventListener("keydown", async (event) => {
      if (event.key === "j" || event.key === "ArrowDown") { index = Math.min(projects.length - 1, index + 1); render(); }
      if (event.key === "k" || event.key === "ArrowUp") { index = Math.max(0, index - 1); render(); }
      if (event.key >= "0" && event.key <= "5") { stars = Number(event.key); render(); }
      if (event.key === "Enter" && stars !== null && projects[index]) {
        const res = await fetch("/api/judge/scores", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ project_id: projects[index].id, stars }) });
        document.getElementById("status").textContent = res.ok ? "Saved" : await res.text();
        if (res.ok) projects[index].stars = stars;
      }
    });
    render();
  </script>`;
}

function requireRole(req: Parameters<typeof currentUser>[0], reply: { code: (status: number) => { send: (body: unknown) => unknown } }, roles: string[]): SessionUser | null {
  const user = currentUser(req);
  if (!user) {
    reply.code(401).send({ error: "authentication required" });
    return null;
  }
  if (!roles.includes(user.role)) {
    reply.code(403).send({ error: "forbidden" });
    return null;
  }
  return user;
}

function storeCalibration(result: Calibration): void {
  const update = db.prepare("UPDATE scores SET normalized_score = ? WHERE project_id = ?");
  for (const project of result.projects) update.run(project.calibrated, project.id);
  rechainScores();
}

const port = Number(process.env.PORT ?? 8080);
await app.listen({ port, host: "0.0.0.0" });
