---
name: mockzilla-creator
description: Specialized skill for creating and focused on managing high-quality mocks in Mockzilla.
---

# Mockzilla Creator Skill

This skill guides you through creating effective, dynamic, and stateful mocks using Mockzilla's MCP tools.

## Core Principles

1.  **Stateless First**: Use `create_schema_mock` for 90% of use cases. It's faster and easier to maintain.
2.  **Stateful for Workflows**: Use `create_workflow_scenario` only when the response depends on previous actions (e.g., Auth, Multi-step forms).
3.  **Consistency is Key**: Use **Interpolation** to link fields (e.g., `id` and `message`) and **Faker** for realistic data and only when it's necessary.
4.  **Deterministic Logic**: Keep transitions and effects simple. Complex logic belongs in the schema or the application, not the mock engine.

---

## 🛠️ Tool Selection Guide

| Task | Recommended Tool | Why? |
| :--- | :--- | :--- |
| **New Mock** | `create_schema_mock` | Supports JSON Schema + Faker + Interpolation automatically. |
| **Dynamic Data** | `create_schema_mock` | Best for generating lists, objects, and realistic strings. |
| **Login/Auth** | `create_workflow_transition` | Allows setting `state.isLoggedIn` and checking it later. |
| **CRUD Simulation** | `create_workflow_transition` | Use `db.push` and `db.update` to persist mock data in-memory. |
| **Debugging** | `inspect_workflow_state` | See exactly what's in the mini-DB and current state. |

---

## 🎨 JSON Schema & Faker Patterns

### The "Premium" Schema Template
Use this pattern to WOW the user with realistic data:

```json
{
  "type": "object",
  "required": ["id", "user", "metadata", "status"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "user": {
      "type": "object",
      "properties": {
        "firstName": { "type": "string", "faker": "person.firstName" },
        "lastName": { "type": "string", "faker": "person.lastName" },
        "email": { "type": "string", "faker": "internet.email" },
        "avatar": { "type": "string", "faker": "image.avatar" }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "createdAt": { "type": "string", "faker": "date.past" },
        "ip": { "type": "string", "faker": "internet.ipv4" }
      }
    },
    "status": { "type": "string", "enum": ["active", "pending", "archived"] }
  }
}
```

### Passing Arguments to Faker
```json
{
  "amount": {
    "type": "string",
    "faker": { "finance.amount": [100, 5000, 2, "$"] }
  }
}
```

---

## 🔗 Interpolation & Field Referencing

**CRITICAL**: Use interpolation to make your mocks feel "alive" and consistent, but only when it's necessary.

### 1. Internal Consistency (Inside Schema)
Reference other generated fields using `{$.path}`.
```json
{
  "orderId": { "type": "string", "format": "uuid" },
  "summary": { "const": "Confirming order {$.orderId} for {$.user.firstName}" }
}
```

### 2. Request Data Echo (In Workflows)
Reference input data in your response or effects using `{{input.*}}`.
- `{{input.body.name}}`
- `{{input.params.id}}`
- `{{input.query.search}}`

### 3. State & DB Access (In Workflows)
Reference the mini-DB or scenario state.
- `{{state.token}}`
- `{{db.users[0].name}}`

---

## 🔄 Workflow Recipes

### The "Auth Flow" Recipe
1.  **POST /login**: 
    - Effect: `{ "type": "state.set", "raw": { "user": "{{input.body}}", "isLoggedIn": true } }`
    - Response: `{ "status": "ok", "token": "mock-jwt-{{input.body.username}}" }`
2.  **GET /me**:
    - Condition: `{ "type": "eq", "field": "state.isLoggedIn", "value": true }`
    - Response: `{{state.user}}`

### The "CRUD" Recipe
1.  **POST /items**:
    - Effect: `{ "type": "db.push", "table": "items", "value": "{{input.body}}" }`
2.  **GET /items**:
    - Response: `{ "data": "{{db.items}}" }`

---

## ⚠️ Troubleshooting

- **Reference Errors**: If `{$.path}` appears literally, ensure the referenced field is defined *before* or at the same level in the JSON object (though Mockzilla resolves after generation, order helps readability).
- **Condition Mismatch**: Use `inspect_workflow_state` to verify if your values match exactly (type and casing).
- **Schema Validation**: Ensure `type` is present for every property in `create_schema_mock`.
- **Default Limits**: Mockzilla defaults `maxItems` to 5. Explicitly set `minItems`/`maxItems` in your schema if you need more.

