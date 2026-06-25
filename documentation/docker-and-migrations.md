# Docker and Migrations Technical Documentation

This document outlines the standard procedures for managing the Mockzilla development environment and database migrations.

## Docker-First Workflow

All development commands should be executed via Docker to ensure environment consistency. The `Makefile` provides the primary interface for these commands.

### Key Commands

| Command | Description |
|---------|-------------|
| `make dev-up` | Starts the development containers (App + Postgres). |
| `make dev-down` | Stops the development containers. |
| `make db-generate` | Generates a new Drizzle migration file based on schema changes. |
| `make db-migrate` | Applies pending migrations to the database. |
| `make db-studio` | Starts Drizzle Studio for visual database management. |

Docker development runs the Next.js dev server with the default Next compiler. The Compose app service pins this through `START_CMD`. The dev image copies in a real Node 24 binary and runs the Next.js server process on Node inside the Bun-based container. This matches the desktop sidecar runtime and avoids Bun runtime issues in Next's dev server. Bun remains the package manager and script runner for project commands.

## Docker Development Initialization

`make dev-up` starts the Compose app and PostgreSQL services. The app container mounts the source folders for hot reload, receives `DATABASE_URL` pointing at the Compose PostgreSQL service, and starts Next.js through `START_CMD`:

```text
node node_modules/next/dist/bin/next dev -p 36666
```

The development server renders the normal App Router tree. The root layout provides global adapters and notifications, while the `/app` shell provides its own theme boundary for app navigation and nested app pages. This keeps theme-aware controls working consistently when `/app` is rendered through Docker development or through the desktop standalone server.

## Database Migrations with Bun

Mockzilla uses **Drizzle ORM** and **Bun** for database management.

### Generating Migrations

If you modify `lib/db/schema.ts`, you **must** generate a new migration. Always run this command inside the Docker environment to ensure the correct dependencies are used:

```bash
# Using the Makefile (Recommended)
make db-generate

# Alternatively, using docker compose directly
docker compose run --rm --entrypoint "bun run db:generate" app
```

### Applying Migrations

Migrations are automatically applied on container startup via the `docker-entrypoint.sh` script. If you need to manually apply them while the system is running:

```bash
make db-migrate
```

## Troubleshooting

### Enum Mismatches
If you encounter errors like `invalid input value for enum...`, ensure that:
1. The enum value is added to `lib/db/schema.ts`.
2. A new migration has been generated and applied.
3. The TypeScript type in `lib/types.ts` matches the schema.

### Missing Columns
If the application fails with `column "xxx" does not exist`, it usually means the database is out of sync with the schema. Generate a new migration and restart the containers.
