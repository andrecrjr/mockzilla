# Dynamic Response Templates

Mockzilla supports type-preserving interpolation and Handlebars templates for ordinary endpoint mocks and Journey responses.

## Use templates for response data

Templates are useful when a response should reflect request input or generate realistic values:

```json
{
  "id": "{{params.id}}",
  "email": "{{body.email}}",
  "requestId": "{{headers.x-request-id}}",
  "createdAt": "{{now}}"
}
```

When a template is the entire JSON value, Mockzilla preserves numbers, booleans, arrays, and objects rather than converting everything to strings.

## Common values

| Source | Example |
|---|---|
| Request body | `{{body.name}}` |
| Query string | `{{query.page}}` |
| Path parameter | `{{params.id}}` |
| Header | `{{headers.authorization}}` |
| Generated value | `{{faker.string.uuid}}` |
| Current time | `{{now}}` |

## Use logic sparingly

Handlebars supports conditions and loops when a mock response needs them:

```handlebars
{
  "status": "{{#if query.preview}}preview{{else}}published{{/if}}",
  "generatedAt": "{{now}}"
}
```

For endpoint behavior that changes over multiple requests, use a Journey. Templates generate data; Journeys explain lifecycle behavior.

Read [Dynamic Data Syntax](/docs/reference/dynamic-interpolation) and [Journeys](./journeys.md).
