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
make desktop-e2e
```

`desktop:build` runs the Next standalone build, stages desktop resources, copies the local Node binary as the Tauri sidecar, and builds the installer for the current OS.

`make desktop-smoke` validates the bundled Next server path with PGlite. It does not open a WebView.

`make desktop-e2e` runs the real Tauri GUI through WebDriver. On Linux, install Tauri's WebKitGTK dependencies plus `webkit2gtk-driver` and `xvfb`, then run it with a display or `xvfb-run`.

Tauri WebDriver desktop tests are supported on Linux and Windows. They are not supported on macOS because macOS does not provide a WKWebView driver tool.

## GUI Test Dependencies

Linux:

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  webkit2gtk-driver \
  xvfb

cargo install tauri-driver --locked
xvfb-run -a bun run desktop:e2e
```

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
