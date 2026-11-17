# API tests (Postman collection + newman)

Black-box tests that call a **running** G-Scores API over HTTP and check real answers from the 2024 dataset.

| | Jest e2e (`backend/test`) | **newman (`testing/`)** | `scripts/smoke-check.sh` |
|---|---|---|---|
| Data | 9 hand-made candidates, own database | the real 1,061,605 rows | the real data |
| Runs against | Nest app in-process | any URL: local, docker compose, a live deployment | any URL |
| Purpose | exact logic, edge cases | API contract and real-world values | "is it up?" in a few seconds |

## Run

```bash
# 1. a seeded stack must be up (pick one)
docker compose up -d --build          # API on :3000 behind web on :8080
#   or: docker compose up -d postgres && cd backend && npm run migrate && npm run seed && npm run start:dev

# 2. run the suite
cd testing
npm install
npm test                    # http://localhost:3000/api
npm run test:compose        # http://localhost:8080/api (through nginx)
npm test -- --env-var baseUrl=https://your-domain.example/api   # any deployment, e.g. a post-deploy check
```

`npm run test:ci` writes `reports/junit.xml` (for CI test summaries), `npm run test:html` writes `reports/report.html`.
`reports/` is git-ignored. newman exits non-zero when any assertion fails.

## Benchmark (latency per endpoint)

```bash
npm run bench                       # 10 warm-up + 200 measured iterations against http://localhost:3000/api
BASE_URL=https://host/api BENCH_ITERATIONS=500 npm run bench
```

`scripts/benchmark.mjs` drives `collections/gscores.benchmark.postman_collection.json` through newman's API,
feeds a different real candidate number into every iteration (sampled across the whole dataset, so lookups hit
different parts of the index), drops the warm-up iterations, and prints **avg / p50 / p95 / max** per endpoint.
It also writes `reports/benchmark.json` and `reports/benchmark.md` (a table ready to paste into a README) and
exits non-zero if any request is not a clean 200, so a broken API can never produce "fast" numbers.

> **Known limitation.** The benchmark sends a distinct `X-Forwarded-For` with every request so the per-IP rate
> limit (60 requests/min) does not throttle the load. That works only because the API currently trusts that header
> from anyone (`trust proxy: true`). Once proxy trust is restricted to the real number of hops, run the API under
> test with a relaxed throttle instead.

## In CI

The collection is meant to run both ways: by hand (`npm test`) and as a CI step. In the four-tier workflow it
belongs in tier 3 (against the docker compose stack, `npm run test:compose`) and tier 4 (against the live URL,
`npm test -- --env-var baseUrl=$LIVE_URL`). Use `npm run test:ci` there for a JUnit report.

## What is covered (20 requests, ~100 assertions)

- **Health and catalog:** `/health`, `/subjects` (9 subjects, 5 groups)
- **Score lookup:** a full score sheet, the top scorer, whitespace trimming, and the 400 / 404 paths
- **Reports:** four levels in order, counts match the dataset, grand total across subjects
- **Rankings:** order, rank numbers, totals equal the sum of the scores, `limit` handling, other groups, 404 / 400 paths
- **Overview:** totals, top scorers per group, per-subject stats, and consistency with `/reports`
- **Every request:** answers with JSON (errors too) and stays under the response-time budget (`maxResponseMs`, default 1500)

## Updating the expectations

Dataset-specific numbers live in `environments/*.postman_environment.json` (`totalCandidates`, `totalPapers`,
`totalPerfectScores`, `knownSbd`, `topSbd`). A few candidate numbers and counts (for example the top three of A00)
are written inside the requests. If the dataset changes, update those values.

The collection and environments are standard Postman v2.1 files: you can import them into Postman, edit there and
export again over the same files.
