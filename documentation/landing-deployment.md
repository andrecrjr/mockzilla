# Landing-Only Deployment

Deploy Mockzilla as a landing page only, hiding the main app (`/app/*`) and API routes (`/api/*`).

## How It Works

The `DEPLOY_MODE` environment variable controls route access at runtime via the Next.js `proxy.ts` file:

- **`full`** (default): All routes accessible — landing, app, and API
- **`landing`**: Blocks `/app/*` and `/api/*` routes with a 404 response

## Quick Start

### 1. Create the landing env file

```bash
cp .env.landing.example .env.landing
```

### 2. Build the production image (if not already built)

```bash
make prod-build
```

### 3. Start landing-only mode

```bash
make landing-run
```

### Other Commands

```bash
make landing-up      # Start (requires built image)
make landing-down    # Stop
make landing-logs    # View logs
```

## Accessible Routes in Landing Mode

| Route       | Accessible |
|-------------|------------|
| `/`         | ✅ Yes     |
| `/docs/*`   | ✅ Yes     |
| `/docsv2/*` | ✅ Yes     |
| `/_next/*`  | ✅ Yes     |
| `/app/*`    | ❌ 404     |
| `/api/*`    | ❌ 404     |

## Architecture

Single Docker image, different `.env` file. No separate build needed — the Next.js proxy gates routes at runtime based on `DEPLOY_MODE`.

## Release Behavior

Landing-only changes are treated as release-ignored changes in CD. Pushes to
`main` that only update `app/page.tsx`, `components/landing/**`,
`lib/constants/faq.ts`, Docker configuration, and documentation skip
semantic-release, Docker publishing, and desktop packaging. Docker images are
only published from versioned semantic releases.
