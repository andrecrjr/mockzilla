# Landing-Only Deployment

Deploy Mockzilla as a landing page only, hiding the main app (`/app/*`) and API routes (`/api/*`).

## How It Works

The `DEPLOY_MODE` environment variable controls route access at runtime via middleware:

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

Single Docker image, different `.env` file. No separate build needed — the middleware gates routes at runtime based on `DEPLOY_MODE`.
