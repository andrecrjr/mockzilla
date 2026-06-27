# Desktop App

Mockzilla can be packaged as an installable Tauri desktop app for Windows, macOS, and Linux.

## Runtime Model

- The desktop app keeps the existing Next.js server runtime instead of exporting a static frontend.
- Tauri starts a bundled Node sidecar and points the WebView at `http://127.0.0.1:<port>`.
- The sidecar runs Drizzle migrations, starts the Next standalone server, and uses PGlite by default.
- `DATABASE_URL` is still supported for advanced users who want an external PostgreSQL database.

## Build Paths

The web and desktop builds share the same Next.js application, but they are separate release paths:

- Web/Docker release: use `make prod-build` or `make prod-run`. This builds the production Docker image from `Dockerfile.prd`.
- Desktop release: use `bun run desktop:build` or `make desktop-build`. This invokes Tauri through the local wrapper and packages OS installers.

Do not run `bun run build` as a separate prerequisite for Tauri packaging. Tauri's `beforeBuildCommand` already runs `bun run desktop:stage`, which creates and stages the standalone Next server that the desktop sidecar runs.

## Initialization Flow

Desktop startup is intentionally separate from Docker development startup:

1. `bun run desktop:build` runs `scripts/tauri-desktop-build.mjs`.
2. Tauri runs `bun run desktop:stage` through `beforeBuildCommand`.
3. `scripts/desktop-stage.mjs` builds the Next.js standalone server, then copies `.next/standalone`, static assets, `public`, Drizzle migrations, migration runtime packages, and `scripts/desktop-server.mjs` into `desktop-dist/server`.
4. Tauri bundles a supported Node sidecar into `src-tauri/binaries`.
5. At launch, Tauri starts the Node sidecar with an inline ESM bootstrap and passes the staged `desktop-server.mjs` path through `MOCKZILLA_DESKTOP_ENTRY`. This avoids passing a Windows drive-letter path as Node's main script argument.
6. `desktop-server.mjs` selects an available localhost port starting at `36666`, sets `MOCKZILLA_DESKTOP=1`, sets `MOCKZILLA_DATA_DIR`, runs migrations, and starts the standalone Next server.
7. The Tauri WebView opens the selected local server URL.

The web app still uses the same App Router tree in desktop and Docker development. Shared UI providers must therefore be available to `/app` pages in both paths; the `/app` shell owns its own theme provider boundary so navigation and nested app pages can render theme-aware controls during server rendering and hydration.

## Data Storage

Desktop builds set `MOCKZILLA_DATA_DIR` to a dedicated `pglite` folder inside the OS app-data directory. PGlite data is stored there so mocks and workflow state survive app restarts and upgrades without colliding with WebView cache or local-storage files.

If `MOCKZILLA_DATA_DIR` is not set, server and Docker builds keep using `./data`.

## Log Storage

Desktop builds set `MOCKZILLA_LOG_DIR` to a writable `logs` folder beside the desktop `pglite` data directory. The Next.js server writes `mockzilla.log` there instead of creating `.logs` under the bundled server install path, which can be read-only after Linux deb/AppImage installation.

For non-desktop runs, logs keep using `.logs/mockzilla.log` under the current working directory. Set `MOCKZILLA_LOG_DIR` to override the log location explicitly.

## Local Commands

```bash
bun run desktop:dev
bun run desktop:build
make desktop-smoke
```

`desktop:build` is the only desktop packaging command. It runs the Tauri CLI through `bun scripts/tauri-desktop-build.mjs`, which selects a supported Node binary before invoking Tauri. Tauri then runs `desktop:stage`, stages desktop resources, copies the selected Node binary as the sidecar, and builds the requested installers.

Desktop packaging uses `bun scripts/desktop-stage.mjs` for the Next standalone build and resource staging. The stage script removes stale `.next` output, forces `NODE_ENV=production`, uses `next build --webpack`, and selects a supported Node binary for the build and bundled sidecar. It prefers Node 24, then 22, then 20.9 or newer. Set `MOCKZILLA_DESKTOP_NODE=/absolute/path/to/node` to override auto-detection.

During staging, Linux x64 builds remove Sharp's musl optional packages from `desktop-dist/server`. The glibc Sharp binary remains available, and pruning the musl variant prevents AppImage dependency scanning from failing on `libc.musl-x86_64.so.1`.

The staged desktop server also explicitly includes the migration runtime packages `@electric-sql/pglite`, `drizzle-orm`, and `pg` in `desktop-dist/server/node_modules`. The migration script runs before the Next standalone server starts, so these packages must be packaged even when Next's standalone tracer does not include them automatically.

