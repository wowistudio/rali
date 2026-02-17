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

# this should run node /Users/jayh/code/autocannon/autocannon.js $@
autocannon_fork() {
    node /Users/jayh/code/autocannon/autocannon.js "$@"
}

# Check if autocannon is installed
if ! command -v autocannon &> /dev/null; then
    echo "Error: autocannon is not installed. Install it with: npm install -g autocannon" >&2
    exit 1
fi

echo "Clearing Redis for baseline test..."
redis-cli FLUSHALL > /dev/null 2>&1 || true

# Autocannon options
AUTOCANNON_OPTS=(
  --connections 1
  --duration 10
  --method POST
  --renderStatusCodes
  --header "Content-Type: application/json"
  --body '{ "key": "key", "limit": 2, "window": 10, "strategy": "fixed"}'
  http://localhost:4000/limiter/call
)

if [[ -n "$run_label" ]]; then
    echo "Running benchmark with label: $run_label"
    # If saving results, run with JSON output for parsing
    json_output=$(autocannon_fork -j "${AUTOCANNON_OPTS[@]}" 2>&1)
    
    # Also display human-readable output
    autocannon_fork "${AUTOCANNON_OPTS[@]}"
    
    # Save to CSV
    mkdir -p "$RESULTS_DIR"
    if [[ ! -f "$RESULTS_CSV" ]]; then
        echo "timestamp,label,total_requests,requests_per_second,total_bytes,errors,duration" > "$RESULTS_CSV"
    fi
    parsed=$(echo "$json_output" | node parse-autocannon.js "$run_label")
    echo "$parsed" >> "$RESULTS_CSV"
    echo ""
    echo "✓ Results saved to $RESULTS_CSV"
else
    echo "Running benchmark without label"
    # Just run normally and show output
    autocannon_fork "${AUTOCANNON_OPTS[@]}"
fi
