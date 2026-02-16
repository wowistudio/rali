#!/bin/bash

set -e

key=$1
limit=$2
window=$3
strategy=${4:-sliding}

url="http://localhost:4000/limiter/call"
echo $url
curl --location "${url}" \
--header 'Content-Type: application/json' \
--data '{
    "key": "'${key}'",
    "limit": '${limit}',
    "window": '${window}',
    "strategy": "'${strategy}'"
}'