---

## 💎 Premium Templates (Copy-Paste)

### 🛍️ E-commerce Product
```json
{
  "type": "object",
  "required": ["id", "name", "price", "rating", "image"],
  "properties": {
    "id": { "type": "string", "faker": "string.uuid" },
    "name": { "type": "string", "faker": "commerce.productName" },
    "description": { "type": "string", "faker": "commerce.productDescription" },
    "price": { "type": "string", "faker": "commerce.price" },
    "rating": { "type": "number", "faker": { "number.float": { "min": 1, "max": 5, "fractionDigits": 1 } } },
    "image": { "type": "string", "faker": "image.url" },
    "tags": {
      "type": "array",
      "minItems": 2,
      "maxItems": 4,
      "items": { "type": "string", "faker": "commerce.department" }
    }
  }
}
```

### 📊 SaaS User Dashboard
```json
{
  "type": "object",
  "properties": {
    "user": {
      "type": "object",
      "properties": {
        "id": { "type": "string", "faker": "string.uuid" },
        "email": { "type": "string", "faker": "internet.email" },
        "plan": { "type": "string", "enum": ["free", "pro", "enterprise"] },
        "status": { "type": "string", "enum": ["active", "suspended"] }
      }
    },
    "stats": {
      "type": "object",
      "properties": {
        "dailyVisits": { "type": "integer", "faker": { "number.int": { "min": 100, "max": 5000 } } },
        "totalRevenue": { "type": "string", "faker": "finance.amount" }
      }
    },
    "recentActivity": {
      "type": "array",
      "minItems": 3,
      "items": {
        "type": "object",
        "properties": {
          "action": { "type": "string", "enum": ["login", "purchase", "update_profile"] },
          "timestamp": { "type": "string", "faker": "date.recent" }
        }
      }
    }
  }
}
```

### 📱 Social Feed Post
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "faker": "string.uuid" },
    "author": {
      "type": "object",
      "properties": {
        "username": { "type": "string", "faker": "internet.userName" },
        "avatar": { "type": "string", "faker": "image.avatar" }
      }
    },
    "content": { "type": "string", "faker": "lorem.paragraph" },
    "likes": { "type": "integer", "faker": { "number.int": { "min": 0, "max": 1000 } } },
    "comments": {
      "type": "array",
      "maxItems": 2,
      "items": {
        "type": "object",
        "properties": {
          "user": { "type": "string", "faker": "internet.userName" },
          "text": { "type": "string", "faker": "lorem.sentence" }
        }
      }
    }
  }
}
```

---

## 🚀 Advanced Workflow Recipes

### 📄 Pagination
Simulate standardized pagination using `input.query`.

**Variables**:
- `page`: `{{input.query.page}}` (defaults to 1 if missing is handled by app logic, or use fallback in schema)

**Transition**:
- Path: `/api/items`
- Response Body:
```json
{
  "page": "{{input.query.page}}",
  "total": 100,
  "data": "{{db.items}}" 
}
```
*Note: Real slicing requires advanced logic, but echoing the page number helps frontend integration.*

### 🛑 Error Simulation (Chaos Engineering)
Toggle errors without changing code.

1.  **Set State**: `POST /admin/toggle-error` -> `state.set: { forceError: true }`
2.  **Check Condition**:
    - Trigger: `{"type": "eq", "field": "state.forceError", "value": true}`
    - Response: `500` `{ "error": "Simulated outage" }`

### 🐢 Network Latency
Mockzilla processes requests instantly. To simulate latency:
- Use `mock_delay` header if supported by client, or
- Rely on client-side throttling (Network tab in DevTools) for UI testing.
*Mockzilla itself does not currently support server-side sleep effects.*

---

## 🧪 Testing & Verification

1.  **Schema Validation**: 
    - Use `preview_mock` with your schema *before* creating the mock.
    - Check for `[ref:key-not-found]` in the output to catch bad interpolation paths.

2.  **State Verification**:
    - Use `inspect_workflow_state` to view the *real* values in `db.*`.
    - Compare `{{db.users[0].id}}` with `{{state.currentUserId}}` to debug mismatches.

3.  **Performance**:
    - Keep schemas simple. Deeply nested arrays with `maxItems: 100` can slow down generation.
    - Default `maxItems` is 5 for a reason—it's enough for UI testing.
