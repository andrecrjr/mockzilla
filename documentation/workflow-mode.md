# Workflow Mode Guide

Mockzilla Workflow Mode enables stateful, scenario-based mocking with dynamic data, in-memory databases, and complex multi-step flows.

---

## Overview

| Feature | Static Mocking | Workflow Mode |
|---------|---------------|---------------|
| State | ❌ | ✅ Per-scenario state |
| Mini-Database | ❌ | ✅ CRUD on JSON tables |
| Conditions | ❌ | ✅ Match on state/input |
| Interpolation | Basic | ✅ Advanced (Arithmetic + Relational) |
| multi-step flows | ❌ | ✅ Transitions with effects |

**Use Cases**: SaaS subscription lifecycles, idempotent payment processing, polling job queues, complex e-commerce checkouts.

---

## Architecture: Action-Driven State

**State variables must not be endpoints.**

In a real application, you rarely "set the database status to 'paid'" via a direct API call. Instead, you "process a payment," and the *result* is that the status becomes 'paid'. Mockzilla workflows mirror this by making state changes a **side-effect** of business actions.

### The "Action-Driven" Pattern (Best Practice)
Trigger business logic that internally updates multiple state variables and db tables as a side effect.
- ✅ `POST /checkout` -> Updates `db.orders`, decrements `db.inventory`, clears `state.cart_id`.

---

## Core Concepts

### Scenarios
Isolated containers for state and transitions. Access via `/api/workflow/exec/{scenarioSlug}/{path}`.

### Transitions
Rules that define request processing. Mockzilla supports **multi-transition matching**: if multiple transitions match a path, the engine iterates through them until it finds one where the **Conditions** match.

### Advanced Interpolation
Use `{{ path.to.value }}` to inject dynamic values. Mockzilla supports **Basic Arithmetic** inside templates:

| Feature | Example | Result |
|---------|---------|--------|
| **Path Access** | `{{input.body.id}}` | Value from body |
| **Relational** | `{{db.users[0].name}}` | Data from Mini-DB |
| **Addition** | `{{state.count + 1}}` | Incremented value |
| **Subtraction** | `{{10 - db.items.length}}` | Remaining capacity |

> [!IMPORTANT]
> **Type Preservation**: If a template contains *only* the reference (e.g. `{{db.items}}`), Mockzilla returns the raw JSON type (Array/Object/Number). If it is embedded in text (e.g. `Count: {{db.items.length}}`), it returns a String.

---

## Conditions Reference

Conditions determine if a transition fires. **Mockzilla supports interpolation in condition values.**

| Type | Description | Example |
|------|-------------|---------|
| `eq` / `neq` | Equality | `{"type":"eq", "field":"input.headers.auth", "value":"Bearer {{state.token}}"}` |
| `exists` | Presence | `{"type":"exists", "field":"input.body.email"}` |
| `gt` / `lt` | Numeric | `{"type":"lt", "field":"db.usage.length", "value": 5}` |
| `contains` | Inclusion | `{"type":"contains", "field":"db.keys", "value":"{{input.headers.x-id}}"}` |

---

## Effects Reference

Effects modify state or mini-db when a transition fires.

### `state.set` - Atomic Updates
```json
{"type": "state.set", "raw": {"usage": "{{state.usage + 1}}", "last_active": "{{now}}"}}
```

### `db.push` / `db.update` / `db.remove`
Manage collections. `db.update` and `db.remove` use a `match` object to target specific rows.

---

## Advanced Masterclass Patterns

### 1. The Strict Idempotency Pattern (Payments)
Prevent duplicate charges by recording request IDs.

- **Transition A (Duplicate)**:
    - **Condition**: `db.processed_ids` contains `{{input.headers.x-request-id}}`
    - **Response**: `{"status": 200, "body": {"id": "TXN_PREV", "cached": true}}`
- **Transition B (New)**:
    - **Condition**: `input.headers.x-request-id` exists
    - **Effect**: `db.push` request ID to `processed_ids`
    - **Response**: `{"status": 201, "body": {"id": "TXN_NEW", "cached": false}}`

### 2. The Async Polling Simulation
Test frontend loading states by progressing through "Stages".

