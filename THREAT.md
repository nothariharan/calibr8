# Threat model

This is the written model for voting and submission abuse on the offline portal. It names what the code stops, and what it does not. The hosted page at `calibr-demo-sigma.vercel.app` is a browser walkthrough. Ballots there never reach this server, so the controls below apply to `docker compose up`, not to that page.

## What a caller is

Accounts are the seeded rows. A session cookie is one of those people. There is no open signup. A request is the role on that cookie: organizer, judge, or participant. Role checks run in the route that handles the request.

## Attacks

| Attack | What happens here |
|---|---|
| Deadline gaming | `POST /projects/new` after `submissions_close` returns 4xx. The fixture event closes at `2026-03-01T18:00:00Z`. The clock is the machine running the container. There is no outside timestamp. |
| Reading another judge's scores | `GET /api/judge/scores?judge=judge_a` as judge B returns 403. A participant on that route returns 403. |
| Scoring outside your tracks | A judge ballot for a project off their assignment returns 403. |
| Community votes from a judge | `POST /api/projects/{id}/vote` as a judge returns 403. |
| One person flooding the public tally | A quadratic vote is an integer V from 0 to 10. It costs V² credits. The budget is 100. The public route sums votes. While frozen it returns `BLIND_VOTING_ACTIVE` and no totals. |
| Pairwise stuffing outside a close call | `POST /api/pairwise/compare` rejects a pair from two hackathons, or a pair whose calibrated scores differ by 0.05 or more. |
| Quiet edits to a stored score | Each score row is on a SHA-256 chain of the previous hash, judge, project, criteria, and raw score. `GET /api/audit/verify` recomputes it. `evidence/06-audit.txt` shows a valid chain and a tampered copy that fails. |

## What this does not stop

- **Sybil accounts.** Nobody can register, but anyone who has a seeded cookie is that person. Sharing `jdg_a_91bc` shares that judge. The demo page does not check cookies at all.
- **A judge rewriting their own ballot.** Sending the same project again replaces the row. The chain records the write. It does not refuse the second one.
- **Scraping the gallery.** `GET /projects` is public. That is the T1 check. Titles are meant to be readable without a session.
- **Judge collusion.** Two judges can agree before they score. The least-squares fit estimates each judge's lean from the ballots. It does not know they planned the numbers together.
- **A forged seal.** The certificate HMAC key is the constant `DEMO_SEAL_KEY` in `src/services/certificate.ts`. Anyone with the source can recompute it. It is a demo seal.
- **Hidden vote totals as secrecy.** Sealed results are omitted from the public JSON. They are not encrypted. An organizer, and anyone with the SQLite file, can read the rows.

Facts on the judge's card come from the project manifest. They are not a proof that the project works, and they are not terms in the calibration.
