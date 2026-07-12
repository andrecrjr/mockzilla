# 🚀 JSON Schema & Faker Mock References

> [!NOTE]
> This guide is a "Long-Term Memory" resource for Mockzilla Agents. When building mocks, refer to these patterns to ensure consistency and high fidelity.

---

## 🛠️ Core JSON Schema Reference

Use these keywords to control structure, validation, and data generation.

| Category | Keywords |
| :--- | :--- |
| **Logic** | `allOf`, `anyOf`, `oneOf`, `not` |
| **Strings** | `pattern` (Regex), `format` (uuid, email, date-time, uri), `minLength`, `maxLength`, `enum` |
| **Numbers** | `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf` |
| **Arrays** | `items` (required), `minItems`, `maxItems`, `uniqueItems`, `additionalItems` |
| **Objects** | `properties`, `required`, `patternProperties`, `minProperties`, `maxProperties`, `additionalProperties` |
| **Metadata** | `default`, `examples`, `const`, `description` |

### 💡 Key Caveats
- **Mandatory `items`**: For `type: "array"`, an `items` subschema MUST be provided if you use validation keywords like `minItems`.
- **Global `maxItems`**: Mockzilla defaults to 1000 generated items. The `MOCKZILLA_MAX_ITEMS` environment variable can lower or raise that ceiling.
- **Always provide `type`**: Ensure every property has a defined `type` (string, integer, etc.) to ensure reliable generation.

---

## 🎭 Faker.js Reference (v10)

### Passing Arguments
Modern Faker uses **object notation** for named parameters. This is the preferred syntax in Mockzilla.

```json
{
  "type": "string",
  "faker": { 
    "finance.amount": { "min": 100, "max": 500, "dec": 2, "symbol": "$" } 
  }
}
```

> [!NOTE]
> Positional arguments can still use array syntax: `"faker": { "finance.amount": [100, 500, 2, "$"] }`.

### Methods Cheat Sheet

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

## 🎨 High-Fidelity Patterns

### 📊 Frontend UI: Dashboard & Feeds
Templates for complex UI states and interactive components.

#### Dashboard Analytics
```json
{
  "type": "object",
  "properties": {
    "welcomeMessage": { "const": "Welcome back, {$.user.firstName}!" },
    "user": {
      "type": "object",
      "properties": {
        "firstName": { "type": "string", "faker": "person.firstName" },
        "avatar": { "type": "string", "faker": "image.avatar" },
        "notifications": { "type": "integer", "faker": { "number.int": { "min": 0, "max": 10 } } }
      }
    },
    "stats": {
      "type": "array",
      "minItems": 4, "maxItems": 4,
      "items": {
        "type": "object",
        "properties": {
          "label": { "enum": ["Total Revenue", "Active Users", "Bounce Rate", "New Signups"] },
          "value": { "type": "string", "faker": { "number.int": { "min": 100, "max": 99999 } } },
          "trend": { "type": "string", "enum": ["up", "down", "neutral"] },
          "change": { "type": "string", "faker": { "number.float": { "min": 0.1, "max": 15.0, "precision": 0.1 } } }
        },
        "required": ["label", "value", "trend", "change"]
      }
    }
  },
  "required": ["welcomeMessage", "user", "stats"]
}
```

#### Social Feed (Polymorphic)
```json
{
  "type": "array",
  "minItems": 5, "maxItems": 10,
  "items": {
    "oneOf": [
      {
        "type": "object",
        "description": "User Post",
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
        "description": "Advertisement",
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

---

### 📄 Backend API: Pagination & Relationships
Standardized patterns for robust API responses.

#### Paginated List
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

#### RFC 7807 Error details
```json
{
  "type": "object",
  "properties": {
    "type": { "const": "about:blank" },
    "title": { "const": "Validation Error" },
    "status": { "const": 400 },
    "detail": { "const": "Your request parameters failed validation." },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": { "enum": ["email", "password", "username"] },
          "message": { "type": "string", "faker": "lorem.sentence" }
        }
      }
    }
  }
}
```

---

### 🏦 Industry Vertical Templates
Ready-to-use schemas for specific domains.

#### PIX Transaction (Finance)
```json
{
  "type": "object",
  "required": ["endToEndId", "amount", "timestamp", "status"],
  "properties": {
    "endToEndId": { "type": "string", "pattern": "^E[0-9]{8}[0-9]{4}[0-9]{4}[0-9]{4}[a-zA-Z0-9]{11}$" },
    "amount": { "type": "string", "faker": { "finance.amount": { "min": 1, "max": 10000, "dec": 2 } } },
    "timestamp": { "type": "string", "faker": "date.recent" },
    "status": { "enum": ["CONCLUIDO", "REPROVADO", "EM_PROCESSAMENTO"] }
  }
}
```

#### Patient Record (Healthcare)
```json
{
  "type": "object",
  "properties": {
    "patientId": { "type": "string", "faker": "string.uuid" },
    "fullName": { "type": "string", "faker": "person.fullName" },
    "birthDate": { "type": "string", "faker": "date.birthdate" },
    "bloodType": { "enum": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] }
  }
}
```

---

## 🤖 Tips for AI Agents & MCP Users

1.  **Context Injection**: When generating a new mock, search this document for the category (Frontend/Backend/Industry) to find the best baseline.
2.  **Constraint Enforcement**: Check `minItems` and `maxItems`; if a requested list exceeds the configured ceiling, explain the limit or adjust `MOCKZILLA_MAX_ITEMS` in the deployment environment.
3.  **Naming Consistency**: If the user provides a design or image, map the field names exactly as they appear in the UI, then use this guide to find the matching Faker method.
4.  **Schema Reusability**: Use JSON Schema `definitions` and `$ref` for shared entities (like `User` or `Address`) within the same mock to keep the code DRY.
