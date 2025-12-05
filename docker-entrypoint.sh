#!/bin/sh
set -e

echo "Waiting for database to be ready must add DATABASE_URL (connection string) in .env..."
for i in 1 2 3 4 5; do
  if pg_isready -d "$DATABASE_URL" -t 5; then
    echo "Database is ready"
    break
  fi
  echo "Attempt $i/5: Database not ready, waiting..."
  sleep 2
done

echo "Running database migrations..."
bun scripts/migrate.mjs

echo "Starting application..."
exec sh -lc "${START_CMD:-bun ./server.js}"
