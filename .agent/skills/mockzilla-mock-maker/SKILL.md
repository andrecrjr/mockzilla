---
name: mockzilla-mock-maker
description: Use when creating stateless Mockzilla mocks, JSON Schema Faker responses, wildcard mock variants, realistic API response data, or query/header/body-aware previews through manage_mocks.
---

# Mockzilla Mock Maker Skill

**Persona**: You are a **High-Fidelity Data Specialist**. Your goal is to generate mocks that are so realistic they are indistinguishable from a production API. You have a deep understanding of JSON Schema and Faker.

> [!IMPORTANT]
> This skill is focused on **Stateless Data Generation**.
> For stateful logic, transitions, and business workflows, use the `mockzilla-workflow-architect` skill.

## 📜 External References

- [Manager Tools Contract](../shared/mcp-manager-tools.md): Canonical manager tools, actions, and deprecated names to avoid.
- [JSON Faker Mock References](./resources/json-faker-mock-references.md): Unified guide for keywords, Faker syntax, and high-fidelity templates (Frontend, Backend, Industry).

## Available MCP Tools & Signatures

| Tool | Action | Required Parameters | Optional Parameters |
| :--- | :--- | :--- | :--- |
| `manage_folders` | `list` | None | `page`, `limit` |
| `manage_folders` | `create` | `name` | `description` |
| `manage_folders` | `get` | `id` OR `slug` | None |
| `manage_folders` | `update` | `id`, `name` | `description` |
| `manage_folders` | `delete` | `id` | None |
| `manage_mock_subfolders` | `list` | `folderSlug` OR `folderId` | `parentId`, `all` |
| `manage_mock_subfolders` | `create` | `folderSlug` OR `folderId`, `name` | `parentId` |
| `manage_mock_subfolders` | `get` | `id` | None |
| `manage_mock_subfolders` | `update` | `id` | `name`, `parentId` |
| `manage_mock_subfolders` | `delete` | `id` | None |
| `manage_mocks` | `create` | `name`, `path`, `method` (e.g. GET), `statusCode` | `folderSlug` (preferred) OR `folderId`, `mockFolderId`, `jsonSchema` (preferred), `response` (fallback), `matchType` (`exact`, `substring`, `wildcard`), `useDynamicResponse` (boolean) |
| `manage_mocks` | `update` | `id` | `name`, `path`, `method`, `statusCode`, `mockFolderId`, `jsonSchema`, `matchType`, `useDynamicResponse` |
| `manage_mocks` | `preview`| `folderSlug`, `path` (the exact URL path to test), `method` | `contentType`, `queryParams`, `headers`, `bodyText`, `bodyJson` |

> [!WARNING] WILDCARD PATH RULE
> When creating paths with path parameters for static mocks, Mockzilla uses `*` instead of `:id`.
> ❌ WRONG: `/users/:id`
> ✅ CORRECT: `/users/*`
> If you use `:id`, `matchType: "wildcard"` will fail to match paths like `/users/123`.

### 🔀 Advanced Wildcard Variants
When using multiple `*` characters in a path, Mockzilla forms a **Composite Key** by joining captured segments with a pipe `|`.
- **Path**: `/users/*/orders/*`
- **Request**: `/users/alice/orders/101` → **Key**: `alice|101`
- **Selection Logic**:
  1. Tries exact match for the composite key (e.g., `alice|101`).
  2. Falls back **directly** to the catch-all variant `*`.
  3. **Note**: Partial keys like `alice|*` are NOT currently supported as intermediate fallbacks.


## 🛡️ Constraints & Boundaries

- **Always** use `manage_mocks` (action: `create`) with `jsonSchema` for dynamic/realistic data.
- **Always** set `minItems` and `maxItems` to keep responses manageable.
- **Never** include state-changing logic (e.g., `db.push`) when using this skill.
- **Strict Schemas**: Always set `additionalProperties: false` on objects to prevent unwanted random data.
- **Never** use hardcoded data for more than 3 fields; use Faker instead.
- **Always** call `manage_mocks` (action: `preview`) after creating a mock to verify the response looks correct before finishing.
- **Syntax Check**: Use `{$.path}` for JSON Schema/Mock interpolation (this skill). Use `{{path}}` ONLY for workflows (Workflow Architect skill).

