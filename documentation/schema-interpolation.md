# String Interpolation & Templating Engine

Mockzilla uses a **Smart Hybrid Engine** that combines powerful field referencing with standard **Handlebars** templating. This allows you to maintain JSON type integrity while also building complex logic like loops and conditionals.

## The Smart Hybrid Approach

Mockzilla automatically chooses the best engine for your template:

1.  **Type-Preserving Engine**: If your response is a valid JSON object or array, Mockzilla traverses it and preserves original types. Numbers stay `number`, and Booleans stay `boolean`.
2.  **Handlebars Engine**: If your response contains logic blocks (like `{{#each}}`) that break standard JSON parsing, Mockzilla evaluates it as a raw string using Handlebars.

---

## 🚀 Key Features

### 1. Type Preservation
Unlike standard template engines that return everything as strings, Mockzilla preserves the original JSON type if the template is the **entire value** of the field.

- `{"count": "{{state.count}}"}` → Returns a literal **Number** (e.g., `10`).
- `{"items": "{{db.users}}"}` → Returns a literal **JSON Array**.
- `{"msg": "Count is {{state.count}}"}` → Returns a **String** because of the surrounding text.

### 2. Logic & Loops (Handlebars)
Use standard Handlebars syntax for loops and conditional branching. This is perfect for generating lists from your Mini-DB.

**Example: Dynamic List**
```handlebars
{
  "total": "{{db.products.length}}",
  "items": [
    {{#each db.products}}
    {
      "id": {{this.id}},
      "name": "{{this.name}}"
    }{{#unless @last}},{{/unless}}
    {{/each}}
  ]
}
```

---

## 🛠️ Custom Helpers

Mockzilla provides specialized helpers to make your templates more powerful.

| Helper | Description | Example |
|--------|-------------|---------|
| `math` | Perform arithmetic with operators `+ - * / %`. | `{{math state.count "*" 2}}` |
| `faker` | Generate fake data using any Faker.js path. | `{{faker "internet.email"}}` |
| `eq` / `neq` / `gt` / `lt` | Compare values. | `{{#if (eq state.role "admin")}}` |
| `and` / `or` / `not` | Logic gates for complex conditionals. | `{{#if (and $.active (not $.locked))}}` |
| `default` | Provide a fallback value if a variable is missing or empty. | `{{default $.name "Guest"}}` |
| `json` | Stringify an object to JSON. | `{{json state.user}}` |
| `now` | Get current ISO date string. | `{{now}}` |
| `dateFormat` | Format a date using date-fns patterns. | `{{dateFormat now "yyyy-MM-dd"}}` |
| `dateAdd` / `dateSub` | Add or subtract time from a date. | `{{dateAdd "now" 5 "days"}}` |
| `filter` / `sort` | Manipulate arrays from the Mini-DB. | `{{#each (sort db.users "id")}}` |
| `slice` / `join` | Slice or join array elements. | `{{join $.query.items ", "}}` |
| `slugify` / `truncate` | Format strings. | `{{slugify $.body.title}}` |
| `currency` | Format numbers as currency. | `{{currency 1234.56 "USD"}}` |
| `toFixed` | Format numbers to fixed decimals. | `{{toFixed 12.345 2}}` |

---

## 🚀 Advanced Interpolation (Type-Preserving)

### Basic Arithmetic
Mockzilla supports simple addition and subtraction directly inside standard JSON templates.

| Syntax | Description |
|--------|-------------|
| `{{state.count + 1}}` | Increments a state variable |
| `{{10 - db.items.length}}` | Calculates remaining items in a table |

### Relational DB Lookups
Mockzilla supports advanced predicates for array lookups using the `[key=value]` syntax. This is primarily used for finding records in the **Mini-DB**.

| Syntax | Description |
|--------|-------------|
| `{{db.users[id=1]}}` | Find a user in the mini-DB where `id` is `1`. |
| `{{db.items[id=input.params.id]}}` | **Dynamic**: Match a table row against a URL path parameter. |

---

## Referencing Request Data

You can reference incoming request data directly using the `input.` or `$.` prefixes. Both syntaxes are equivalent.

| Syntax | Alias | Description |
|--------|-------|-------------|
| `{{input.query.id}}` | `{{$.query.id}}` | Injects the `?id=...` query parameter |
| `{{input.params.0}}` | `{{$.params.[0]}}` | Injects a URL path segment (wildcards) |
| `{{input.headers.user-agent}}` | `{{$.headers.[user-agent]}}` | Injects a request header |
| `{{input.body.name}}` | `{{$.body.name}}` | Injects a value from the request JSON body |

> **Tip**: When using Handlebars logic with `$.` syntax and numeric keys (like params) or headers with hyphens, use square brackets: `{{$.params.[0]}}` or `{{$.headers.[x-api-key]}}`.

---

## Smart Context

The interpolation context includes:
- `input`: Standard request data (query, params, headers, body)
- `state`: Current workflow state
- `db`: Mini-database tables
- `$`: Alias for `input`
- `query`, `params`, `headers`: Shortcuts for `input.query`, etc.
- `faker`: The full Faker.js instance for complex data generation (e.g. `{{faker.string.uuid}}`)
