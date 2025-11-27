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
   docker compose -f docker-compose.dev.yaml up -d
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
   make prod-build
   make prod-up
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
- `make prod-up` - Start production environment
- `make prod-down` - Stop production environment
- `make prod-logs` - View production logs
- `make prod-build` - Rebuild production containers

### Utility Commands
- `make clean` - Remove all containers, volumes, and images
- `make db-shell` - Open PostgreSQL shell

## Key Differences: Development vs Production

### Development Setup (`docker-compose.dev.yaml`)
- ✅ **Hot-reloading**: Changes to your code are immediately reflected
- ✅ **Volume mounting**: Your local files are mounted into the container
- ✅ **Faster iteration**: No need to rebuild containers for code changes
- ✅ **Drizzle Studio**: Optional database management UI
- ✅ **Uses Bun**: Faster package installation and dev server
- ⚠️ **Larger container size**: Includes all dev dependencies

### Production Setup (`docker-compose.yaml`)
- ✅ **Optimized build**: Multi-stage build for smaller image size
- ✅ **Standalone output**: Next.js standalone mode for minimal runtime
- ✅ **Security**: Runs as non-root user
- ✅ **Automatic migrations**: Runs database migrations on startup
- ⚠️ **No hot-reloading**: Requires rebuild for code changes

## Environment Variables

Copy `.env.example` to `.env` and customize as needed:

```bash
# Database Configuration
POSTGRES_USER=mockzilla
POSTGRES_PASSWORD=mockzilla
POSTGRES_DB=mockzilla

# Application Database URL
DATABASE_URL=postgresql://mockzilla:mockzilla@postgres:5432/mockzilla

# Next.js Configuration
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
```

### Database URL Formats

- **For Docker development**: `postgresql://mockzilla:mockzilla@postgres:5432/mockzilla`
- **For local development (outside Docker)**: `postgresql://mockzilla:mockzilla@localhost:5432/mockzilla`

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
2. Change the port mapping in `docker-compose.dev.yaml` or `docker-compose.yaml`

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
5. When ready for production: `make prod-build && make prod-up`

Happy coding! 🚀
