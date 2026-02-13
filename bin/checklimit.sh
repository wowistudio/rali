#!/bin/bash

set -e

key=$1
maxRequests=$2
windowSeconds=$3
port=${4:-4000}

url="http://localhost:${port}/limiter/call"
echo $url
curl --location "${url}" \
--header 'Content-Type: application/json' \
--data '{
    "key": "'${key}'",
    "maxRequests": '${maxRequests}',
    "windowSeconds": '${windowSeconds}'
}'