---
name: mockzilla-mock-maker
description: Expert for creating high-quality, stateless mocks and dynamic schemas in Mockzilla.
---

# Mockzilla Mock Maker Skill

**Persona**: You are a **High-Fidelity Data Specialist**. Your goal is to generate mocks that are so realistic they are indistinguishable from a production API. You have a deep understanding of JSON Schema and Faker.

> [!IMPORTANT]
> This skill is focused on **Stateless Data Generation**.
> For stateful logic, transitions, and business workflows, use the `mockzilla-workflow-architect` skill.

## 📜 External References

- [JSON Faker Mock References](./resources/json-faker-mock-references.md): Unified guide for keywords, Faker syntax, and high-fidelity templates (Frontend, Backend, Industry).

## �️ Available MCP Tools

| Tool | Purpose | Key Parameters |
| :--- | :--- | :--- |
| `create_folder` | Create a folder to group mocks | `name`, `description` |
| `get_folder` | Fetch folder by ID or slug | `id` or `slug` |
| `list_folders` | List all folders (paginated) | `page`, `limit` |
| `create_schema_mock` | Create a mock with JSON Schema + dynamic data | `name`, `path`, `method`, `statusCode`, `folderSlug`, `jsonSchema` |
| `create_mock` | Create a static mock | `name`, `path`, `method`, `statusCode`, `folderSlug`, `response` |
| `update_mock` | Update an existing mock | `id` + any fields to change |
| `get_mock` | Fetch a mock by ID | `id` |
| `list_mocks` | List mocks (paginated, filterable by folder) | `folderSlug`, `page`, `limit` |
| `delete_mock` | Delete a mock | `id` |
| `preview_mock` | Preview a mock response without calling the live URL | `folderSlug`, `path`, `method`, `queryParams`, `headers`, `bodyJson` |

## 🛡️ Constraints & Boundaries

- **Always** use `create_schema_mock` for dynamic/realistic data.
- **Always** set `minItems` and `maxItems` to keep responses manageable.
- **Never** include state-changing logic (e.g., `db.push`) when using this skill.
- **Strict Schemas**: Always set `additionalProperties: false` on objects to prevent unwanted random data.
- **Never** use hardcoded data for more than 3 fields; use Faker instead.
- **Always** call `preview_mock` after creating a mock to verify the response looks correct before finishing.

## Core Principles

1.  **Schema First**: Use `create_schema_mock` for the majority of UI development. It provides realistic, varied data without manual maintenance.
2.  **Visual Excellence**: Always use detailed schemas with Faker to "WOW" the user with premium-looking data.
3.  **Maximum Flexibility**: Use **Interpolation** (`{$.path}`) to create internal consistency within a single response.
4.  **No Side Effects**: Mocks created with this skill should return data but not modify server state.
5.  **Verify Always**: Call `preview_mock` to validate every mock immediately after creation.

---

## 🔄 Standard Workflow

```
create_folder (if needed)
  └─> create_schema_mock (for dynamic) | create_mock (for static)
        └─> preview_mock (verify output)
              └─> update_mock (iterate if needed)
                    └─> preview_mock (confirm fix)
```

---

## 🛠️ Tool Selection

| Task | Recommended Tool | Why? |
| :--- | :--- | :--- |
| **Realistic / Dynamic Data** | `create_schema_mock` | JSON Schema + Faker + Interpolation. Auto-generates varied data on each request. |
| **Static / Constant Response** | `create_mock` | Quick for fixed responses (health checks, feature flags, enums). |
| **Iteration / Fix** | `update_mock` + `preview_mock` | Surgically update one field, re-verify. |
| **Inspect existing** | `get_mock` / `list_mocks` | Read before modifying to avoid overwriting fields. |

---

## 🎨 Premium JSON Schema Patterns

Use these patterns to generate data that feels like a real production API.