1. **Start**: `POST /jobs` sets `state.job_stage = 0`.
2. **Poll**: `GET /jobs/123`:
    - **Stage 1**: `Condition: state.job_stage < 2`
      - **Effect**: `state.set` `job_stage` to `{{state.job_stage + 1}}`
      - **Response**: `{"status": "processing"}`
    - **Stage 2**: `Condition: state.job_stage >= 2`
      - **Response**: `{"status": "completed", "data": "..."}`

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/workflow/exec/{scenario}/{path}` | `ANY` | Execute a transition |
| `/api/workflow/state/{scenario}` | `GET` | Inspect current state/DB |
| `/api/workflow/state/{scenario}` | `POST` | Initialize/Upsert state |
| `/api/workflow/state/{scenario}` | `DELETE` | Wipe scenario state |

---

## MCP Integration

Mockzilla exposes **24 specialized tools** to AI assistants (Claude, Cursor, etc.). Use `inspect_workflow_state` during development to watch your Mini-DB tables evolve in real-time as your application makes API calls.

---

## MCP Integration

Use AI assistants to interact with the Workflow engine via the MCP server at `app/api/[transport]/route.ts`.

### Available Tools

Mockzilla exposes **24 specialized tools** to AI assistants. They are grouped into four categories:

#### 1. Folders & Mocks
- `list_folders`, `create_folder`, `get_folder`, `update_folder`, `delete_folder`
- `list_mocks`, `get_mock`, `create_mock`, `update_mock`, `delete_mock`
  - Note: `create_mock` and `list_mocks` support `folderSlug` for easier AI automation.
- `create_schema_mock` (**Recommended** for dynamic data)
- `preview_mock` (Validate responses)

#### 2. Workflow Scenarios
- `list_workflow_scenarios`
- `create_workflow_scenario`, `delete_workflow_scenario`
- `export_workflow`, `import_workflow` (Snapshot and restore)

#### 3. Transitions & State
- `list_workflow_transitions`
- `create_workflow_transition`, `update_workflow_transition`, `delete_workflow_transition`
- `inspect_workflow_state` (View mini-DB and state variables)
- `reset_workflow_state` (Wipe scenario data)
- `test_workflow` (Simulate requests)

For detailed installation and configuration, see `documentation/mcp.md`.

### LLM Rules & Constraints

When using `create_workflow_transition` or `update_workflow_transition`, you MUST follow these validation rules. **Failure to follow these rules will result in validation errors.**

#### 1. Conditions
- **Format**: use the explicit rule array format for clarity.
  ```json
  [{"type": "eq", "field": "input.body.status", "value": "active"}]
  ```
- **Allowed Types**: `eq`, `neq`, `exists`, `gt`, `lt`, `contains`.
- ❌ **NO Pure JS**: Do not attempt to write JavaScript functions or expressions.
- ❌ **NO Dynamic Logic**: Logic must be expressed via the structured JSON conditions.

#### 2. Effects
- **Allowed Types**: `state.set`, `db.push`, `db.update`, `db.remove`.
- **Interpolation**: You may ONLY interpolate:
  - `{{state.var}}`
  - `{{db.table}}`
  - `{{input.body}}` inside value fields
  - `{{input.query}}`
  - `{{input.params}}`
- ❌ **NO Faker/Random**: Random value generation is NOT supported in effects.
- ❌ **NO Pure JS**: Transitions define data transformations, not code execution.

#### 4. Action-Driven State Only
- ❌ **NO CRUD Endpoints for State**: Do not create transitions solely to update state (e.g., `POST /update-state`).
- ✅ **Business Logic**: State updates must be side effects of business logic transitions (e.g., `POST /submit-order` updates `db.orders` and `state.cart_count`).

#### 5. Response
- **Strict Format**: Responses must be an object with `status` and `body`.
  ```json
  {
    "status": 201,
    "body": { "id": "{{input.body.id}}", "status": "created" }
  }
  ```
- **Interpolation**: Supported for `{{state}}`, `{{db}}`, `{{input}}`.
- ❌ **NO Faker/Random**: Responses must be deterministic based on state/inputs.

