#!/bin/bash

# Run all benchmark tests and store results for comparison
# Usage: ./run-all.sh [run_label]
#   run_label: Optional label (e.g. "v1.0", "before-optimization") - defaults to timestamp

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RESULTS_DIR="${SCRIPT_DIR}/results"
RESULTS_CSV="${RESULTS_DIR}/benchmarks.csv"
RUN_LABEL="${1:-$(date +%Y%m%d-%H%M%S)}"

# Ensure results directory exists
mkdir -p "$RESULTS_DIR"

# Create CSV with header if it doesn't exist
if [[ ! -f "$RESULTS_CSV" ]]; then
    echo "timestamp,run_label,test,req_sec,lat_avg,lat_stdev,lat_max,p50,p75,p90,p99,total_requests,duration_sec" > "$RESULTS_CSV"
fi

TIMESTAMP=$(date -Iseconds 2>/dev/null || date +%Y-%m-%dT%H:%M:%S)

run_test() {
    local name="$1"
    shift
    echo ""
    echo "=========================================="
    echo "Running: $name"
    echo "=========================================="
    local output
    if output=$(wrk --latency "$@" 2>&1); then
        echo "$output"
        local parsed
        parsed=$(echo "$output" | awk -f parse-wrk.awk)
        echo "${TIMESTAMP},${RUN_LABEL},${name},${parsed}" >> "$RESULTS_CSV"
        echo "✓ Results saved"
    else
        echo "✗ Test failed" >&2
        return 1
    fi
}

echo "Benchmark run: $RUN_LABEL"
echo "Results will be appended to: $RESULTS_CSV"
echo ""

echo "Clearing Redis for baseline test..."
redis-cli FLUSHALL > /dev/null 2>&1 || true
run_test "baseline" -t1 -c10 -d30s -s request-unique-keys.lua http://127.0.0.1:4000/limiter/call

echo ""
echo "=========================================="
echo "All tests completed!"
echo "=========================================="
echo ""
echo "View results: ./view-results.sh"
echo "Or open: $RESULTS_CSV"
