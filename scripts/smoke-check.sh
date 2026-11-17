#!/usr/bin/env bash
# HTTP smoke check against a running G-Scores stack, used by CI for both:
#   - tier 3: the docker compose stack  (http://localhost:8080)
#   - tier 4: the live deployment       ($LIVE_URL)
#
# Assertions use the real 2024 dataset (1,061,605 rows), so run it against a fully seeded stack.
#
# Usage:  scripts/smoke-check.sh <base-url>
# Env:    WAIT_SECONDS=300   poll /api/health for up to N seconds before checking (default: don't wait)
set -euo pipefail

BASE="${1:?usage: smoke-check.sh <base-url>}"
BASE="${BASE%/}"
WAIT_SECONDS="${WAIT_SECONDS:-0}"

fail() { echo "::error::$*"; exit 1; }
ok()   { echo "  ok  $*"; }

status() { curl -s -o /dev/null -w '%{http_code}' -m 20 "$1" || true; }
body()   { curl -fsS -m 20 "$1"; }

if (( WAIT_SECONDS > 0 )); then
  echo "Waiting up to ${WAIT_SECONDS}s for ${BASE}/api/health ..."
  deadline=$((SECONDS + WAIT_SECONDS))
  until curl -fsS -m 5 "${BASE}/api/health" >/dev/null 2>&1; do
    (( SECONDS < deadline )) || fail "timed out waiting for ${BASE}/api/health"
    sleep 5
  done
fi

echo "Smoke check: ${BASE}"

body "${BASE}/" | grep -q 'id="root"' || fail "web: / did not return the SPA shell"
ok "web serves the SPA shell"

[[ "$(status "${BASE}/reports")" == 200 ]] || fail "web: /reports (SPA fallback) is not 200"
ok "SPA fallback for client-side routes"

body "${BASE}/api/health" | jq -e '.status == "ok"' >/dev/null || fail "api: health is not ok"
ok "api health (database reachable)"

body "${BASE}/api/students/01000001" | jq -e '.sbd == "01000001" and (.scores | length) == 9' >/dev/null \
  || fail "api: score lookup for 01000001 is wrong"
ok "score lookup"

[[ "$(status "${BASE}/api/students/abc")" == 400 ]] || fail "api: malformed sbd should be 400"
[[ "$(status "${BASE}/api/students/99999999")" == 404 ]] || fail "api: unknown sbd should be 404"
ok "validation (400) and not found (404)"

body "${BASE}/api/rankings/A00?limit=10" \
  | jq -e '(.students | length) == 10 and .students[0].sbd == "26020938" and .students[0].total == 29.6' >/dev/null \
  || fail "api: top 10 of group A00 is wrong (expected 26020938 on top with 29.6)"
ok "top 10 group A00 from the real dataset"

body "${BASE}/api/reports/score-levels" \
  | jq -e '(.subjects | length) == 9 and ([.subjects[] | select(.code == "toan") | .counts[]] | add) > 900000' >/dev/null \
  || fail "api: score-level report is wrong (9 subjects, >900k Toán scores expected)"
ok "score-level report"

body "${BASE}/api/overview" \
  | jq -e '.totals.candidates == 1061605 and .topScorer.sbd == "19000335" and (.subjects | length) == 9' >/dev/null \
  || fail "api: overview is wrong (expected 1,061,605 candidates, top scorer 19000335)"
ok "dashboard overview"

echo "Smoke check passed."
