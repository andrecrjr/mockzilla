# Mockzilla Docker Setup

This project includes Docker configurations for both **development** and **production** environments.

## Quick Start

### Development Environment (Recommended for Local Development)

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Start the development environment:**
   ```bash
   make dev-up
   ```
   
   Or using docker compose directly:
   ```bash
   docker compose -f docker-compose.yaml up -d
   ```

3. **Access your application:**
   - Application: http://localhost:36666
   - Database: localhost:5432

4. **View logs:**
   ```bash
   make dev-logs
   ```

### Production Environment

1. **Build and start production:**
   ```bash
   make prod-run
   ```

   Or build and run separately:
   ```bash
   make prod-build  # Build the production image
   make prod-up     # Start the production container
   ```

2. **Access your application:**
   - Application: http://localhost:36666

## Available Commands

Run `make help` to see all available commands:

### Development Commands
- `make dev-up` - Start development environment with hot-reloading
- `make dev-down` - Stop development environment
- `make dev-logs` - View development logs
- `make dev-build` - Rebuild development containers
- `make dev-restart` - Restart development environment
- `make db-studio` - Start Drizzle Studio for database management (http://localhost:4983)

### Production Commands
- `make prod-run` - Build and run production container using Dockerfile.prd
- `make prod-build` - Build production container using Dockerfile.prd
- `make prod-up` - Start production container
- `make prod-down` - Stop production container
- `make prod-logs` - View production logs

### Utility Commands
- `make clean` - Remove all containers, volumes, and images
- `make db-shell` - Open PostgreSQL shell

## Key Differences: Development vs Production

### Development Setup (`docker-compose.yaml`)
- ✅ **Hot-reloading**: Changes to your code are immediately reflected
- ✅ **Volume mounting**: Your local files are mounted into the container
- ✅ **Faster iteration**: No need to rebuild containers for code changes
- ✅ **Drizzle Studio**: Optional database management UI
- ✅ **Uses Bun**: Faster package installation and dev server
- ⚠️ **Larger container size**: Includes all dev dependencies

### Production Setup (`Dockerfile.prd`)
- ✅ **Optimized build**: Multi-stage build for smaller image size
- ✅ **Standalone output**: Next.js standalone mode for minimal runtime
- ✅ **Security**: Runs as non-root user
- ✅ **Automatic migrations**: Runs database migrations on startup
- ⚠️ **No hot-reloading**: Requires rebuild for code changes

## Environment Variables

Copy `.env.example` to `.env` and customize as needed. Here are the key configuration variables:

### Database Configuration
- `POSTGRES_USER`: The username for the PostgreSQL database (default: `mockzilla`).
- `POSTGRES_PASSWORD`: The password for the PostgreSQL database (default: `mockzilla`).
- `POSTGRES_DB`: The name of the database (default: `mockzilla`).
- `DATABASE_URL`: The connection string for Drizzle ORM.
  - Docker dev: `postgresql://mockzilla:mockzilla@postgres:5432/mockzilla`
  - Local dev: `postgresql://mockzilla:mockzilla@localhost:5432/mockzilla`

### Next.js & System
- `NODE_ENV`: Set to `development` or `production`.
- `NEXT_TELEMETRY_DISABLED`: Set to `1` to disable Next.js telemetry.
- `NEXT_DISABLE_ESLINT`: Set to `true` to skip ESLint during builds.

### Mockzilla Specifics
- `MOCKZILLA_MAX_ITEMS`: **(New)** Controls the maximum number of items generated in arrays when using Dynamic Responses (JSON Schema). Default is `1000`. This prevents accidental memory exhaustion from massive schemas.
- `DEPLOY_MODE`: Controls the application's feature set.
  - `full` (default): Enables the complete Mockzilla dashboard and API mocking engine.
  - `landing`: Hides the dashboard and API routes, serving only the marketing landing page. Useful for public-facing informational sites.

## Database Management

### Using Drizzle Studio

Start Drizzle Studio to manage your database with a UI:

```bash
make db-studio
```

Then open http://localhost:4983 in your browser.

### Using PostgreSQL Shell

Connect directly to the database:

```bash
make db-shell
```

Or manually:

```bash
docker exec -it mockzilla-postgres-dev psql -U mockzilla -d mockzilla
```

### Running Migrations

Migrations run automatically when containers start. To run manually:

**Development:**
```bash
docker exec -it mockzilla-app-dev bun run db:push
```

**Production:**
```bash
docker exec -it mockzilla-frontend drizzle-kit migrate
```

## Troubleshooting

### Port Already in Use

If port 36666 or 5432 is already in use, you can either:

1. Stop the conflicting service
2. Change the port mapping in `docker-compose.yaml`

### Database Connection Issues

If the app can't connect to the database:

1. Check if the database is healthy:
   ```bash
   docker ps
   ```

2. Check database logs:
   ```bash
   docker logs mockzilla-postgres-dev
   ```

3. Verify environment variables are set correctly in `.env`

### Hot-Reloading Not Working

If changes aren't reflected in development:

1. Ensure you're using the development setup: `make dev-up`
2. Check that volume mounts are working:
   ```bash
   docker exec -it mockzilla-app-dev ls -la /app
   ```
3. Restart the development environment:
   ```bash
   make dev-restart
   ```

### Clean Slate

To completely reset your Docker environment:

```bash
make clean
```

This will remove all containers, volumes, and cached images.

## Architecture

### Development Architecture
```
┌─────────────────────────────────────────┐
│  Your Local Machine                     │
│  ┌─────────────────────────────────┐   │
│  │  Source Code (Volume Mounted)   │   │
│  └──────────┬──────────────────────┘   │
│             │                            │
│  ┌──────────▼──────────────────────┐   │
│  │  Docker Container (Bun)         │   │
│  │  - Next.js Dev Server           │   │
│  │  - Hot Reloading Enabled        │   │
│  │  - Port 36666                   │   │
│  └──────────┬──────────────────────┘   │
│             │                            │
│  ┌──────────▼──────────────────────┐   │
│  │  PostgreSQL Container           │   │
│  │  - Port 5432                    │   │
│  │  - Persistent Volume            │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Production Architecture
```
┌─────────────────────────────────────────┐
│  Docker Container (Node Alpine)         │
│  ┌─────────────────────────────────┐   │
│  │  Next.js Standalone Build       │   │
│  │  - Optimized Production Build   │   │
│  │  - Minimal Runtime              │   │
│  │  - Port 36666                   │   │
│  └──────────┬──────────────────────┘   │
│             │                            │
│  ┌──────────▼──────────────────────┐   │
│  │  PostgreSQL Container           │   │
│  │  - Port 5432                    │   │
│  │  - Persistent Volume            │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Next Steps

1. Start development: `make dev-up`
2. Make changes to your code
3. See changes reflected immediately at http://localhost:36666
4. Use Drizzle Studio for database management: `make db-studio`
5. When ready for production: `make prod-run` or `make prod-build && make prod-up`

Happy coding! 🚀
