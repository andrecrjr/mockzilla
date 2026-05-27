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

### Option 1: Direct URL (Preferred for AI IDEs)
Most MCP-native clients (like Cursor, Windsurf, or custom agents) can connect directly to the HTTP endpoint.

**Endpoint URL**: `http://localhost:36666/api/mcp`

### Option 2: Stdio Bridge (For Claude Desktop & CLI tools)
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

Mockzilla uses 6 consolidated manager tools to provide a clean, high-performance interface for AI agents. Each tool uses an `action` parameter to dispatch operations.

### 1. Folders (`manage_folders`)
Centralized management for mock folders.
- `list`: List all folders with pagination.
- `create`: Create a new folder (name, description).
- `get`: Fetch detail by ID or slug.
- `update`: Modify folder metadata.
- `delete`: Remove a folder and all its contents.

### 2. Mocks (`manage_mocks`)
Unified tool for defining and testing API responses.
- `list`: Paginated list of mocks, optionally filtered by folder.
- `create`: Create a mock. If `jsonSchema` is provided without a `response`, a dynamic response is auto-generated.
- `get`: Get full mock definition.
- `update`: Update path, status, or any configuration field.
- `delete`: Delete a mock.
- `preview`: Test what a mock would return given a path, method, and request context.

### 3. Workflow Scenarios (`manage_scenarios`)
Manage stateful, multi-step scenario containers.
- `list`: List all active scenarios.
- `create`: Create a container for isolated state.
- `delete`: Delete a scenario and all its transitions/state.
- `export`: Export scenario(s) to JSON for backup or analysis.
- `import`: Bulk import scenarios and transitions from JSON data.

### 4. Workflow Transitions (`manage_transitions`)
Deep interaction with the logic engine steps.
- `list`: List all rules for a specific scenario.
- `create`: Define a "WHEN/THEN" rule (Path, Method, Conditions, Effects, Response).
- `update`: Surgically patch conditions, effects, or response configuration.
- `delete`: Remove a specific rule by its database ID.
- `create_full`: Atomic creation of a scenario and all its transitions in a single call.

### 5. Workflow Control (`workflow_control`)
Active state management and simulation.
- `inspect`: View the current `state` and `tables` (mini-DB) for a scenario.
- `reset`: Wipe the scenario state to start fresh.
- `seed`: Inject specific data into `state` or `tables` to force a specific state.
- `test`: Simulate a request end-to-end. Returns an `executionTrace` showing logic matching.
- `evaluate_template`: Statelessly evaluate Handlebars templates against a provided context.

### 6. Logs & Forensics (`manage_logs`)
Observe live traffic and debug failures.
- `get`: Query application logs (filter by level, type, or text search).
- `trace`: Reconstruct the chronological lifecycle of an HTTP request using its `reqId`.
- `clear`: Wipe the log file.

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
