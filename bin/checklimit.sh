#!/bin/bash

set -e

key=$1
maxRequests=$2
windowSeconds=$3

curl --location 'http://localhost:4000/limiter/call' \
--header 'Content-Type: application/json' \
--data '{
    "key": "'${key}'",
    "maxRequests": '${maxRequests}',
    "windowSeconds": '${windowSeconds}'
}'