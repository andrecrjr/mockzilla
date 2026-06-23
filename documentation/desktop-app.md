# Desktop App

Mockzilla can be packaged as an installable Tauri desktop app for Windows, macOS, and Linux.

## Runtime Model

- The desktop app keeps the existing Next.js server runtime instead of exporting a static frontend.
- Tauri starts a bundled Node sidecar and points the WebView at `http://127.0.0.1:<port>`.
- The sidecar runs Drizzle migrations, starts the Next standalone server, and uses PGlite by default.
- `DATABASE_URL` is still supported for advanced users who want an external PostgreSQL database.

## Data Storage

Desktop builds set `MOCKZILLA_DATA_DIR` to a dedicated `pglite` folder inside the OS app-data directory. PGlite data is stored there so mocks and workflow state survive app restarts and upgrades without colliding with WebView cache or local-storage files.

If `MOCKZILLA_DATA_DIR` is not set, server and Docker builds keep using `./data`.

## Local Commands

```bash
bun run desktop:dev
bun run desktop:build
make desktop-smoke
```

`desktop:build` runs the Next standalone build, stages desktop resources, copies the local Node binary as the Tauri sidecar, and builds the installer for the current OS.

### Linux Build Prerequisites

Building for Linux (especially when packaging as an `AppImage` using `linuxdeploy`) requires `libfuse2` to be installed on the host system (particularly on newer distributions like Ubuntu 22.04+ where it is not pre-installed).

```bash
sudo apt-get update && sudo apt-get install -y libfuse2
```

Alternatively, if you do not want to build an `AppImage` (which avoids running `linuxdeploy`), you can remove `"appimage"` from the `"targets"` array in `src-tauri/tauri.conf.json`.

`make desktop-smoke` validates the bundled Next server path with PGlite. It does not open a WebView.



## Release

GitHub Actions publishes desktop installers after semantic-release creates a version:

- Windows: NSIS installer
- macOS: DMG
- Linux: AppImage, deb, and rpm

CI installs Node 24 before packaging so the bundled sidecar uses the same major runtime as the production Docker image.

## MCP Endpoint

The MCP endpoint remains available at:

```text
http://localhost:<port>/api/mcp
```

The desktop launcher chooses port `36666` when available and otherwise uses the next free localhost port.