### Linux Build Prerequisites

Building for Linux (especially when packaging as an `AppImage` using `linuxdeploy`) requires `libfuse2` to be installed on the host system (particularly on newer distributions like Ubuntu 22.04+ where it is not pre-installed).

```bash
sudo apt-get update && sudo apt-get install -y libfuse2
```

Alternatively, if you do not want to build an `AppImage` locally, keep `src-tauri/tauri.conf.json` unchanged and pass an explicit bundle target:

```bash
bun run desktop:build -- build --bundles deb --verbose
```

Linux packaging currently produces AppImage and deb installers. Windows packaging currently produces an NSIS installer. The rpm target is intentionally not enabled because Tauri's rpm bundler stalled on the bundled Next.js server resources in local verification, while AppImage and deb completed successfully.

`make desktop-smoke` validates the bundled Next server path with PGlite. It does not open a WebView.

## Release

GitHub Actions publishes desktop installers automatically from the release CD
workflow after semantic-release creates and publishes a GitHub release:

- Linux: AppImage and deb
- Windows: NSIS exe
- macOS: DMG

During the semantic-release prepare step, `scripts/sync-release-version.mjs` writes the next semantic version into `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and the Mockzilla entry in `src-tauri/Cargo.lock`. The release commit includes those files. Docker publishing and automatic desktop packaging both check out `v${version}` inside the release-and-Docker workflow. That keeps Docker tags, GitHub release tags, and installer metadata aligned while release-ignored changes publish no artifacts.

The separate `Desktop Release` workflow remains available for manual retries. Dispatch it with the release tag, for example `v1.0.3`.

CI installs Node 24 before packaging so the bundled sidecar uses the same major runtime as the production Docker image. Local builds can also use Node 22 or Node 20.9+, but Node 25 is intentionally skipped for desktop packaging because Next.js 16 Webpack builds can fail in that runtime.

The desktop release workflow must call `bun run desktop:build` rather than invoking the Tauri CLI action directly. That keeps CI/CD on the same wrapper path as local builds: supported Node selection, `next build --webpack`, desktop resource staging, Sharp musl pruning on Linux, and installer generation. The workflow uploads the generated files from `src-tauri/target/release/bundle`. Artifact upload globs are matrix-specific: Linux requires AppImage and deb outputs, Windows requires the NSIS `.exe`, and macOS requires the `.dmg`. Keep `fail_on_unmatched_files` enabled so a missing expected artifact still fails the producing platform without making other platforms require impossible formats.

## Install Release Artifacts

### Linux AppImage

Download `Mockzilla_*.AppImage`, make it executable, then run it:

```bash
chmod +x Mockzilla_*.AppImage
./Mockzilla_*.AppImage
```

On distributions that do not include FUSE 2 by default, install it first:

```bash
sudo apt-get install libfuse2
```

### Linux deb

Download `Mockzilla_*.deb` and install it with `apt`:

```bash
sudo apt install ./Mockzilla_*.deb
```

After installation, launch Mockzilla from the desktop application menu or run the installed `mockzilla` command if your package manager exposes it on `PATH`.

### Windows NSIS

Download the generated `Mockzilla_*.exe` installer and run it. The installer contains the Tauri app, the staged Next standalone server, and the bundled Node sidecar.

### macOS DMG

Download the generated `Mockzilla_*.dmg`, open it, and install Mockzilla from the mounted disk image.

### Linux GTK Startup Errors

Tauri requires a working graphical session on Linux. If Mockzilla exits with `Failed to initialize gtk backend` or `Failed to initialize GTK`, first check that the app is being launched from a desktop session and that either `DISPLAY` or `WAYLAND_DISPLAY` is set:

```bash
echo "$XDG_SESSION_TYPE"
echo "$DISPLAY"
echo "$WAYLAND_DISPLAY"
```

A plain TTY, SSH shell, headless container, or system service without X11/Wayland access cannot initialize GTK. In that case, launch Mockzilla from the desktop application menu, run it from a terminal inside the logged-in desktop session, or provide a valid X/Wayland bridge for the environment.

The deb package declares the GTK/WebKit runtime dependencies through `libgtk-3-0` and `libwebkit2gtk-4.1-0`. If a desktop session is available but startup still fails, reinstall the package with `apt` so dependencies are resolved, then inspect missing dynamic libraries with `ldd /usr/bin/mockzilla`.

## MCP Endpoint

The MCP endpoint remains available at:

```text
http://localhost:<port>/api/mcp
```

The desktop launcher chooses port `36666` when available and otherwise uses the next free localhost port.
