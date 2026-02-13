# Benchmark Guide

## Install wrk

```bash
# macOS
brew install wrk

# Ubuntu/Debian
sudo apt-get install wrk
```

## Run tests

From the `benchmark/` directory. Ensure the server (`npm run dev:node`) and Redis are running.

```bash
# Run baseline test
./run-all.sh [label]

# Run baseline (optionally save with label)
./run-one.sh [label]
```

## View results

```bash
# Last 10 runs
./view-results.sh

# Filter by labels
./view-results.sh v1.0 v2.0
```

Results are stored in `results/benchmarks.csv` (open in a spreadsheet for comparison).
