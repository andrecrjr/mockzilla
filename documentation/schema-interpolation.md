# JSON Schema String Interpolation & Field Referencing

Mockzilla's JSON Schema Faker supports **string interpolation** and **field referencing**, allowing you to reuse generated values across multiple fields and create dynamic template strings.

> [!TIP]
> This guide focuses on Mockzilla's custom interpolation extensions. For standard JSON Schema data generation features, see the [JSON Schema Faker guide](json-schema-faker.md).


## Quick Start

### Simple Field Reference

Reference any field in your schema using `{$.fieldName}` syntax:

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "message": {
      "const": "Your ticket ID is {$.id}"
    }
  }
}
```

**Generated Output:**
```json
{
  "id": "967ddc46-a7bd-4f46-bc4c-a105593e321d",
  "message": "Your ticket ID is 967ddc46-a7bd-4f46-bc4c-a105593e321d"
}
```

---

## Template Syntax

You can use two syntaxes for referencing fields:

1. **Single braces**: `{$.fieldName}`
2. **Double braces**: `{{$.fieldName}}`

Both work identically - use whichever you prefer!

### JSONPath-Like References

Support for:
- **Simple fields**: `{$.id}`
- **Nested objects**: `{$.user.name}`
- **Array elements**: `{$.items[0].id}`
- **Nested arrays**: `{$.users[0].addresses[0].city}`

---

## Examples

### Example 1: Ticket System with Consistent IDs

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "trackingNumber": {
      "type": "string",
      "format": "uuid"
    },
    "message": {
      "const": "Your ticket {$.id} has been assigned tracking number {$.trackingNumber}"
    },
    "confirmationId": {
      "const": "{$.id}"
    }
  }
}
```

**Output:**
```json
{
  "id": "a7c3f821-9b4d-4e8a-bc6f-1234567890ab",
  "trackingNumber": "f3d9e812-4c5b-4a7d-9e2f-abcdef123456",
  "message": "Your ticket a7c3f821-9b4d-4e8a-bc6f-1234567890ab has been assigned tracking number f3d9e812-4c5b-4a7d-9e2f-abcdef123456",
  "confirmationId": "a7c3f821-9b4d-4e8a-bc6f-1234567890ab"
}
```

### Example 2: Nested Object References

```json
{
  "type": "object",
  "properties": {
    "user": {
      "type": "object",
      "properties": {
        "firstName": {
          "type": "string",
          "faker": "person.firstName"
        },
        "lastName": {
          "type": "string",
          "faker": "person.lastName"
        }
      }
    },
    "greeting": {
      "const": "Hello, {$.user.firstName} {$.user.lastName}!"
    },
    "emailSubject": {
      "const": "Welcome to our platform, {$.user.firstName}!"
    }
  }
}
```

**Output:**
```json
{
  "user": {
    "firstName": "John",
    "lastName": "Doe"
  },
  "greeting": "Hello, John Doe!",
  "emailSubject": "Welcome to our platform, John!"
}
```

### Example 3: Array Element References

```json
{
  "type": "object",
  "properties": {
    "products": {
      "type": "array",
      "minItems": 3,
      "maxItems": 3,
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "name": {
            "type": "string",
            "faker": "commerce.productName"
          }
        }
      }
    },
    "featuredProduct": {
      "const": "{$.products[0].name}"
    },
    "summary": {
      "const": "Featured: {$.products[0].name}, Also available: {$.products[1].name}, {$.products[2].name}"
    }
  }
}
```

**Output:**
```json
{
  "products": [
    { "id": "12345", "name": "Ergonomic Keyboard" },
    { "id": "67890", "name": "Wireless Mouse" },
    { "id": "11121", "name": "USB-C Cable" }
  ],
  "featuredProduct": "Ergonomic Keyboard",
  "summary": "Featured: Ergonomic Keyboard, Also available: Wireless Mouse, USB-C Cable"
}
```

### Example 4: Multiple References in One String

```json
{
  "type": "object",
  "properties": {
    "orderId": {
      "type": "string",
      "format": "uuid"
    },
    "customerId": {
      "type": "string",
      "format": "uuid"
    },
    "statusMessage": {
      "const": "Order {$.orderId} for customer {$.customerId} is being processed"
    }
  }
}
```

---

## Common Use Cases

### 1. **Consistent IDs Across Fields**
Use the same randomly generated ID in multiple places:
```json
{
  "orderId": "{$.transactionId}",
  "receiptId": "{$.transactionId}",
  "trackingId": "{$.transactionId}"
}
```

### 2. **Dynamic Status Messages**
Create messages that reference other generated data:
```json
{
  "status": "shipped",
  "message": "Your order {$.orderId} has been {$.status}"
}
```

### 3. **User Greetings**
Personalize messages with generated names:
```json
{
  "user": { "name": "Alice" },
  "greeting": "Hello, {$.user.name}!"
}
```

### 4. **Referencing Array Data**
Pull specific items from arrays:
```json
{
  "items": [{"name": "Apple"}, {"name": "Banana"}],
  "featured": "Try our {$.items[0].name}!"
}
```

---

## Important Notes

> [!IMPORTANT]
> - Template references are resolved **after** the entire JSON is generated
> - References are case-sensitive: `{$.Id}` ≠ `{$.id}`
> - If a reference cannot be resolved, the template string is left unchanged

> [!WARNING]
> - **Circular references are prevented**: If you try to create circular dependencies, the generator will detect and skip them
> - **Array indices must exist**: Referencing `{$.items[10]}` when the array only has 3 items will fail

> [!TIP]
> - Use `{$.field}` for simple, readable templates
> - Prefer JSONPath-style references over custom formats; they work consistently across nested objects and arrays.

---

## Troubleshooting

### Reference Not Found

If you see `[ref:key-not-found]` in your output:
- Check the field name spelling
- Ensure the referenced field exists in the schema
- Verify the field is generated before it's referenced

### Template Not Replaced

If `{$.field}` appears literally in your output:
- Ensure the path is correct (e.g., `{$.user.name}` not `{$.username}`)
- Check that the referenced field was successfully generated
- Look for typos in the JSONPath

### Invalid Template

If you see `[invalid-template]`:
- Make sure you're using the correct syntax: `{$.field}` or `{{$.field}}`
- The `$` prefix is required for JSONPath references

---

## Need Help?

Check the [main README](../README.md) for more information about Mockzilla's JSON Schema support.
