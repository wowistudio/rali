#!/bin/bash

set -e

echo "Resetting database..."
cd ./apps/database
rm -rf ./prisma/migrations
npx prisma migrate reset -f
npx prisma migrate dev --name base
npx prisma generate

echo "✅ Database reset"