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

### Hybrid Interpolation & Handlebars

Mockzilla workflows use a **Handlebars-First Hybrid Engine**. While simple field references are handled by a high-performance engine for type preservation, **Handlebars is the primary way** to handle logic, loops, and conditional responses.

### Smart Hybrid Engine
- **Type Preservation**: If a field contains only a reference (e.g. `{{db.items}}`), it returns the raw JSON type.
- **Handlebars Logic**: If the template contains logic blocks (`{{#if}}`, `{{#each}}`) or helpers, it evaluates via Handlebars and attempts to re-parse as JSON.

### Workflow Context
Workflows provide a rich context for interpolation:
- `state`: Scenario state variables
- `db` or `tables`: Mini-database tables
- `input`: Request data (`query`, `params`, `headers`, `body`)
- `$`: Alias for `input`
- `faker`: Full Faker.js instance (supported in **Responses** only)

### Logic Patterns

| Feature | Example |
|---------|---------|
| **Path Access** | `{{$.body.id}}` |
| **Logic** | `{{#if state.is_active}}Active{{else}}Disabled{{/if}}` |
| **Loops** | `{{#each db.users}}...{{/each}}` |
| **Faker** | `{{faker "string.uuid"}}` |
| **Arithmetic** | `{{math state.count "+" 1}}` |
| **JSON Stringify** | `{{{json db.users}}}` (Triple braces recommended) |

> [!TIP]
> **Faker & Handlebars in Effects**: Mockzilla supports dynamic data generation even in your database effects. You can use `{{faker}}` to generate unique IDs or dynamic properties that are then stored in your Mini-DB.

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

Use AI assistants to interact with the Workflow engine via the MCP server at `app/api/[transport]/route.ts`.

### Available Tools

Mockzilla exposes consolidated manager tools to AI assistants. Each tool uses an `action` parameter so agents can work through a small, stable interface.

#### 1. Folders & Mocks
- `manage_folders`: `list`, `create`, `get`, `update`, `delete`
- `manage_mock_subfolders`: `list`, `create`, `get`, `update`, `delete`
- `manage_mocks`: `list`, `create`, `get`, `update`, `delete`, `preview`
  - Use `manage_mocks` (action: `create`) with `jsonSchema` for dynamic data.
  - Use `manage_mocks` (action: `preview`) to validate responses.

#### 2. Workflow Scenarios
- `manage_scenarios`: `list`, `create`, `delete`, `export`, `import`
  - Use `manage_scenarios` (action: `export`) before bulk workflow changes.

#### 3. Transitions & State
- `manage_transitions`: `list`, `create`, `update`, `delete`, `create_full`
- `workflow_control`: `inspect`, `reset`, `seed`, `test`, `evaluate_template`
  - Use `workflow_control` (action: `inspect`) to view mini-DB tables and state variables.
  - Use `workflow_control` (action: `test`) to simulate requests.

#### 4. Logs & Forensics
- `manage_logs`: `get`, `trace`, `clear`

For detailed installation and configuration, see `documentation/mcp.md`.

### LLM Rules & Constraints

When using `manage_transitions` (action: `create` or `update`), you MUST follow these validation rules. **Failure to follow these rules will result in validation errors.**

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
- **Interpolation**: Fully supported via the Hybrid Engine. You may interpolate:
  - `{{state.var}}`
  - `{{db.table}}`
  - `{{input.body}}`
  - `{{faker}}` (Supported for dynamic ID generation, etc.)
- ❌ **NO Pure JS**: Transitions define data transformations, not code execution.

#### 4. Action-Driven State Only
- ❌ **NO CRUD Endpoints for State**: Do not create transitions solely to update state (e.g., `POST /update-state`).
- ✅ **Business Logic**: State updates must be side effects of business logic transitions (e.g., `POST /submit-order` updates `db.orders` and `state.cart_count`).

#### 5. Response
- **Strict Format**: Responses must be an object with `status` and `body`.
  ```json
  {
    "status": 201,
    "body": { "id": "{{$.body.id}}", "status": "created" }
  }
  ```
- **Interpolation**: Fully supported via Handlebars. Use `{{state}}`, `{{db}}`, `{{$ or input}}`, and `{{faker}}`.
- ✅ **Dynamic Logic**: You can use `{{#if}}` and `{{#each}}` inside response bodies to create complex data structures.
