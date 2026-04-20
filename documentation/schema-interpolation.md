# String Interpolation & Field Referencing

Mockzilla supports powerful **string interpolation** and **field referencing** across all response types (Static JSON, Dynamic JSON Schema, and Workflows). This allows you to reuse generated values, perform arithmetic, and create dynamic templates that react to request data.

> [!TIP]
> This guide focuses on Mockzilla's custom interpolation extensions. For standard JSON Schema data generation, see the [JSON Schema Faker guide](json-schema-faker.md).

## Quick Start: Simple Field Reference

Reference any field in your schema or request using `{$.fieldName}` or `{{fieldName}}` syntax.

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "message": { "const": "Your ticket ID is {$.id}" }
  }
}
```

---

## 🚀 Advanced Interpolation Features

### 1. Basic Arithmetic
Mockzilla supports addition and subtraction directly inside templates. This is perfect for simulating counters or capacity.

| Syntax | Description |
|--------|-------------|
| `{{state.count + 1}}` | Increments a state variable |
| `{$.query.limit - 1}` | Decrements a query parameter |
| `{{10 - db.items.length}}` | Calculates remaining items in a table |

**Example (Static Response):**
- **Mock Path**: `/users`
- **Response Body**:
  ```json
  {
    "status": "success",
    "meta": {
      "limit": "{$.query.limit}",
      "next_page": "{{$.query.page + 1}}"
    }
  }
  ```

### 2. Type-Preserving References
Most mock engines treat everything as strings. Mockzilla preserves the original JSON type (Array, Object, Number) if the template is the **entire value** of the field.

- `{{db.users}}` → Returns a literal **JSON Array**.
- `{{state.config}}` → Returns a literal **JSON Object**.
- `The count is {{state.count}}` → Returns a **String**.

---

## Referencing Request Data

You can reference incoming request data directly in your templates using the `$.` or `input.` prefixes.

### Query Parameters
Access query parameters using the `$.query` prefix:

| Syntax | Description |
|--------|-------------|
| `{$.query.id}` | Injects the `?id=...` query parameter |
| `{{query.limit}}` | Injects the `?limit=...` query parameter |

**Example Result for `?role=admin&limit=10`**:
- Template: `Filtered results for {$.query.role}`
- Output: `Filtered results for admin`

---

## Template Syntax Reference

| Feature | Syntax | Example |
|---------|--------|---------|
| **Simple Reference** | `{$.field}` | `{$.id}` |
| **Double Braces** | `{{field}}` | `{{user.name}}` |
| **Arithmetic** | `{{var + 1}}` | `{{state.usage + 1}}` |
| **Nested Path** | `{$.parent.child}` | `{$.user.address.city}` |
| **Array Index** | `{$.array[0]}` | `{$.items[0].id}` |
| **Request Data** | `{$.query.key}` | `{$.query.search_term}` |

---

## Troubleshooting & Best Practices

- **Order of Resolution**: Request context (`$.query`) is merged with generated data. In Dynamic Schemas, generated fields take precedence.
- **Fail-safe**: If a path is invalid or missing, the template string (e.g., `{$.missing}`) is returned literally.
- **Spaces**: Whitespace inside braces is ignored: `{{ state.count + 1 }}` is valid.