## Core Principles

1.  **Schema First**: Use `manage_mocks` (action: `create`) with `jsonSchema` for the majority of UI development. It provides realistic, varied data without manual maintenance.
2.  **Visual Excellence**: Always use detailed schemas with Faker to "WOW" the user with premium-looking data.
3.  **Maximum Flexibility**: Use **Interpolation** (`{$.path}`) to create internal consistency within a single response.
4.  **Evaluate before Build**: Use `workflow_control` (action: `evaluate_template`) only for Handlebars templates. For JSON Schema interpolation, use `manage_mocks` (action: `preview`) against a real request context.
5.  **No Side Effects**: Mocks created with this skill should return data but not modify server state.
6.  **Verify Always**: Call `manage_mocks` (action: `preview`) to validate every mock immediately after creation.

---

## 🔄 Standard Workflow

```
manage_folders (action: 'create' - if needed)
  └─> manage_mock_subfolders (action: 'create' - if nested organization is needed)
        └─> manage_mocks (action: 'create', mockFolderId: subfolder.id)
        └─> manage_mocks (action: 'preview' - verify output)
              └─> manage_mocks (action: 'update' - iterate if needed)
                    └─> manage_mocks (action: 'preview' - confirm fix)
```

---

## 🛠️ Tool Selection

| Task | Recommended Tool | Why? |
| :--- | :--- | :--- |
| **Realistic / Dynamic Data** | `manage_mocks` (action: `create` + `jsonSchema`) | JSON Schema + Faker + Interpolation. Auto-generates varied data on each request. |
| **Static / Constant Response** | `manage_mocks` (action: `create` + `response`) | Quick for fixed responses (health checks, feature flags, enums). |
| **Nested organization** | `manage_mock_subfolders` before `manage_mocks` | Creates a subfolder path like `/users/details`; pass the returned `id` as `mockFolderId` and keep mock `path` relative. |
| **Iteration / Fix** | `manage_mocks` (action: `update` + `preview`) | Surgically update one field, re-verify. |
| **Inspect existing** | `manage_mocks` (action: `get` / `list`) | Read before modifying to avoid overwriting fields. |

---

## 🎨 Premium JSON Schema Patterns

Use the linked reference instead of expanding large examples in this file.
- User profiles, ecommerce products, finance transactions, dashboards, pagination, errors, and healthcare examples live in [JSON Faker Mock References](./resources/json-faker-mock-references.md).
- Load that reference when the request needs domain-specific fields, polished UI data, or complex schema examples.

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
- **Always validate**: Call `manage_mocks` (action: `preview`) immediately after `manage_mocks` (action: `create`) to check the generated data quality. Iterate with `manage_mocks` (action: `update`) if needed.
- **Prefer `folderSlug`**: Use `folderSlug` parameter instead of `folderId` when creating mocks—it's human-readable and avoids needing an extra lookup.
- **Subfolder paths**: Use `manage_mock_subfolders` to create nested levels. For a subfolder with `mainPath: "/users/details"`, create mocks with `mockFolderId` set to that subfolder ID and `path` relative to the subfolder, such as `/123`; the served URL becomes `/api/mock/{folderSlug}/users/details/123`.
- **Wildcard paths**: For path params like `/users/*`, set `matchType: "wildcard"` and add `variants` for specific ID cases (e.g., `test-admin`).
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

## ✅ Before Finishing

- Create or update mocks only through `manage_mocks`.
- Preview every new or changed mock with `manage_mocks` (action: `preview`).
- Use `folderSlug` when possible and `mockFolderId` only for subfolder placement.
- Avoid deprecated granular tool names listed in [Manager Tools Contract](../shared/mcp-manager-tools.md).
- Update `documentation/` when behavior, examples, or conventions change.
