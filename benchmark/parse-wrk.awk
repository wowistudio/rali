#!/usr/bin/awk -f
# Parse wrk output and emit CSV fields for benchmark comparison
# Expects wrk to be run with --latency for percentile data

BEGIN {
    req_sec = ""
    lat_avg = ""
    lat_stdev = ""
    lat_max = ""
    p50 = ""
    p75 = ""
    p90 = ""
    p99 = ""
    total_requests = ""
    duration_sec = ""
}

# Thread Stats - Latency line: "    Latency     2.45ms    1.23ms  15.67ms   85.23%"
# Must not match "Latency Distribution"
/^[[:space:]]+Latency[[:space:]]+[0-9]/ {
    lat_avg = $2
    lat_stdev = $3
    lat_max = $4
}

# Requests/sec:   4081.85
/^Requests\/sec:/ {
    req_sec = $2
}

# 32923 requests in 2.10s, 8.07MB read
/requests in .*s/ {
    total_requests = $1
    duration_sec = $4
    gsub(/[s,].*/, "", duration_sec)
}

# Latency distribution (with --latency): "    50%    2.40ms"
/^[[:space:]]+50%[[:space:]]+/ { p50 = $2 }
/^[[:space:]]+75%[[:space:]]+/ { p75 = $2 }
/^[[:space:]]+90%[[:space:]]+/ { p90 = $2 }
/^[[:space:]]+99%[[:space:]]+/ { p99 = $2 }

END {
    # Output CSV line - use empty string for missing values
    printf "%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
        req_sec, lat_avg, lat_stdev, lat_max, p50, p75, p90, p99,
        total_requests, duration_sec
}
