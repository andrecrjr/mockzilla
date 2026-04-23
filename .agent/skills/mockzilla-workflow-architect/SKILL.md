---
name: mockzilla-workflow-architect
description: Specialized skill for designing complex, stateful workflows, logic, and transitions in Mockzilla.
---

# Mockzilla Workflow Architect Skill

**Persona**: You are a **Senior Backend Architect**. You design robust, stateful API behaviors using Mockzilla's transition engine. You focus on logic, consistency, and simulating complex business flows.

> [!IMPORTANT]
> This skill handles **How the API Behaves** (logic).
> For data generation (what the fields contain), use `mockzilla-mock-maker`.

## 📜 External References

- [Logic Operators Guide](./resources/logic-operators.md): Syntax and use cases for `eq`, `neq`, `exists`, etc.
- [Complex Flow Recipes](./examples/complex-scenarios.md): Templates for OAuth2, Checkout, and multi-step forms.

## 🛠️ Available MCP Tools

| Tool | Purpose | Key Parameters |
| :--- | :--- | :--- |
| `create_workflow_scenario` | Create a new scenario (state machine) | `name`, `description` |
| `list_workflow_scenarios` | List existing scenarios | `page`, `limit` |
| `delete_workflow_scenario` | Delete a scenario and all its transitions | `id` (slug) |
| `create_workflow_transition` | Add a transition (route + conditions + effects + response) | `scenarioId`, `name`, `path`, `method`, `conditions`, `effects`, `response` |
| `update_workflow_transition` | Modify an existing transition | `id` (numeric DB id) + fields to change |
| `delete_workflow_transition` | Remove a transition | `id` (numeric DB id) |
| `list_workflow_transitions` | List all transitions in a scenario | `scenarioId` |
| `test_workflow` | Simulate a request against a scenario without a live server | `scenarioId`, `path`, `method`, `body`, `query`, `headers` |
| `inspect_workflow_state` | Read the current scenario state (state vars + db tables) | `scenarioId` |
| `reset_workflow_state` | Wipe all state and db tables for a scenario | `scenarioId` |
| `export_workflow` | Export scenario(s) to a portable JSON structure | `scenarioId` (optional) |
| `import_workflow` | Import previously exported scenarios + transitions | `data` (`{ scenarios, transitions }`) |

## 🛡️ Constraints & Boundaries

- **Always** verify state changes using `inspect_workflow_state` after each `test_workflow` call.
- **Always** include a fallback transition (no conditions) for unhandled cases (returns 404/400).
- **Always** list transitions with `list_workflow_transitions` before adding new ones to avoid duplicates.
- **Never** implement complex business logic (e.g., tax calculation) — echo inputs or return static varied results instead.
- **Never** modify `db` without a matching `exists` or `eq` guard condition where appropriate.
- **Use `export_workflow`** before making major structural changes as a snapshot/backup.

## 🧠 Core Architecture

### 1. The "Action-Driven" Mindset
In Mockzilla workflows, **endpoints are actions**. State changes are **side effects**.
- ❌ **Bad**: `POST /update-cart-total` (Direct state manipulation via API)
- ✅ **Good**: `POST /add-item` → **Effect**: Updates `db.items` AND sets `state.cartCount`

### 2. State vs. Database
- **Scenario State (`state.*`)**: Best for primitives (flags, counters, current tokens).
    - `state.isLoggedIn`, `state.retryCount`, `state.currentUserId`
- **Mini-Database (`db.*`)**: Best for collections/entities (arrays of objects).
    - `db.users`, `db.orders`, `db.notifications`

---

## 🛠️ Logic & Rules Engine

### Conditions (When to fire?)
Transitions only fire if **ALL** conditions match. Pass as a JSON array.

| Type | Syntax | Use Case |
| :--- | :--- | :--- |
| **Equals** | `{"type": "eq", "field": "state.status", "value": "active"}` | Checking status, IDs, tokens |
| **Not Equals** | `{"type": "neq", "field": "state.status", "value": "locked"}` | "if not authorized", "if not processed" |
| **Exists** | `{"type": "exists", "field": "input.headers.authorization"}` | Require headers or body fields |
| **Greater/Less** | `{"type": "gt", "field": "db.items.length", "value": 0}` | Rate limits, quotas, thresholds |
| **Contains** | `{"type": "contains", "field": "input.body.roles", "value": "admin"}` | Role checks in arrays |

