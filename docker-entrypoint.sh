#!/bin/sh
set -e

# Handle permissions and user switching for Production
if [ "$NODE_ENV" = "production" ]; then
  # Ensure the data directory is owned by the nextjs user
  if [ "$(id -u)" = "0" ]; then
    echo "Production mode: Ensuring /app/data is owned by nextjs..."
    mkdir -p /app/data
    if id "nextjs" >/dev/null 2>&1; then
      chown -R nextjs:nodejs /app/data || echo "Warning: Could not change ownership of /app/data"
    fi
  fi
fi

if [ -n "$DATABASE_URL" ]; then
  if command -v pg_isready >/dev/null 2>&1; then
    echo "Waiting for database to be ready..."
    for i in 1 2 3; do
      if pg_isready -d "$DATABASE_URL" -t 5; then
        echo "Database is ready"
        break
      fi
      echo "Attempt $i/3: Database not ready, waiting..."
      sleep 2
    done
  else
    echo "DATABASE_URL set but pg_isready not found, skipping health check..."
  fi
else
  echo "DATABASE_URL not set, skipping external database health check"
fi

echo "Running database migrations..."
if [ "$NODE_ENV" = "production" ] && [ "$(id -u)" = "0" ] && id "nextjs" >/dev/null 2>&1; then
  su nextjs -s /bin/sh -c "bun scripts/migrate.mjs"
else
  bun scripts/migrate.mjs
fi

echo "Starting application ($NODE_ENV)..."
if [ "$NODE_ENV" = "production" ] && [ "$(id -u)" = "0" ] && id "nextjs" >/dev/null 2>&1; then
  # Use node for production standalone as optimized by Next.js
  exec su nextjs -s /bin/sh -c "node server.js"
else
  # In dev, use the START_CMD (defaults to bun dev)
  exec sh -c "${START_CMD:-bun run dev}"
fi
