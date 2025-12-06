# Workflow Mode Guide

Mockzilla Workflow Mode enables stateful, scenario-based mocking with dynamic data, in-memory databases, and complex multi-step flows.

---

## Overview

| Feature | Static Mocking | Workflow Mode |
|---------|---------------|---------------|
| State | ❌ | ✅ Per-scenario state |
| Mini-Database | ❌ | ✅ CRUD on JSON tables |
| Conditions | ❌ | ✅ Match on state/input |
| Multi-step flows | ❌ | ✅ Transitions with effects |

**Use Cases**: User registration, shopping carts, authentication flows, wizards, any stateful API simulation.

---

## Architecture

```
Request → Router → Processor → Response
             ↓          ↓
         Match Path   1. Load State
                      2. Check Conditions
                      3. Apply Effects
                      4. Save State
                      5. Return Response
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `scenarios` | Named workflow containers (id, name, description) |
| `transitions` | Rules defining path, conditions, effects, response |
| `scenario_state` | Persisted state and mini-db tables per scenario |

---

## Core Concepts

### Scenarios
A container that isolates state and transitions. Create via UI at `/workflows` or API.

### Transitions
Define how requests are processed:
- **Path**: URL pattern (e.g., `/users`, `/users/:id`)
- **Method**: HTTP method (GET, POST, PUT, DELETE)
- **Conditions**: Rules that must match for transition to fire
- **Effects**: Actions to modify state/db
- **Response**: What to return

### State (`state.{}`)
Key-value store per scenario. Access via `{{state.keyName}}`.

### Mini-DB (`db.{}`)
JSON array tables. Access via `{{db.tableName}}`.

### Interpolation
Use `{{ path.to.value }}` to inject dynamic values:

| Path | Description |
|------|-------------|
| `{{input.body.field}}` | Request body field |
| `{{input.query.param}}` | Query parameter |
| `{{input.params.id}}` | URL parameter from `:id` |
| `{{state.key}}` | State variable |
| `{{db.tableName}}` | Entire table array |

---

## Path Matching

Supports exact and parameterized paths:

```
/users          → Exact match
/users/:id      → Captures id as {{input.params.id}}
/cart/:sku/add  → Multiple params allowed
```

---

## Conditions Reference

Conditions determine if a transition fires. Empty conditions always match.

| Type | Description | Example |
|------|-------------|---------|
| `eq` | Equals | `{"type":"eq", "field":"input.body.role", "value":"admin"}` |
| `neq` | Not equals | `{"type":"neq", "field":"state.status", "value":"locked"}` |
| `exists` | Field exists | `{"type":"exists", "field":"input.body.token"}` |
| `gt` | Greater than | `{"type":"gt", "field":"input.body.quantity", "value":0}` |
| `lt` | Less than | `{"type":"lt", "field":"state.attempts", "value":3}` |
| `contains` | String/array contains | `{"type":"contains", "field":"db.roles", "value":"admin"}` |

### Header-Based Conditions
Check HTTP headers in conditions:
```json
[
  {"type": "exists", "field": "input.headers.authorization"},
  {"type": "eq", "field": "input.headers.x-api-key", "value": "secret-key"}
]
```

### Condition Array (AND logic)
```json
[
  {"type": "exists", "field": "input.body.email"},
  {"type": "eq", "field": "state.registered", "value": false}
]
```

---

## Effects Reference

Effects modify state or mini-db when a transition fires.

### `state.set` - Set State Variables
```json
{"type": "state.set", "raw": {"isLoggedIn": true, "userId": "{{input.body.id}}"}}
```

### `db.push` - Append to Table
```json
{"type": "db.push", "table": "users", "value": "{{input.body}}"}
```

### `db.update` - Update Matching Rows
```json
{"type": "db.update", "table": "users", "match": {"id": "{{input.body.id}}"}, "set": {"status": "active"}}
```

### `db.remove` - Delete Matching Rows
```json
{"type": "db.remove", "table": "cart", "match": {"sku": "{{input.params.sku}}"}}
```

---

## API Endpoints

### Trigger Transitions
```http
POST /api/workflow/users
Content-Type: application/json

{"name": "John", "email": "john@example.com"}
```

Response determined by matching transition.

### Get State
```http
GET /api/workflow/state/{scenarioId}
```
Returns: `{"data": {"state": {...}, "tables": {...}}}`

### Reset State
```http
DELETE /api/workflow/state/{scenarioId}
```

### Manage Scenarios
```http
GET  /api/workflow/scenarios          # List all
POST /api/workflow/scenarios          # Create new
```

### Manage Transitions
```http
GET  /api/workflow/transitions?scenarioId=xxx   # List for scenario
POST /api/workflow/transitions                   # Create
GET  /api/workflow/transitions/{id}              # Get one
PUT  /api/workflow/transitions/{id}              # Update
DELETE /api/workflow/transitions/{id}            # Delete
```

---

## Complete Example: User Registration

### Scenario: `user-signup`

#### Transition 1: Register User
| Field | Value |
|-------|-------|
| Path | `/register` |
| Method | `POST` |
| Conditions | `[]` (always matches) |
| Effects | `[{"type":"db.push", "table":"users", "value":"{{input.body}}"}]` |
| Response | `{"status":201, "body":{"success":true, "message":"User created"}}` |

#### Transition 2: List Users
| Field | Value |
|-------|-------|
| Path | `/users` |
| Method | `GET` |
| Conditions | `[]` |
| Effects | `[]` |
| Response | `{"status":200, "body":"{{db.users}}"}` |

### Testing
```bash
# Register a user
curl -X POST http://localhost:3000/api/workflow/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice", "email":"alice@test.com"}'

# List users
curl http://localhost:3000/api/workflow/users
# Returns: [{"name":"Alice", "email":"alice@test.com"}]
```

---

## MCP Integration

Use AI assistants with MCP tools:

| Tool | Description |
|------|-------------|
| `create_workflow_transition` | Create transitions programmatically |
| `update_workflow_transition` | Update an existing transition by ID |
| `delete_workflow_transition` | Delete a transition by ID |
| `list_workflow_transitions` | List all transitions for a scenario |
| `test_workflow` | Test a workflow by simulating a request |
| `reset_workflow_state` | Reset scenario state |
| `inspect_workflow_state` | View current state |

