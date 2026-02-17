#!/bin/bash

# Display benchmark results as a comparison table
# Usage: ./view-results.sh [run_labels...]
#   If no labels given, shows last 10 runs. Pass labels to filter (e.g. "v1.0" "v2.0")

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_CSV="${SCRIPT_DIR}/results/benchmarks.csv"

if [[ ! -f "$RESULTS_CSV" ]]; then
    echo "No results found. Run ./run-one.sh <label> first."
    exit 1
fi

if [[ $# -gt 0 ]]; then
    # Filter by run labels
    {
        head -1 "$RESULTS_CSV"
        for label in "$@"; do
            grep ",${label}," "$RESULTS_CSV" || true
        done
    }
else
    # Show last 11 lines (header + 10 data rows)
    (head -1 "$RESULTS_CSV"; tail -n +2 "$RESULTS_CSV" | tail -10)
fi

echo ""
echo "Full results: $RESULTS_CSV"
echo "Filter by label: ./view-results.sh <label> (e.g. ./view-results.sh v1.0 v2.0)"
