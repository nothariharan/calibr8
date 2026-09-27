# calibr8 — Build Plan

calibr8 is an offline hackathon judging portal. Judges score projects on one screen. A ridge-regularized least-squares calibration separates project quality from judge leniency. The portal is built for DOGFOOD 2026 and must boot with `docker compose up` and no network.

Repository: https://github.com/nothariharan/calibr8.git

This file is the source of truth for order of work. A step is done only when its exit check has been run in this repo and the artifact named below exists. Until then, docs, chat, and the README describe that step as not done.

## Honesty rule

The hackathon spec penalizes claiming a tier or bonus that `run.py` or a hand judge cannot reproduce. Copy in this repo describes only the latest saved check output.

- `.dogfood.toml` `claimed` lists a tier only after `acceptance-report.txt` shows that tier as verified, and every tier below it verified.
- Numbers in judging notes are pasted from a command that is still in the repo and can be rerun.
- A feature that exists only as a design note is labeled **not started**. A feature with code but no saved run is labeled **unverified**.

## What is true right now

| Item | State |
|---|---|
| This GitHub repository | Empty before this plan. No application code. |
| `docker compose up` in calibr8 | Not started. |
| `python run.py .dogfood.toml` | Not started. No `acceptance-report.txt`. |
| LSC solver, fact extractor, Reels UI, audit chain | Not started in this repo. |
| Quadratic voting, Bradley-Terry, OpenAPI, SVG certificates | Deferred. Not in the critical path. |

A prior draft sits at `C:\Users\HARIHARAN\Desktop\Noog` (package name `reel-eval`, one local commit, no git remote). That tree is reference material only. It is not evidence that calibr8 works. Its README, `JUDGING.md`, `CONTINUE.md`, and acceptance write-up are not copied here. Uncommitted files in that draft (quadratic voting, pairwise, OpenAPI, certificates) stay out of calibr8 until the bonus phase, and only in the order below.

## Critical path

Do not start step N+1 until step N's exit artifact is in the tree and has been read.

### 1. Scaffold

Branch: `step/01-scaffold`

Fastify, TypeScript, `better-sqlite3` in WAL mode, one SQLite file, Docker.

- `docker-compose.yml` publishes port 8080.
- `GET /health` returns 200 with no auth.
- A seed script creates the database file and the session tokens the acceptance checker will send. It does not need the full fixture graph yet.
- The process starts with no outbound network and no third-party auth.

Exit: `docker compose up --build` serves `GET /health` on `http://localhost:8080/health`. Record the command and the response in `evidence/01-scaffold.txt`.

### 2. The seven acceptance checks

Branch: `step/02-acceptance`

Implement real routes, not handlers that return a fixed status. Wire them to the seeded database.

`run.py` sends exactly these requests. Paths come from `.dogfood.toml`.

| Tier | Check | Request | Pass |
|---|---|---|---|
| T1 | gallery is public | `GET /projects`, no auth | 200 |
| T1 | project from fixtures shown | same body | contains a title from the first projects in `fixtures.json` |
| T1 | closed event refuses submissions | `POST /projects/new` as participant, JSON `{title, summary}` | 4xx. Fixture `submissions_close` is `2026-03-01T18:00:00Z`. |
| T2 | judge sees own scores | `GET /api/judge/scores` as `judge_a` | 200 |
| T2 | judge cannot see peer scores | `GET /api/judge/scores?judge=judge_a` as `judge_b` | 401 or 403 |
| T2 | participant blocked | `GET /api/judge/scores` as participant | 401 or 403 |
| T2 | csv export works | `GET /api/export.csv` as organizer | 200 and a comma on line 1 |

Session headers, copied into `.dogfood.toml`:

- organizer: `Cookie: session=org_7f2a`
- judge_a: `Cookie: session=jdg_a_91bc`
- judge_b: `Cookie: session=jdg_b_44de`
- participant: `Cookie: session=prt_2e88`

`claimed` in `.dogfood.toml` starts as `["T1", "T2"]` only when this step passes. It does not list T3 or T4.

Exit: with the server running, `python run.py .dogfood.toml > acceptance-report.txt`. The file shows seven `PASS` lines and `claimed T1 T2, verified T1 T2`. If a line fails, fix the route and rerun. Do not hand-edit the report.

### 3. LSC solver

Branch: `step/03-lsc`

Ridge-regularized least squares on the real `fixtures.json` reviews.

Model: `s_k = θ_i(k) + b_j(k) + ε_k`.

Normal equations: `(AᵀA + Γ) [θ; b] = Aᵀs + p`, with `γ₁ = 0.5` on projects and `γ₂ = 1.0` on judges. The diagonal prior keeps a judge who gave every project the same score from dividing by zero.

Ship a zero-dependency Python 3 script, `scripts/calibrate.py`, runnable as `npm run calibrate:proof` and as `python scripts/calibrate.py fixtures.json`. A TypeScript port may follow only after the Python script's output is saved. The script prints project ranks, raw average versus calibrated score, and per-judge bias. It does not read numbers from a markdown file.