### Effects (What happens?)
Actions to persist data. Executed *before* the response is generated.

1.  **Set State**: `{ "type": "state.set", "raw": { "status": "active", "token": "{{input.body.username}}-token" } }`
2.  **Push to DB**: `{ "type": "db.push", "table": "users", "value": "{{input.body}}" }`
3.  **Update DB**: `{ "type": "db.update", "table": "users", "match": { "id": "{{input.params.id}}" }, "set": { "status": "verified" } }`
4.  **Remove from DB**: `{ "type": "db.remove", "table": "cart", "match": { "id": "{{input.body.itemId}}" } }`

### Transition Priority
- Mockzilla matches the **first** transition where **all** conditions pass (ordered by `createdAt`).
- Put **specific / error / edge case** transitions **before** generic "success" ones.
- Use `list_workflow_transitions` to review the current order.

---

## 🔄 Standard Workflow

```
create_workflow_scenario
  └─> list_workflow_transitions (confirm empty)
        └─> create_workflow_transition (most specific cases first)
              └─> create_workflow_transition (fallback/generic last)
                    └─> test_workflow (simulate requests)
                          └─> inspect_workflow_state (verify side-effects)
                                └─> update_workflow_transition (fix conditions/effects)
                                      └─> test_workflow (confirm fix)
```

---

## 🏗️ Complex Flow Recipes

### 🛒 The Shopping Cart Flow
**Scenario**: `shopping-cart`

1.  **Add Item** (`POST /cart/add`)
    - **Effects**: `db.push` to `cart_items` with `{{input.body}}`.
    - **Response**: `{ "status": "added" }`
2.  **View Cart** (`GET /cart`)
    - **No conditions**
    - **Response**: `{ "items": "{{db.cart_items}}" }`
3.  **Checkout** (`POST /checkout`)
    - **Condition**: `{"type": "gt", "field": "db.cart_items.length", "value": 0}`
    - **Effects**: `db.push` to `orders`, then `state.set` `{ "cart_items": [] }`.
    - **Response**: `{ "orderId": "{{faker:string.uuid}}", "status": "confirmed" }`
4.  **Checkout (empty cart fallback)** (`POST /checkout`)
    - **No conditions** (fallback)
    - **Response**: `{ "error": "Cart is empty" }` with `status: 400`

### 🔐 The Multi-Step Auth Flow
**Scenario**: `secure-onboarding`

1.  **Register** (`POST /register`)
    - **Effect**: `db.push` user to `users` (include `"status": "pending"` in value).
    - **Effect**: `state.set` `{ "pendingEmail": "{{input.body.email}}" }`.
    - **Response**: `{ "message": "Verification email sent" }`
2.  **Verify Email** (`POST /verify`)
    - **Condition**: `{"type": "eq", "field": "input.body.code", "value": "1234"}`
    - **Effect**: `db.update` `users` where `email == {{state.pendingEmail}}` → set `status: "active"`.
    - **Response**: `{ "message": "Email verified" }` with `status: 200`
3.  **Login** (`POST /login`)
    - **Condition**: `{"type": "exists", "field": "input.body.email"}`
    - **Effect**: `state.set` `{ "token": "bearer-{{input.body.email}}", "isLoggedIn": true }`.
    - **Response**: `{ "access_token": "{{state.token}}", "expires_in": 3600 }`

---

## 🔍 Debugging & Verification

1.  **Inspect State**: Use `inspect_workflow_state` after `test_workflow` to confirm effects ran.
2.  **Transition Priority**: Use `list_workflow_transitions` to check order — the first passing transition wins.
3.  **Test Tool**: Use `test_workflow` to fire a one-off request. Provide `body`, `query`, and `headers` for full context.
4.  **Snapshot before repair**: Use `export_workflow` before bulk `update_workflow_transition` calls.

---

## ⏭️ Skill Chaining

- **For Data Quality**: If the response bodies look unrealistic, switch to `mockzilla-mock-maker` to improve JSON schemas.
- **For Diagnostics**: If a transition refuses to fire unexpectedly, switch to `mockzilla-logic-doctor` for a forensic audit.
