# Model Context Protocol (MCP) Integration

Mockzilla exposes a first-class Model Context Protocol (MCP) server, allowing AI agents (like Gemini CLI, Claude, Cursor, or specialized sub-agents) to fully control and automate your mocking environment.

---

## What is MCP?

The Model Context Protocol (MCP) is an open-standard connector that enables LLMs and AI Agents to interact with external tools and data sources. In Mockzilla, it allows an AI assistant to:
- Create and manage mocks dynamically.
- Setup complex, stateful workflow scenarios.
- Inspect and reset in-memory database states.
- Observe live traffic and perform forensic debugging on API logic.
- Simulate and test API paths without leaving the chat interface.

---

## Installation & Setup

Mockzilla supports the MCP Streamable HTTP protocol, making it compatible with any modern MCP client.

### Option 1: Direct Streamable HTTP URL (Preferred)
MCP-native clients can connect directly to the Streamable HTTP endpoint. Use this form for clients that accept a remote MCP server URL.

**Endpoint URL**: `http://localhost:36666/api/mcp`

The endpoint is implemented with the official `@modelcontextprotocol/sdk` Streamable HTTP transport in stateless JSON-response mode. Each HTTP request gets a fresh MCP server/transport instance and registers the same manager tools, which keeps the protocol handshake compatible with current MCP SDK clients. The endpoint accepts MCP JSON-RPC over HTTP POST and requires MCP clients to send `Accept: application/json, text/event-stream`.

### Option 2: Stdio Bridge (Only for stdio-only clients)
If your client only supports local `stdio` servers, use `mcp-remote` as a bridge. Because the local Mockzilla server is served over `http://`, pass `--allow-http`. Do not force `sse-only`: Mockzilla uses the newer single-endpoint Streamable HTTP transport, not the deprecated two-endpoint HTTP+SSE transport.

Local HTTP example:

```json
{
  "mcpServers": {
    "mockzilla": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:36666/api/mcp",
        "--allow-http"
      ]
    }
  }
}
```

HTTPS example, without `--allow-http`:

```json
{
  "mcpServers": {
    "mockzilla": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mockzilla.example.com/api/mcp"
      ]
    }
  }
}
```

Use `localhost`, not a LAN IP, for local development unless the MCP client runs on a different machine and the Docker/host firewall allows that traffic.

---

## 🚀 Supercharge with Agent Skills

While the raw MCP tools are powerful, you can provide your agent with **expert capabilities** by installing Mockzilla Skills. Skills are specialized instruction sets that teach your AI how to build high-fidelity mocks and complex workflows following our best practices.

### Universal Installation
You can use the universal `npx skills` tool to install these into any compatible agent (like Gemini CLI) by pointing to our repository:

```bash
npx skills add github.com/andrecrjr/mockzilla
```

When you run this command, you will be prompted to select which specialized skills you'd like to install (Mock Maker, Workflow Architect, Spec Translator, or Logic Doctor).

---

## Tool Reference

Mockzilla uses 7 consolidated manager tools to provide a clean, high-performance interface for AI agents. Each tool uses an `action` parameter to dispatch operations.

### 1. Folders (`manage_folders`)
Centralized management for mock folders.
- `list`: List all folders with pagination.
- `create`: Create a new folder (name, description, optional path slug).
- `get`: Fetch detail by ID or slug.
- `update`: Modify folder metadata.
- `delete`: Remove a folder and all its contents.

Folder `slug` values are now canonical top-level paths such as `/users` or `/app/test`. They must stay URL-safe, may include `/` for nested path segments, and become the public namespace under `/api/mock`.

### 2. Mock Subfolders (`manage_mock_subfolders`)
Nested organization inside a top-level folder.
- `list`: List root-level subfolders, children of a `parentId`, or all subfolders with `all: true`.
- `create`: Create a subfolder with `folderId` or `folderSlug`, `name`, optional `path` or compatibility `slug`, and optional `parentId`.
- `get`: Fetch one subfolder by ID.
- `update`: Change the display title with `name`, change the user-facing path with `path` or compatibility `slug`, or move a subfolder with `parentId`.
- `delete`: Delete an empty subfolder.

Subfolder `path` is derived from the internal segment hierarchy by Mockzilla and returned in the result. If `path` is omitted on create, the internal segment is generated from `name`; later `name` changes do not alter that segment. On create, a multi-segment `path` is resolved against the existing hierarchy and any missing intermediate segments are created before the final subfolder is returned. To place a mock in a subfolder, pass the returned subfolder `id` as `mockFolderId` to `manage_mocks`. Keep the mock `path` relative to that subfolder.

Example:

```json
{
  "action": "create",
  "folderSlug": "/api",
  "parentId": null,
  "name": "Users",
  "path": "/people"
}
```

### 3. Mocks (`manage_mocks`)

