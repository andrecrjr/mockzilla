# JSON Schema Faker in Mockzilla

Mockzilla uses [json-schema-faker](https://github.com/json-schema-faker/json-schema-faker) (JSF) to generate dynamic, realistic data from your JSON Schemas. It provides a bridge between standard JSON Schema validation and data generation libraries like Faker.js.

## Specifications Supported

Mockzilla currently uses **json-schema-faker v0.5.9**, which primarily supports **JSON Schema Draft-04**.

> [!NOTE]
> While JSF focuses on Draft-04, many common keywords from later drafts (like `oneOf`, `anyOf`, `allOf`) are supported for generation.

## Supported Keywords

JSF supports a wide range of standard JSON Schema keywords to guide data generation:

- **Logic**: `allOf`, `anyOf`, `oneOf`, `not` (partially)
- **Objects**: `properties`, `required`, `additionalProperties`, `minProperties`, `maxProperties`, `patternProperties`
- **Arrays**: `items` (mandatory for validation), `minItems`, `maxItems`, `uniqueItems`, `additionalItems`
- **Strings**: `minLength`, `maxLength`, `pattern` (RegExp), `format`, `enum`
- **Numbers**: `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`
- **Metadata**: `default`, `examples`, `const`, `description`

---

## Faker.js Integration (v10)

Mockzilla integrates [Faker.js](https://fakerjs.dev/) v10 directly into the schema generation process. You can use the `faker` keyword on any schema property.

### Passing Arguments to Faker

Modern Faker uses **object notation** for named parameters. This is the preferred syntax in Mockzilla.

```json
{
  "faker": {
    "finance.amount": { "min": 100, "max": 1000, "dec": 2, "symbol": "$" }
  }
}
```

> [!IMPORTANT]
> For named parameters (like `min`/`max` in modern Faker), always use the object syntax. Positional arguments can still use array syntax if necessary.

## Common Faker Fields & Usage

| Category | Method Examples | Use Case |
| :--- | :--- | :--- |
| **👤 Person** | `fullName`, `firstName`, `lastName`, `jobTitle`, `bio` | User profiles, authors, employees. |
| **🌐 Internet** | `email`, `userName`, `password`, `url`, `ipv4` | Digital identities, networking. |
| **💰 Finance** | `amount`, `accountNumber`, `currencyCode`, `iban` | Transactions, banking, pricing. |
| **📍 Location**| `streetAddress`, `city`, `zipCode`, `country`, `latitude` | Map data, shipping addresses. |
| **📅 Date** | `recent`, `future`, `past`, `birthdate`, `weekday` | Timestamps, schedules. |
| **📦 Lorem** | `word`, `sentence`, `paragraph`, `slug` | Placeholder text, blog content. |
| **🔢 System** | `string.uuid`, `string.alphanumeric`, `number.int` | IDs, tokens, counts. |
| **🖼️ Image** | `url`, `avatar`, `dataUri` | Mocking visual assets. |

---

## High-Fidelity Patterns

Use these patterns to generate data that feels like a real production API.

### 📊 Frontend UI: Dashboard & Feeds

#### Social Feed (Polymorphic)
```json
{
  "type": "array",
  "minItems": 5, "maxItems": 10,
  "items": {
    "oneOf": [
      {
        "type": "object",
        "properties": {
          "type": { "const": "post" },
          "id": { "type": "string", "faker": "string.uuid" },
          "author": { "type": "string", "faker": "person.fullName" },
          "content": { "type": "string", "faker": "lorem.paragraph" }
        },
        "required": ["type", "id", "author", "content"]
      },
      {
        "type": "object",
        "properties": {
          "type": { "const": "ad" },
          "headline": { "type": "string", "faker": "company.catchPhrase" },
          "image": { "type": "string", "faker": "image.url" }
        },
        "required": ["type", "headline", "image"]
      }
    ]
  }
}
```

### 📄 Backend API: Pagination & Errors

#### Paginated List Response
```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "array",
      "minItems": 5, "maxItems": 5,
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "faker": "string.uuid" },
          "title": { "type": "string", "faker": "lorem.sentence" }
        }
      }
    },
    "meta": {
      "type": "object",
      "properties": {
        "page": { "const": 1 },
        "total": { "type": "integer", "faker": { "number.int": { "min": 50, "max": 100 } } }
      }
    }
  }
}
```

---

## Mockzilla Default Options

Mockzilla configures JSF with several default options to ensure high-quality data generation:

| Option | Value | Description |
| :--- | :--- | :--- |
| `alwaysFakeOptionals` | `true` | Always generates optional properties (those not in `required`). |
| `useDefaultValue` | `true` | Uses the `default` keyword if present in the schema. |
| `useExamplesValue` | `true` | Uses the `examples` keyword if present (picks a random example). |
| `minItems` | `1` | Forces at least 1 item in arrays if not specified. |
| `maxItems` | `1000` | Limits arrays to 1000 items if not specified. |

---

## Request Context & Interpolation

Mockzilla provides the request context to the schema generator, allowing you to reference request data in your schema templates.

### Referencing Query Parameters

You can access query parameters using the `{$.query.paramName}` syntax.

**Example: Paginated Response echoing query params**
```json
{
  "type": "object",
  "properties": {
    "items": { "type": "array", "minItems": 10, "maxItems": 10, "items": { "type": "object", "properties": { "id": { "type": "string", "faker": "string.uuid" } } } },
    "meta": {
      "type": "object",
      "properties": {
        "page": { "const": "{$.query.page}" },
        "limit": { "const": "{$.query.limit}" }
      }
    }
  }
}
```

When calling `?page=2&limit=50`, the response will echo these values back in the `meta` object.

---

## Troubleshooting & Tips

- **Mandatory `items`**: For `type: "array"`, an `items` subschema MUST be provided if you use validation keywords like `minItems`. Without it, generation will fail.
- **Empty Properties**: Ensure every property has a defined `type`. If you use constraints like `minLength` without `type: "string"`, compatibility with other tools may vary.
- **Circular References**: JSF and Mockzilla's interpolation engine both have protections against circular references.
- **Array Size Capped**: If your array never grows beyond 5 items despite settings, it's due to the global `maxItems: 5` limit in the generator.
- **Consistency**: Use [Schema Interpolation](schema-interpolation.md) (`{$.path}`) to match values across your object.
