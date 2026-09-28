# calibr8

Offline hackathon judging portal. One container, SQLite, no hosted accounts.

```bash
docker compose up --build
```

Open http://localhost:8080. The header buttons set the fixture session cookie: Organizer, Judge A, Judge B, Participant.

## What is verified

`acceptance-report.txt` records `python run.py .dogfood.toml`: seven checks, `claimed T1 T2, verified T1 T2`.

`evidence/03-lsc.txt` is `python scripts/calibrate.py fixtures.json`. On that run the calibrated top three are Iron Switch (`prj_34`, 4.191), Salt Ledger (`prj_11`, 4.143), and Dry Relay (`prj_25`, 4.039). `/api/calibrate` uses the same solver.

`evidence/04-facts.txt` scans this repo and the Noog tree. It reports `better-sqlite3` here, and `better-sqlite3` plus `psycopg2` from `research/gavel/requirements.txt` in Noog. Fixture projects have no local tree, so the judge feed does not invent dependencies for them.

`evidence/05-reels.txt`: Judge A loads the feed, Judge B opening Judge A's feed gets 403, and a committed 4-star ballot shows up on Judge A's scores.

`evidence/06-audit.txt`: the live hash chain verifies, and a copied database with one altered score does not.

`evidence/07-bonuses.txt`: docs load with no CDN, the SVG seal renders, a 2-vote ballot costs 4 credits, public results stay `BLIND_VOTING_ACTIVE`, and the pairwise page loads.

## Pages

The UI is a Vite + React app in `web/`, built to `web/dist` and served by the same Fastify process. Line drawings are SVG generated in the browser. Fastify, SQLite, and the acceptance routes stay on port 8080.

| Path | What it shows |
|---|---|
| `/` | Landing page |
| `/projects` | Gallery of every fixture project |
| `/standings` | Raw average, calibrated score, judge bias |
| `/feed` | Signed-in judge's track. Stars 0–5 save that judge's ballot |
| `/pairs` | Same-track pair. A ballot is accepted only when the calibrated gap is under 0.05 |
| `/docs` | OpenAPI 3.1 paths, served by this process |
| `/projects/prj_34/certificate` | SVG demo seal |
| `/verify` | Recomputes that seal |

`/events/evt_01/judges/jdg_01/feed` is still the server route that returns 403 when another judge opens it.

The seal key is the constant `DEMO_SEAL_KEY` in `src/services/certificate.ts`. Anyone with the source can recompute it.

`.dogfood.toml` claims T1 and T2 only. Those are the tiers `run.py` can verify.
