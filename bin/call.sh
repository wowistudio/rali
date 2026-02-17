#!/bin/bash

set -e

key=$1
limit=${2:-2}
window=${3:-10}
strategy=${4:-sliding}

url="http://localhost:4000/limiter/call"
echo "limit=${limit}, window=${window}"
curl --silent --show-error --verbose --location "${url}" \
--header 'Content-Type: application/json' \
--data '{
    "key": "[<id>]",
    "limit": 2,
    "window": 10,
    "strategy": "sliding"
}' | jq