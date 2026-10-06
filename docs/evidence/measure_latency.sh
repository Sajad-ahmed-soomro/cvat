#!/usr/bin/env bash
# Measures client-side latency of one GET endpoint, as described in docs/objectives.md (MO-1).
#
# Usage: CVAT_USER=admin CVAT_PASSWORD=... ./measure_latency.sh <path> [runs] [requests_per_run]
#   e.g. ./measure_latency.sh /api/test/tasks/1/label-counts 5 50
#
# Logs in once and reuses the session cookie, as the UI does: with Basic auth every request
# would also pay for password hashing, which is not part of the endpoint being measured.
# Each run sends 3 untimed warm-up requests, then <requests_per_run> timed sequential requests.

set -euo pipefail

BASE_URL="${CVAT_BASE_URL:-http://localhost:8080}"
ENDPOINT="$1"
RUNS="${2:-5}"
REQUESTS="${3:-50}"
WARMUP=3

JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

curl -sf -o /dev/null -c "$JAR" -H 'Content-Type: application/json' -X POST "$BASE_URL/api/auth/login" \
    -d "{\"username\": \"$CVAT_USER\", \"password\": \"$CVAT_PASSWORD\"}"

timed_get() {
    curl -sf -o /dev/null -b "$JAR" -w '%{time_total}\n' "$BASE_URL$ENDPOINT"
}

echo "endpoint=$ENDPOINT runs=$RUNS requests_per_run=$REQUESTS warmup=$WARMUP"
echo "response bytes: $(curl -sf -b "$JAR" "$BASE_URL$ENDPOINT" | wc -c | tr -d ' ')"

for run in $(seq 1 "$RUNS"); do
    for _ in $(seq 1 "$WARMUP"); do timed_get > /dev/null; done
    for _ in $(seq 1 "$REQUESTS"); do timed_get; done | python3 -c "
import statistics, sys
ms = sorted(float(line) * 1000 for line in sys.stdin)
p95 = ms[max(0, round(0.95 * len(ms)) - 1)]
print(f'run $run: n={len(ms)} min={ms[0]:.1f} p50={statistics.median(ms):.1f} p95={p95:.1f} max={ms[-1]:.1f} ms')
print('  raw ms:', ' '.join(f'{v:.1f}' for v in ms))
"
done