The MCP tool schema declares concrete JSON types and per-action required fields.
Pass `statusCode` and `delay` as JSON numbers, and boolean options such as
`enabled` as JSON booleans. Mock and workflow response status codes must be in
the inclusive range 200–599; delay must be a non-negative whole number.

This also applies to the workflow and observability tools: transition `id`,
pagination fields, and response `status` values are JSON numbers; flags are JSON
booleans.
Unified tool for defining and testing API responses.
- `list`: Paginated list of mocks, optionally filtered by folder.
- `create`: Create a mock. If `jsonSchema` is provided without a `response`, a dynamic response is auto-generated.
- `get`: Get full mock definition.
- `update`: Merge path, status, or any configuration field into the stored mock. Omitted fields keep their current persisted values, which prevents narrow UI saves such as inline mock-card path edits from rolling back the rest of the mock.
- `delay`: Response delay is stored in milliseconds and may be any non-negative whole number.
- `delete`: Delete a mock.
- `preview`: Test what a mock would return given a path, method, and request context.

Mock `path` values must be endpoint paths only, such as `/users`. Do not include search params in API or MCP `path` values, such as `/users?status=active`; use the structured `queryParams` field for query-string matching. Create and update calls reject payloads that mix endpoint paths with embedded search params. In the web UI, URL-style endpoint input such as `/users?status=active` remains visible in the Endpoint Path field while `status=active` is synchronized with Advanced Options; saved API payloads still submit `path` and `queryParams` separately.

### 4. Workflow Scenarios (`manage_scenarios`)
Manage stateful, multi-step scenario containers.
- `list`: List all active scenarios.
- `create`: Create a container for isolated state.
- `delete`: Delete a scenario and all its transitions/state.
- `export`: Export scenario(s) to JSON for backup or analysis.
- `import`: Bulk import scenarios and transitions from JSON data.

### 5. Workflow Transitions (`manage_transitions`)
Deep interaction with the logic engine steps.
- `list`: List all rules for a specific scenario.
- `create`: Define a "WHEN/THEN" rule (Path, Method, Conditions, Effects, Response).
- `update`: Surgically patch conditions, effects, or response configuration.
- `delete`: Remove a specific rule by its database ID.
- `create_full`: Atomic creation of a scenario and all its transitions in a single call.

### 6. Workflow Control (`workflow_control`)
Active state management and simulation.
- `inspect`: View the current `state` and `tables` (mini-DB) for a scenario.
- `reset`: Wipe the scenario state to start fresh.
- `seed`: Inject specific data into `state` or `tables` to force a specific state.
- `test`: Simulate a request end-to-end. Returns an `executionTrace` showing logic matching.
- `evaluate_template`: Statelessly evaluate Handlebars templates against a provided context.

### 7. Logs & Forensics (`manage_logs`)
Observe live traffic and debug failures.
- `get`: Query application logs (filter by level, type, or text search).
- `trace`: Reconstruct the chronological lifecycle of an HTTP request using its `reqId`.
- `clear`: Wipe the log file.

The log file lives at `.logs/mockzilla.log` for web/dev runs. Packaged desktop builds use `MOCKZILLA_LOG_DIR/mockzilla.log`, which defaults to a writable `logs` folder beside the desktop PGlite data directory.

---

## Workflow Rules & Guidelines

When using AI to build workflows, adhere to these architectural principles:

### 1. Action-Driven State
State changes should be **side-effects** of business logic.
- ❌ **Bad**: `POST /set-user-status` (Direct state manipulation)
- ✅ **Good**: `POST /checkout` (Updates inventory, creates order, clears cart)

### 2. Condition Validation
Conditions use a structured JSON format. Avoid Pure JS.
- **Allowed types**: `eq`, `neq`, `exists`, `gt`, `lt`, `contains`.
- **Fields**: `input.body.*`, `input.query.*`, `input.params.*`, `input.headers.*`, `state.*`, `db.*`.

### 3. Handlebars-First Effects
Effects handle data transformations using the full Power of the **Handlebars Engine**.
- **Allowed types**: `state.set`, `db.push`, `db.update`, `db.remove`.
- **Dynamic Data**: Use `{{faker}}` to generate unique IDs, timestamps, or random properties directly into your database.
- **Interpolation**: Fully supported for referencing `{{input}}`, `{{state}}`, and `{{db}}`.
- ❌ **No Pure JS**: Transitions define data transformations via Handlebars, not raw code execution.

---

## Integration Tips

- **Manager-First**: Always use the consolidated manager tools. The granular tools are deprecated to prevent TSC memory exhaustion.
- **Inspect Often**: When debugging workflows, use `workflow_control` (`action: 'inspect'`) to see exactly how your mini-DB tables are evolving.
- **Trace the Failure**: If simulation fails, check the `executionTrace`. If you need more detail, find the `reqId` in `manage_logs` (`action: 'get'`) and call `manage_logs` (`action: 'trace'`).
- **Transactional Imports**: Use `manage_scenarios` (`action: 'export'`) and (`action: 'import'`) to move complex setups between environments.