Exit: `evidence/03-lsc.txt` is the unmodified stdout of that command. Judging notes may quote those numbers only after the file exists. Rerun the command and diff it if the solver changes.

### 4. Fact extractor

Branch: `step/04-facts`

Deterministic scan of a project tree. No language model.

Signals, each true only when the file evidence is present:

- database driver (`better-sqlite3`, `pg`, `mongodb`, and the Python equivalents in a manifest)
- schema validator (`zod`, `pydantic`, `joi`)
- test files and the runner named in the manifest (`vitest`, `pytest`)

Same-track contrast is a pure function of two fact records. It does not invent a dependency the scan missed.

Exit: a test runs the scanner on at least two trees that are not `fixtures.json` project rows. Use this repository and one other real tree on disk (the Noog draft is allowed as an input sample). Save stdout to `evidence/04-facts.txt`. The test fails if a fact is reported for a package that is not in that tree's manifest or test files.

### 5. Reels judge workspace

Branch: `step/05-reels`

Route: `/events/:event_id/judges/:judge_id/feed`

One full-screen project at a time. The page reads projects, facts, and that judge's own scores from the database built in steps 2 and 4.

- `J` or ArrowDown: next project
- `K` or ArrowUp: previous project
- `0`–`5`: behaviorally anchored rating
- Enter: store that judge's ballot and advance

The judge id in the path is checked against the session. Judge B opening Judge A's feed gets 403, same rule as the scores API.

Anchors, stored with the ballot:

| Stars | Meaning |
|---|---|
| 0 | Broken or a façade. Does not boot, or state is mock JSON. |
| 1 | Endpoints exist. Persistence round-trip fails. |
| 2 | Database works. Validation, errors, or tests are missing. |
| 3 | End-to-end path works and survives reload. |
| 4 | Validation, error states, and tests are present. |
| 5 | The above, plus a design that is specific to the problem. |

Exit: `evidence/05-reels.txt` records a manual or scripted pass: load the feed as `judge_a`, commit a score with the keyboard, reload, and see that score on `GET /api/judge/scores`. Then rerun `run.py` and confirm the seven checks still pass.

### 6. Hash-chained audit log

Branch: `step/06-audit`

Append-only `audit_log`. Each row stores `prev_hash` and

`hash = SHA256(prev_hash || actor_id || action || payload || timestamp)`.

Score inserts get the same treatment on the score row, with the fields that were actually written (judge, project, criteria, raw score). `GET /api/audit/verify` recomputes both chains.

Exit: `evidence/06-audit.txt` shows a valid chain, then a one-row tamper in a copy of the database, then `verified: false`. Restore the real database afterward. Rerun `run.py`.

### 7. Bonuses, only after step 6

One branch per bonus. Stop when time runs out. Do not describe an unstarted bonus as implemented.

1. **Bradley-Terry** (`step/07a-pairwise`). This is the bonus with points. Route `/events/:event_id/judges/:judge_id/pairwise`. Comparisons stay inside one track. The pair is chosen from projects whose calibrated scores differ by less than 0.05, once step 3 has written those scores. One row per judge per unordered pair. Hunter MM is the solver. Projects with zero matches are omitted from the ranking. The route enforces the same judge identity check as the feed.
2. **Quadratic voting** (`step/07b-voting`). 100 credits per voter. `V` votes cost `V²` credits. `V` is an integer from 0 to 10. Public standings sum votes, not credits. While sealed, the public results route returns a status and no totals. The voter's own ballot stays visible to that voter. Unfreeze is an organizer action and an audit event.
3. **OpenAPI 3.1** (`step/07c-openapi`). `GET /api/openapi.json` and a `/docs` page whose HTML and spec are served by this process. No CDN script tags.
4. **SVG certificates** (`step/07d-certs`). Only with an honest signature story. A HMAC key that is committed in source is a demo seal, and the docs must say that. Do not call it a digital credential.

## How the finished system connects

Facts are evidence on the judge's screen. They are not inputs to the normal equations. Ballots are the observations LSC splits into project quality `θ` and judge bias `b`. Quadratic totals, when they exist, are a separate column from `θ`. Bradley-Terry, when it exists, orders pairs that LSC did not separate. The audit log records writes. It does not change scores.

## Branches

`main` holds this plan and, later, merges whose exit artifact is in the commit. Implementation happens on `step/01-scaffold` through `step/07d-certs`. Use a git worktree when two steps would otherwise edit the same checkout. Do not open a later step's branch to "get ahead" while the previous exit file is missing.

## Commands the later steps will standardize

```bash
docker compose up --build
python run.py .dogfood.toml > acceptance-report.txt
npm run calibrate:proof
```

Those commands are not available until the step that introduces them has landed.

## Explicitly out of scope until the path above is green

AWS or Vercel deploy, accounts on Clerk/Auth0/Supabase, webhooks, a threat-model essay, a demo video, and any README sentence about memory, boot time, or minutes-per-project unless a measurement file in `evidence/` records it.
