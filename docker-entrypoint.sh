#!/bin/sh
set -e

echo "Waiting for database to be ready..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if pg_isready -d "$DATABASE_URL" -t 5; then
    echo "Database is ready"
    break
  fi
  echo "Attempt $i/10: Database not ready, waiting..."
  sleep 2
done

echo "Running database migrations..."
bun scripts/migrate.mjs

echo "Starting application..."
exec sh -lc "${START_CMD:-bun ./server.js}"
