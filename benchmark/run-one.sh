#!/bin/bash

# Run baseline benchmark, optionally saving results
# Usage: ./run-one.sh [run_label]
#   run_label: Optional (e.g. "v1.0") - if provided, results are saved to CSV

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RESULTS_DIR="${SCRIPT_DIR}/results"
RESULTS_CSV="${RESULTS_DIR}/benchmarks.csv"

run_label="${1:-}"

echo "Clearing Redis for baseline test..."
redis-cli FLUSHALL > /dev/null 2>&1 || true

output=$(wrk --latency -t1 -c10 -d30s -s request-unique-keys.lua http://127.0.0.1:4000/limiter/call 2>&1)
echo "$output"

# Save to CSV if run_label provided
if [[ -n "$run_label" ]]; then
    mkdir -p "$RESULTS_DIR"
    if [[ ! -f "$RESULTS_CSV" ]]; then
        echo "timestamp,run_label,test,req_sec,lat_avg,lat_stdev,lat_max,p50,p75,p90,p99,total_requests,duration_sec" > "$RESULTS_CSV"
    fi
    timestamp=$(date -Iseconds 2>/dev/null || date +%Y-%m-%dT%H:%M:%S)
    parsed=$(echo "$output" | awk -f parse-wrk.awk)
    echo "${timestamp},${run_label},baseline,${parsed}" >> "$RESULTS_CSV"
    echo ""
    echo "✓ Results saved to $RESULTS_CSV"
fi
