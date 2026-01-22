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

Mockzilla exposes 24 specialized tools. They are grouped into four main categories:

### 1. Folders Management
Tools for grouping and organizing mocks.
- `list_folders`: List all folders with pagination.
- `create_folder`: Create a new folder (name, description).
- `get_folder`: Fetch detail by ID or slug.
- `update_folder`: Modify folder metadata.
- `delete_folder`: Remove a folder.

### 2. Mocks Management
Core tools for defining API responses.
- `list_mocks`: Paginated list of mocks, optionally filtered by folder.
- `create_mock`: Create a standard mock (static or basic dynamic).
- `create_schema_mock`: **(Recommended)** Create a mock using JSON Schema with Faker directives.
- `get_mock`: Get full mock definition.
- `update_mock`: Update path, status, or response.
- `delete_mock`: Delete a mock.
- `preview_mock`: Test what a mock would return given a path and method.

### 3. Workflow Scenarios
Manage stateful, multi-step scenarios.
- `list_workflow_scenarios`: List all active scenarios.
- `create_workflow_scenario`: Create a container for isolated state.
- `delete_workflow_scenario`: Delete a scenario and all its data.
- `export_workflow`: Export a scenario to JSON for analysis or backup.
- `import_workflow`: Import scenarios and transitions from JSON.

### 4. Workflow Transitions & State
Deep interaction with the workflow engine.
- `list_workflow_transitions`: List rules for a specific scenario.
- `create_workflow_transition`: Define a "WHEN/THEN" rule (Path, Method, Conditions, Effects, Response).
- `update_workflow_transition`: Refine an existing rule.
- `delete_workflow_transition`: Remove a rule.
- `inspect_workflow_state`: **(Powerful)** View the current `state` and `tables` (mini-DB) for a scenario.
- `reset_workflow_state`: Wipe the scenario state to start fresh.
- `test_workflow`: Simulate a request to verify complex logic/effects.

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
