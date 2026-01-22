# Test Schemas for String Interpolation

This directory contains test schemas to verify the string interpolation and field referencing features work correctly.

## High-Fidelity Production Patterns

For complex stateful mocks (Dashboards, Feeds, Paginated APIs), refer to the [High-Fidelity Patterns Guide](/documentation/json-schema-faker.md#High-Fidelity-Patterns).

## Test Case 1: Simple Field Reference

**File:** `test-simple-reference.json`

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

**Expected:** The `message` field should contain the same UUID as the `id` field.

---

## Test Case 2: Nested Object Reference

**File:** `test-nested-reference.json`

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
    }
  }
}
```

**Expected:** The `greeting` should contain the generated first and last names.

---

## Test Case 3: Array Element Reference

**File:** `test-array-reference.json`

```json
{
  "type": "object",
  "properties": {
    "items": {
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
      "const": "{$.items[0].name}"
    }
  }
}
```

**Expected:** The `featuredProduct` should match the name of the first item in the array.

---

## Test Case 4: Multiple References

**File:** `test-multiple-references.json`

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
    "trackingNumber": {
      "type": "string",
      "format": "uuid"
    },
    "statusMessage": {
      "const": "Order {$.orderId} for customer {$.customerId} has tracking {$.trackingNumber}"
    }
  }
}
```

**Expected:** The `statusMessage` should contain all three generated UUIDs.

---

## Test Case 5: Ticket System (Real-World Example)

```json
{
  "type": "array",
  "minItems": 2,
  "maxItems": 2,
  "items": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "uuid"
      },
      "message": {
        "const": "Your ticket was opened as {$.id}"
      },
      "status_slug": {
        "enum": ["online", "impactado", "inoperante"]
      },
      "equipment": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "faker": "commerce.productName"
          },
          "serialNumber": {
            "type": "string",
            "faker": "string.alphanumeric"
          }
        }
      },
      "confirmationCode": {
        "const": "CONF-{$.equipment.serialNumber}"
      },
      "summary": {
        "const": "Ticket {$.id} for equipment {$.equipment.name}"
      }
    }
  }
}
```

**Expected:** Array of tickets where each ticket's message and summary reference its own IDs and equipment details.

---

## How to Test

1. Copy a test schema from above
2. Create a new mock in Mockzilla with "Dynamic Response" enabled
3. Paste the schema into the JSON Schema field
4. Save and call the mock endpoint multiple times
5. Verify that:
   - Referenced values match their source fields
   - Each request generates new random values
   - Template strings are properly replaced

## Automated Testing

You can also test programmatically:

```typescript
import { generateFromSchema } from '@/lib/schema-generator'

const schema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    message: { const: "Your ID is {$.id}" }
  }
}

const result = JSON.parse(generateFromSchema(schema))
console.log(result.message.includes(result.id)) // Should be true
```
