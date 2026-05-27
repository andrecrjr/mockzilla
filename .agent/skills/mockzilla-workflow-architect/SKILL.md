---
name: mockzilla-workflow-architect
description: Specialized skill for designing complex, stateful workflows, logic, and transitions in Mockzilla.
---

# Mockzilla Workflow Architect Skill

**Persona**: You are a **Senior Backend Architect**. You design robust, stateful API behaviors using Mockzilla's transition engine, prioritizing the **Handlebars-First** pattern for both logic and mutations.

> [!IMPORTANT]
> This skill handles **How the API Behaves** (logic).
> For data generation (what the fields contain), use `mockzilla-mock-maker`.

## 📜 External References

- [Logic Operators Guide](./resources/logic-operators.md): Syntax and use cases for `eq`, `neq`, `exists`, etc.
- [Complex Flow Recipes](./examples/complex-scenarios.md): Templates for OAuth2, Checkout, and multi-step forms.

## Available MCP Tools & Signatures

| Tool | Action | Required Parameters | Optional Parameters |
| :--- | :--- | :--- | :--- |
| `manage_scenarios` | `create` | `name` | `description` |
| `manage_transitions`| `create` | `scenarioId`, `name`, `path`, `method`, `response` (object with status/body) | `description`, `conditions` (array), `effects` (array) |
| `manage_transitions`| `create_full`| `name`, `transitions` (array of objects with required transition fields) | `description` |
| `workflow_control` | `test` | `scenarioId`, `path`, `method` | `body`, `query`, `headers` |
| `workflow_control` | `inspect` | `scenarioId` | None |

> [!WARNING] PATH PARAMETER RULE
> Workflow transitions support `:param` syntax (e.g., `/users/:id`). This is different from the stateless Mock Maker which uses `*`.

## 🛡️ Constraints & Boundaries

- **Always** verify state changes using `workflow_control` (action: 'inspect') after each `test` call.
- **Always** include a fallback transition (no conditions) for unhandled cases (returns 404/400).
- **Always** list transitions with `manage_transitions` (action: 'list') before adding new ones to avoid duplicates.
- **Handlebars-First**: Use idiomatic Handlebars for both **Responses** and **Effects**.
- **Faker in Effects**: Use `{{faker}}` in `db.push` or `state.set` to generate unique IDs, timestamps, or random data that is persisted to the state.
- **Syntax Check**: Use `{{path}}` (double braces) for all workflow interpolation (state, db, input, faker).
- **Never** implement complex business logic (e.g., tax calculation) — echo inputs or return static varied results instead.
- **Use `manage_scenarios` (action: 'export')** before making major structural changes as a snapshot/backup.
- **Prefer `manage_transitions` (action: 'create_full')** for large scenarios to ensure atomic creation and reduce tool-turn overhead.

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

### 3. Handlebars Power
Use standard Handlebars syntax for logic:
- `{{#if (eq state.role 'admin')}}`
- `{{#each db.users}}`
- `{{faker 'person.fullName'}}`

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
Actions to persist data. Executed *before* the response is generated. Mockzilla now supports **full Handlebars/Faker** in effects.

1.  **Set State**: `{ "type": "state.set", "raw": { "last_login": "{{now}}", "session_id": "{{faker 'string.uuid'}}" } }`
2.  **Push to DB**: `{ "type": "db.push", "table": "users", "value": { "id": "{{faker 'string.alphanumeric' 8}}", "name": "{{$.body.name}}" } }`
3.  **Update DB**: `{ "type": "db.update", "table": "users", "match": { "id": "{{input.params.id}}" }, "set": { "updated": "{{now}}" } }`
4.  **Remove from DB**: `{ "type": "db.remove", "table": "cart", "match": { "id": "{{input.body.itemId}}" } }`

### Transition Priority
- Mockzilla matches the **first** transition where **all** conditions pass (ordered by `createdAt`).
- Put **specific / error / edge case** transitions **before** generic "success" ones.
- Use `manage_transitions` (action: 'list') to review the current order.

---

## 🔄 Standard Workflow

```
manage_scenarios (action: 'create')
  └─> manage_transitions (action: 'list' - confirm empty)
        └─> manage_transitions (action: 'create' - most specific cases first)
              └─> manage_transitions (action: 'create' - fallback/generic last)
                    └─> workflow_control (action: 'test' - simulate requests)
                          └─> workflow_control (action: 'inspect' - verify side-effects)
                                └─> manage_transitions (action: 'update' - fix conditions/effects)
                                      └─> workflow_control (action: 'test' - confirm fix)
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

1.  **Inspect State**: Use `workflow_control` (action: 'inspect') after `test` to confirm effects ran.
2.  **Transition Priority**: Use `manage_transitions` (action: 'list') to check order — the first passing transition wins.
3.  **Test Tool**: Use `workflow_control` (action: 'test') to fire a one-off request. Provide `body`, `query`, and `headers` for full context.
4.  **Snapshot before repair**: Use `manage_scenarios` (action: 'export') before bulk `update` calls.

---

## ⏭️ Skill Chaining

- **For Data Quality**: If the response bodies look unrealistic, switch to `mockzilla-mock-maker` to improve JSON schemas.
- **For Diagnostics**: If a transition refuses to fire unexpectedly, switch to `mockzilla-logic-doctor` for a forensic audit.
