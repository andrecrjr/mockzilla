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
- **Arrays**: `items`, `minItems`, `maxItems`, `uniqueItems`, `additionalItems`
- **Strings**: `minLength`, `maxLength`, `pattern`, `format`, `enum`
- **Numbers**: `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`
- **Metadata**: `default`, `examples`

## Faker.js Integration

Mockzilla integrates [Faker.js](https://fakerjs.dev/) directly into the schema generation process. You can use the `faker` keyword on any schema property:

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "faker": "person.fullName"
    },
    "email": {
      "type": "string",
      "faker": "internet.email"
    }
  }
}
```

### Passing Arguments to Faker

You can pass arguments to Faker methods by using an object with the method name as the key and an array of arguments as the value:

```json
{
  "faker": {
    "finance.amount": [100, 1000, 2, "$"]
  }
}
```

## Common Faker Fields & Usage

Faker.js provides a vast library of generators. Below are the most commonly used categories and methods in Mockzilla.

### 👤 Person
Used for generating user-relative data.
- `person.firstName`: "Jane"
- `person.lastName`: "Doe"
- `person.fullName`: "Jane Doe"
- `person.jobTitle`: "Senior Software Engineer"

### 🌐 Internet
Used for digital identities and network data.
- `internet.email`: "jane.doe@example.com"
- `internet.userName`: "janedoe42"
- `internet.password`: "********"
- `internet.url`: "https://example.com"
- `internet.ipv4`: "192.168.1.1"

### 🛒 Commerce & Finance
Useful for e-commerce and banking mocks.
- `commerce.productName`: "Ergonomic Chair"
- `commerce.price`: "199.99"
- `commerce.productDescription`: "A comfortable chair for long hours."
- `finance.accountNumber`: "12345678"
- `finance.currencyCode`: "USD"
- `finance.amount`: "500.00"

### 📍 Location
For addresses and geographic data.
- `location.streetAddress`: "123 Main St"
- `location.city`: "New York"
- `location.country`: "United States"
- `location.zipCode`: "10001"

### 📅 Date & Time
- `date.past`: A date in the past.
- `date.future`: A date in the future.
- `date.recent`: A date from the last few days.
- `date.weekday`: "Monday"

### 📝 Lorem
For placeholder text.
- `lorem.word`: A single word.
- `lorem.sentence`: A full sentence.
- `lorem.paragraphs`: Multiple paragraphs.

### 🔢 Random & System
- `string.uuid`: A standard UUID (alternative to JSF's `format: "uuid"`).
- `number.int`: A random integer (can take `min` and `max`).
- `image.avatar`: A URL to a profile picture.

## Mockzilla Default Options

Mockzilla configures JSF with several default options to ensure high-quality data generation:

| Option | Value | Description |
| :--- | :--- | :--- |
| `alwaysFakeOptionals` | `true` | Always generates optional properties (those not in `required`). |
| `useDefaultValue` | `true` | Uses the `default` keyword if present in the schema. |
| `useExamplesValue` | `true` | Uses the `examples` keyword if present (picks a random example). |
| `minItems` | `1` | Forces at least 1 item in arrays if not specified. |
| `maxItems` | `5` | Limits arrays to 5 items if not specified. |

## Mockzilla Specific Extensions

### String Interpolation & Field Referencing

On top of standard JSF features, Mockzilla provides its own **interpolation engine**. This allows you to reference values generated in one field from another field using `{$.path}` syntax.

> [!TIP]
> Use `{$.path}` when you need consistency across your generated objects, like matching an `orderId` in a summary string.

See the [Schema Interpolation](schema-interpolation.md) guide for more details.

## Troubleshooting

- **Invalid Schema**: If your schema doesn't follow Draft-04, JSF might fail to generate data. Ensure you have a `type` defined for your properties.
- **Circular References**: JSF and Mockzilla's interpolation engine both have protections against circular references.
- **Faker Method Not Found**: Ensure you are using a valid Faker v10 path (e.g., `person.fullName`, not `name.findName`).
