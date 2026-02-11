# Model Context Protocol (MCP) Integration

Mockzilla exposes a first-class **Model Context Protocol (MCP)** server, allowing AI agents (like Claude Desktop, Cursor, or specialized agents) to fully control and automate your mocking environment.

---

## What is MCP?

The Model Context Protocol (MCP) is an open-standard connector that enables LLMs to interact with external tools and data sources. In Mockzilla, it allows an AI assistant to:
- Create and manage mocks dynamically.
- Setup complex, stateful workflow scenarios.
- Inspect and reset in-memory database states.
- Simulate and test API paths without leaving the chat interface.

---

## Installation & Setup

Mockzilla uses the **WebStandardStreamableHTTPServerTransport**, which supports the MCP Streamable HTTP protocol.

### Option 1: Direct URL (Preferred)
Modern MCP clients (like Cursor or custom agents) can connect directly to the HTTP endpoint.

**Endpoint URL**: `http://localhost:36666/api/mcp`

### Option 2: Stdio Bridge (For Claude Desktop)
If your client only supports local `stdio` servers, use `mcp-remote` as a bridge:

```json
{
  "mcpServers": {
    "mockzilla": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:36666/api/mcp"
      ]
    }
  }
}
```

---

## Tool Reference

Mockzilla exposes 9 consolidated, domain-based tools. They use **Discriminated Unions** for actions (e.g., `create`, `update`, `delete`).

### 1. Folders
Manage grouping and organization of mocks.
- `find_folders`: Search or list folders.
  - Actions: `list`, `get`.
- `manage_folders`: CRUD operations for folders.
  - Actions: `create`, `update`, `delete`.

### 2. Mocks
Core tools for defining API responses.
- `find_mocks`: Search or list mocks.
  - Actions: `list`, `get`.
- `manage_mocks`: CRUD operations for mocks.
  - Actions: `create`, `update`, `delete`. Supports standard mock creation and **JSON Schema** generation.
- `preview_mock`: Test what a mock would return given a path and method.

### 3. Workflows (Scenarios & Transitions)
Manage stateful, multi-step scenarios and rules.
- `find_workflow`: Inspect scenarios and their configurations.
  - Actions: `list_scenarios`, `list_transitions`, `get_scenario`, `inspect_state`.
- `manage_workflow`: CRUD for workflow components.
  - Actions: `create_scenario`, `delete_scenario`, `create_transition`, `update_transition`, `delete_transition`, `reset_state`.
- `test_workflow`: Simulate a request to verify complex logic/effects.
- `import_export`: Bulk operations for workflow data.
  - Actions: `import`, `export`.

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

### 3. Effect Limitations
Effects handle data transformations.
- **Allowed types**: `state.set`, `db.push`, `db.update`, `db.remove`.
- **Interpolation**: Use `{{path}}` to reference input or state.
- ❌ **No Randomness**: Effects must be deterministic. Use `create_schema_mock` if you need randomness in the response body.

---

## Integration Tips

- **Use Schema Mocks**: For data-heavy mocks, provide the AI with a JSON Schema. It's much more reliable than asking it to generate large JSON blobs.
- **Inspect Often**: When debugging workflows, use `inspect_workflow_state` to see exactly how your mini-DB tables are evolving.
- **Transactional Imports**: Use `export_workflow` and `import_workflow` to move complex setups between environments or to "snapshot" a known good state.
- **Leverage Skills**: Don't just rely on raw tools. Use **Agent Skills** ([skills.md](/documentation/skills.md)) to provide the AI with proven patterns for complex Mockzilla tasks.
