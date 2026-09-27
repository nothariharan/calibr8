# AGENTS.md

Instructions for any agent working in this repository.

## Project

calibr8 is an offline DOGFOOD 2026 judging portal: Fastify, TypeScript, embedded SQLite, one Docker container, port 8080. The product name in package metadata, UI, and docs is **calibr8**. Do not introduce the name REEL-EVAL in new files.

Repository: https://github.com/nothariharan/calibr8.git

Read `PLAN.md` before editing. The status table at the top is the current step. Update that table when an exit artifact is actually produced. Do not mark a step done because the code compiles.

## Integrity

Saying the project got further than it did is a scoring penalty. Follow these rules on every change:

- Describe a step as done only when its `evidence/` file or `acceptance-report.txt` is in the tree and was produced by the command in `PLAN.md`.
- Do not hand-write `acceptance-report.txt`. Generate it with `python run.py .dogfood.toml`.
- Do not put calibrated scores, rank deltas, or bias figures into markdown unless they were copied from `evidence/03-lsc.txt` after a fresh run.
- Do not list T3, T4, or a bonus in `.dogfood.toml` `claimed` until that tier's checks pass. The checker only automates T1 and T2. Later tiers are hand-judged, which makes over-claiming easier to notice, not harder.
- Do not describe vote totals as encrypted, certificates as verifiable credentials, or the fact scan as an AST pass unless the code does that specific thing.

## Order of work

Implement only the current step in `PLAN.md`. The order is fixed:

1. Scaffold (`docker compose up`, `GET /health`)
2. Seven `run.py` checks against real routes
3. LSC script on `fixtures.json`
4. Fact extractor, tested on two real trees that are not fixture rows
5. Reels UI on that data
6. Hash-chained audit log, including a tamper check
7. Bonuses, Bradley-Terry first, then quadratic voting, then offline OpenAPI, then SVG certificates

If a request skips ahead, do the missing earlier step first. Quadratic voting, pairwise judging, OpenAPI, and certificates are not part of steps 1–6.

## Prior draft

`C:\Users\HARIHARAN\Desktop\Noog` is an older draft. You may read it to recover a route shape or the fixture file. Do not copy its README, architecture essays, or acceptance claims. Re-run every check inside calibr8 after any port. Prefer writing the small version the current step needs over pasting the whole draft.

## Stack constraints

- Node.js 22, TypeScript, Fastify, `better-sqlite3` (synchronous, WAL).
- Python 3 standard library only for `run.py` and `scripts/calibrate.py`. No numpy.
- No Auth0, Clerk, Firebase, Supabase, or other hosted auth. Sessions are the four fixture cookies in `.dogfood.toml`.
- Role checks live in the route handler. A judge session must not read another judge's scores, even if the query string names that judge.
- `/docs` and any other UI must work with the network disconnected. No CDN assets.

## Branches and worktrees

- `main` is the plan plus merged steps that have their exit artifact.
- One branch per step: `step/01-scaffold` … `step/07d-certs`.
- Add a git worktree only when two steps must be checked out at once. Do not start the next step's branch while the current exit check is failing.

## Verification before you finish a step

1. Run the exit command in `PLAN.md`.
2. Read the output. Fix failures. Rerun.
3. Save that output under `evidence/` with the name the plan specifies.
4. Update the status table in `PLAN.md` to match the files on disk.
5. For any step after acceptance exists, rerun `python run.py .dogfood.toml` and keep seven passes.

## Scope

Do not add deploy pipelines, webhooks, or measurement claims (memory, boot time, seconds per project) without a saved measurement. Do not blend community votes into the LSC quality score. Facts explain a project to the judge; they are not terms in the normal equations.

## Commits

Commit only when the user asks. Do not push unless the user asks. Do not put secrets in the tree. A certificate HMAC key committed as a constant must be documented as a demo seal if that step is ever reached.
