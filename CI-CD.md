# Mockzilla CI/CD — Semantic Versioning Pipeline

> App-only deployment (no landing page). Docker-based with PostgreSQL + Drizzle migrations.

---

## Table of Contents
- [Branching Strategy](#branching-strategy)
- [Semantic Versioning](#semantic-versioning)
- [CI Pipeline](#ci-pipeline)
- [CD Pipeline](#cd-pipeline)
- [Docker Image Tagging](#docker-image-tagging)
- [Required Secrets](#required-secrets)
- [Rollback](#rollback)

---

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable, production-ready |
| `feature/*` | New features, fixes |

### Pull Request Flow
1. Create `feature/description` from `main`
2. Open PR → `main`
3. CI runs (lint, typecheck, test, docker build)
4. Merge → `main` triggers CD (version bump + Docker Hub push)

---

## Semantic Versioning

Version format: **`MAJOR.MINOR.PATCH`** (e.g., `v1.4.2`)

### Version Bump Rules (Conventional Commits)

| Commit Type | Version Bump |
|-------------|-------------|
| `fix: ...` | PATCH (`1.4.2` → `1.4.3`) |
| `feat: ...` | MINOR (`1.4.2` → `1.5.0`) |
| `feat!: ...` or body contains `BREAKING CHANGE:` | MAJOR (`1.4.2` → `2.0.0`) |

### Version Source of Truth
- `package.json` → `"version"` field
- Git tag → `v1.4.2` (created manually or via CD)
- Docker image → tagged with the same semver

---

## CI Pipeline

**Trigger:** Pull requests to `develop` or `main`

### Workflow: `ci.yml`

```yaml
name: CI
on:
  pull_request:
    branches: [develop, main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run lint          # biome lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: npx tsc --noEmit      # TypeScript check

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_USER: mockzilla
          POSTGRES_PASSWORD: mockzilla
          POSTGRES_DB: mockzilla_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://mockzilla:mockzilla@localhost:5432/mockzilla_test
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run db:generate     # Generate migrations
      - run: bun run db:migrate      # Apply migrations
      - run: bun test                # Run unit + integration tests

  docker-build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - run: docker build -f Dockerfile.prd -t mockzilla:ci-test .
        # Verifies production image builds successfully
```

**All checks must pass** before merging.

---

## CD Pipeline

**Trigger:** Push to `main` (after PR merge)

### Workflow: `cd.yml`

```yaml
name: CD — Build & Push to Docker Hub
on:
  push:
    branches: [main]

jobs:
  version:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.get-version.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - id: get-version
        run: echo "version=$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT

  build-and-push:
    needs: version
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Parse semver components
      - id: semver
        run: |
          VERSION=${{ needs.version.outputs.version }}
          MAJOR=${VERSION%%.*}
          MINOR_MAJOR=${VERSION%.*}
          echo "version=${VERSION}" >> $GITHUB_OUTPUT
          echo "major=${MAJOR}" >> $GITHUB_OUTPUT
          echo "minor_major=${MINOR_MAJOR}" >> $GITHUB_OUTPUT

      # Login to Docker Hub
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      # Build and push multi-tag
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: Dockerfile.prd
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/mockzilla:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/mockzilla:${{ steps.semver.outputs.version }}
            ${{ secrets.DOCKERHUB_USERNAME }}/mockzilla:${{ steps.semver.outputs.minor_major }}
            ${{ secrets.DOCKERHUB_USERNAME }}/mockzilla:${{ steps.semver.outputs.major }}
```

---

## Docker Image Tagging

Each CD run pushes **4 tags** to Docker Hub:

| Tag | Example | Purpose |
|-----|---------|---------|
| `latest` | `youruser/mockzilla:latest` | Rolling latest stable |
| `MAJOR.MINOR.PATCH` | `youruser/mockzilla:1.4.2` | Exact semver pin |
| `MAJOR.MINOR` | `youruser/mockzilla:1.4` | Minor line float |
| `MAJOR` | `youruser/mockzilla:1` | Major line float |

**Registry:** Docker Hub (`docker.io`)

---

## Deployment

Run the image manually from Docker Hub:

```bash
docker run -d \
  --name mockzilla-prod \
  --env-file .env \
  -p 36666:36666 \
  --restart unless-stopped \
  youruser/mockzilla:v1.4.2
```

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NODE_ENV` | `production` |
| `DEPLOY_MODE` | `full` (app + API, no landing skip) |

### `.env` Template (see `.env.example`)

```env
POSTGRES_USER=mockzilla
POSTGRES_PASSWORD=<secure-password>
POSTGRES_DB=mockzilla
DATABASE_URL=postgresql://mockzilla:<password>@<db-host>:5432/mockzilla
NODE_ENV=production
DEPLOY_MODE=full
```

### Deployment Modes

| Mode | Behavior |
|------|----------|
| `full` (default) | Full app + API + docs. **This is the only mode used.** |
| `landing` | Skipped — not used in this pipeline |

---

## Required Secrets

Configure in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (generate from Hub → Account Settings → Security) |

---

## Rollback

### Quick Rollback via Docker Tag

```bash
# Rollback to previous version
docker stop mockzilla-prod && docker rm mockzilla-prod
docker run -d \
  --name mockzilla-prod \
  --env-file .env \
  -p 36666:36666 \
  --restart unless-stopped \
  youruser/mockzilla:v1.4.1  # previous version
```

### Rollback via Git
1. Revert the commit on `main`: `git revert <commit-hash>`
2. Push to `main` — new image builds automatically
3. Pull and run the new `latest` tag

### Database Rollback
- Drizzle migrations are forward-only by default
- For destructive changes, add down-migration scripts manually in `drizzle/migrations/`
- Always backup DB before deploying major version bumps

---

## Folder Structure Reference

```
.github/workflows/
├── ci.yml          # Lint, typecheck, test, docker build verification
└── cd.yml          # Version read, docker build & push to Docker Hub

mockzilla/
├── Dockerfile.prd  # Production multi-stage build (oven/bun:1-alpine)
├── docker-entrypoint.sh  # Runs migrations on startup
├── scripts/migrate.mjs   # Drizzle migration runner
├── drizzle/              # Migration files
├── lib/db/schema.ts      # Drizzle schema definitions
└── package.json          # Version source of truth
```

---

## Conventional Commit Format

```
<type>(<scope>): <description>

[optional body]
[BREAKING CHANGE: <description>]
```

### Allowed Types

| Type | Triggers Release? | Description |
|------|-------------------|-------------|
| `feat` | Yes (MINOR) | New feature |
| `fix` | Yes (PATCH) | Bug fix |
| `docs` | No | Documentation only |
| `style` | No | Formatting, whitespace |
| `refactor` | No | Code refactor (no behavior change) |
| `test` | No | Adding/updating tests |
| `ci` | No | CI/CD changes |
| `chore` | No | Maintenance tasks |

### Examples

```
feat(workflow): add condition matching for transitions
fix(mock-serving): handle missing folder slug with 404
docs: update API reference for export endpoint
feat!: add MCP server integration (BREAKING CHANGE)
```

---

## Notes

- **Landing page is excluded** — `DEPLOY_MODE` is always `full`
- **No standalone npm/yarn** — all commands run via `bun` inside Docker
- **Migrations are automatic** — `docker-entrypoint.sh` runs `scripts/migrate.mjs` on container start
- **Port `36666`** — app serves on this port
- **Docker Hub** — images pushed to `youruser/mockzilla:<tag>` on every `main` merge
