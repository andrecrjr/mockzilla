# Release Process

Mockzilla releases are created by semantic-release from pushes to `main`.

## Versioned releases

Semantic-release owns the release version. During the prepare step,
`scripts/sync-release-version.mjs` writes the next semantic version into
`package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and the
Mockzilla entry in `src-tauri/Cargo.lock`.

The CD workflow builds deployable artifacts only when semantic-release publishes
a new release. Docker publishing checks out `v${version}` and pushes both:

- `andrecrjr/mockzilla:latest`
- `andrecrjr/mockzilla:${version}`

The desktop packaging jobs also check out `v${version}` before building
installers, so Docker tags, GitHub release tags, package metadata, and desktop
installer metadata stay aligned.

## Docker-only changes

Pushes to `main` that only change Docker configuration skip semantic-release
and desktop packaging. Documentation-only files may be included in the same
push without changing this behavior. The CD workflow detects Docker changes
limited to:

- `Dockerfile`
- `Dockerfile.*`
- `docker-compose.yml`
- `docker-compose.yaml`
- `compose.yml`
- `compose.yaml`
- `.dockerignore`

For these changes, CD only builds and pushes the Docker image. It updates
`andrecrjr/mockzilla:latest` and also publishes a commit-SHA image tag. Mixed
changes, such as Docker plus application code, follow the normal versioned
release flow.

## Docs-only changes

Use a `docs/` branch prefix for documentation updates:

```bash
git checkout -b docs/update-readme
```

Use a `docs:` Conventional Commit message:

```bash
git commit -m "docs: update README"
```

Docs-only pushes to `main` do not start the CD workflow when they only change:

- `README.md`
- `documentation/**`
- `content/docs/**`

If the CD workflow runs because a change includes non-documentation files, semantic-release is configured so `docs:` commits do not publish a release or create the release commit that updates version files.
