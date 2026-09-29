# calibr8

Offline hackathon judging portal. One container, SQLite, no hosted accounts.

```bash
docker compose up --build
```

Open http://localhost:8080/signin. Each seeded person signs in with their email. The password is the part before `@`, with dots written as hyphens. Tomas Varga is `tomas.varga@example.org` / `tomas-varga`. He sees the hackathons he is assigned to, then the projects in that hackathon, then scores one project on functionality, quality, and innovation. Wei Lindqvist is `wei.lindqvist@example.org` / `wei-lindqvist`. The organizer is `organizer@example.org` / `organizer` and sees standings inside a hackathon. The participant is `participant@example.org` / `participant`. That email is not on a fixture team.

## What is verified

`acceptance-report.txt` records `python run.py .dogfood.toml`: seven checks, `claimed T1 T2, verified T1 T2`.

`evidence/03-lsc.txt` is `python scripts/calibrate.py fixtures.json`. On that run the calibrated top three are Iron Switch (`prj_34`, 4.191), Salt Ledger (`prj_11`, 4.143), and Dry Relay (`prj_25`, 4.039). `/api/calibrate` uses the same solver.

`evidence/04-facts.txt` scans this repo and the Noog tree. It reports `better-sqlite3` here, and `better-sqlite3` plus `psycopg2` from `research/gavel/requirements.txt` in Noog. Fixture projects have no local tree, so the judge feed does not invent dependencies for them.

`evidence/05-reels.txt`: Judge A loads the feed, Judge B opening Judge A's feed gets 403, and a committed 4-star ballot shows up on Judge A's scores.

`evidence/06-audit.txt`: the live hash chain verifies, and a copied database with one altered score does not.

`evidence/07-bonuses.txt`: docs load with no CDN, the SVG seal renders, a 2-vote ballot costs 4 credits, public results stay `BLIND_VOTING_ACTIVE`, and the pairwise page loads.

## Pages

The UI is a Vite + React app in `web/`, built to `web/dist` and served by the same Fastify process. Fastify, SQLite, and the acceptance routes stay on port 8080.

| Path | What it shows |
|---|---|
| `/` | Landing page |
| `/signin` | Email and password |
| `/dashboard` | Hackathons for the signed-in account |
| `/dashboard/:eventId` | Projects in that hackathon. Organizers also see standings and the hash chain |
| `/dashboard/:eventId/projects/:projectId` | One project. A judge scores it here |
| `/docs` | OpenAPI 3.1 paths, served by this process |
| `/projects/prj_34/certificate` | SVG demo seal |
| `/verify` | Recomputes that seal |

`GET /projects` still returns the fixture titles for the acceptance checker. `/events/evt_01/judges/jdg_01/feed` still returns 403 when another judge opens it.

A judge does not see the calibrated ranking. That list is on the organizer's hackathon page.

The seal key is the constant `DEMO_SEAL_KEY` in `src/services/certificate.ts`. Anyone with the source can recompute it. It is a demo seal, not a credential.

## Beyond the checker

`run.py` only verifies T1 and T2. `.dogfood.toml` claims those two tiers and nothing else. These extra surfaces are in the repo for a manual look. They are not claimed as verified tiers.

- Calibration is the ridge least-squares script above. A live ballot stores functionality, quality, and innovation. The raw score is their mean, then the same solver runs again.
- Pairwise ballots are stored only when the calibrated gap is under 0.05. The route is `/api/pairwise/compare`.
- Quadratic votes use an integer V from 0 to 10, cost V², budget 100. While frozen, public results return `BLIND_VOTING_ACTIVE`.
- The score hash is SHA-256 of the previous hash, the judge, the project, the criteria, and the raw score. `evidence/06-audit.txt` records a valid chain and a tampered copy.
- Facts come from dependency manifests. They are not terms in the calibration equations.
