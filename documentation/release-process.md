# Release Process

Mockzilla releases are created by semantic-release from pushes to `main`.

## Versioned releases

Semantic-release owns the release version. During the prepare step,
`scripts/sync-release-version.mjs` writes the next semantic version into
`package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and the
Mockzilla entry in `src-tauri/Cargo.lock`.

The `CD - Release & Docker Deploy` workflow owns semantic-release, Docker image
publishing, and automatic desktop installer packaging. For versioned releases,
Docker publishing checks out `v${version}` and pushes both:

- `andrecrjr/mockzilla:latest`
- `andrecrjr/mockzilla:${version}`

The desktop packaging jobs also check out `v${version}` before building
installers, so Docker tags, GitHub release tags, package metadata, and desktop
installer metadata stay aligned. The separate `Desktop Release` workflow remains
available as a manual retry path; dispatch it with the published release tag,
for example `v1.0.3`.

## Release-ignored changes

Pushes to `main` that only change Docker configuration or landing-page content
skip semantic-release, Docker publishing, and desktop packaging.
Documentation-only files may be included in the same push without changing this
behavior.

The CD workflow detects release-ignored changes limited to:

- `Dockerfile`
- `Dockerfile.*`
- `docker-compose.yml`
- `docker-compose.yaml`
- `compose.yml`
- `compose.yaml`
- `.dockerignore`
- `app/page.tsx`
- `components/landing/**`
- `lib/constants/faq.ts`

For these changes, CD does not publish any artifact. Mixed changes, such as
landing plus app/runtime code, follow the normal versioned release flow.

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
