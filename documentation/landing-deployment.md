# Landing-Only Deployment

Deploy Mockzilla as a static landing page and documentation site only. The image
contains no dashboard, API routes, database runtime, or migrations.

## How It Works

`DEPLOY_MODE=landing` makes the build use Next.js static export. The Docker image
copies only the exported root document, its browser assets, and public files.

- **`full`** (default): Builds the full application.
- **`landing`**: Builds only the static landing-site artifact.

## Quick Start

### 1. Create the landing env file

```bash
cp .env.landing.example .env.landing
```

### 2. Build and start landing-only mode

```bash
make landing-run
```

The landing page is available at `http://localhost:36666`.

### Other Commands

```bash
make landing-up      # Start (requires built image)
make landing-build   # Build the landing image without starting it
make landing-down    # Stop
make landing-logs    # View logs
```

## Accessible Routes in Landing Mode

| Route       | Accessible |
|-------------|------------|
| `/`         | ✅ Yes     |
| `/docs/*`   | ✅ Yes     |
| `/docsv2/*` | ❌ 404     |
| `/_next/*`  | ✅ Yes     |
| `/app/*`    | ❌ 404     |
| `/api/*`    | ❌ 404     |

## Architecture

The landing image is served by Nginx. It has no Node or Bun application runtime,
database client, API routes, or migration scripts. Requests for paths that are
not packaged static assets return `404`.

## Release Behavior

Landing-only changes are treated as release-ignored changes in CD. Pushes to
`main` that only update `app/page.tsx`, `components/landing/**`,
`lib/constants/faq.ts`, Docker configuration, and documentation skip
semantic-release, Docker publishing, and desktop packaging. Docker images are
only published from versioned semantic releases.