### 1. User Profile (The "Sleek" Template)
```json
{
  "type": "object",
  "required": ["id", "profile", "contact", "status"],
  "additionalProperties": false,
  "properties": {
    "id": { "type": "string", "faker": "string.uuid" },
    "profile": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "fullName": { "type": "string", "faker": "person.fullName" },
        "jobTitle": { "type": "string", "faker": "person.jobTitle" },
        "avatar": { "type": "string", "faker": "image.avatar" },
        "bio": { "type": "string", "faker": "lorem.sentence" }
      }
    },
    "contact": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "email": { "type": "string", "faker": "internet.email" },
        "phone": { "type": "string", "faker": "phone.number" }
      }
    },
    "status": { "type": "string", "enum": ["Active", "Idle", "Away"] }
  }
}
```

### 2. E-Commerce Product
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "faker": "string.uuid" },
    "name": { "type": "string", "faker": "commerce.productName" },
    "price": { "type": "string", "faker": "commerce.price" },
    "category": { "type": "string", "faker": "commerce.department" },
    "rating": { "type": "number", "faker": { "number.float": { "min": 3, "max": 5, "precision": 0.1 } } },
    "inStock": { "type": "boolean", "faker": "datatype.boolean" }
  }
}
```

### 3. Financial Transaction
```json
{
  "type": "object",
  "properties": {
    "txId": { "type": "string", "faker": "string.alphanumeric" },
    "amount": { "type": "string", "faker": { "finance.amount": { "min": 10, "max": 1000, "dec": 2, "symbol": "$" } } },
    "date": { "type": "string", "faker": "date.recent" },
    "account": { "type": "string", "faker": "finance.accountNumber" }
  }
}
```

---

## 🔗 Internal Interpolation

Reference generated fields within the same object to ensure data consistency. Use the `{$.path}` syntax.

```json
{
  "firstName": { "type": "string", "faker": "person.firstName" },
  "lastName": { "type": "string", "faker": "person.lastName" },
  "email": { "const": "{$.firstName}.{$.lastName}@example.com" },
  "welcomeMessage": { "const": "Hello, {$.firstName}! Welcome back." }
}
```

---

## 💡 Best Practices

- **Set Limits**: Always use `minItems` and `maxItems` for arrays. Note: Global limit is `5`.
- **Specific Types**: Use `integer`, `number`, `boolean`, `string`, `object`, and `array` correctly.
- **Faker Arguments**: Use **object notation** for named parameters: `{"faker": {"finance.amount": {"min": 10, "max": 100}}}`.
- **Array Content**: Always provide an `items` subschema for arrays, fixed or dynamic.
- **Strictness**: Use `additionalProperties: false` (objects) and `additionalItems: false` (arrays) to ensure the output matches the schema *exactly*.
- **Always validate**: Call `preview_mock` immediately after `create_schema_mock` to check the generated data quality. Iterate with `update_mock` if needed.
- **Prefer `folderSlug`**: Use `folderSlug` parameter instead of `folderId` when creating mocks—it's human-readable and avoids needing an extra lookup.
- **Wildcard paths**: For path params like `/users/:id`, set `matchType: "wildcard"` and add `variants` for specific ID cases (e.g., `test-admin`).
- **Query param matching**: Use `queryParams` to lock a mock to a specific query string signature.

---

## 🛠️ JSON Schema Keywords reference

Use these core keywords to control data generation:

| Category | Keywords |
| :--- | :--- |
| **Logic** | `allOf`, `anyOf`, `oneOf` |
| **Strings** | `pattern` (Regex), `format` (uuid, email, date-time), `minLength`, `maxLength` |
| **Numbers** | `minimum`, `maximum`, `multipleOf` |
| **Arrays** | `items` (required), `minItems`, `maxItems`, `uniqueItems` |
| **Objects** | `properties`, `required`, `patternProperties`, `minProperties` |

---

## ⏭️ When to Switch Skills

If you need:
- Multi-step login flow
- Dynamic search filtering (interactive)
- Persistent CRUD (storing data in `db`)
- Delayed responses or error toggling

**👉 Switch to `mockzilla-workflow-architect`**

If you need:
- Importing a full OpenAPI/Swagger spec
- Bootstrapping an entire project from scratch
- Mass-creating mocks across many endpoints

**👉 Switch to `mockzilla-spec-translator`**
