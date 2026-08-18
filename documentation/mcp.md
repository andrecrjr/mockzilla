# Model Context Protocol (MCP) Integration

Mockzilla exposes MCP so an AI agent can create and maintain the API mocks a frontend team needs without hand-writing repetitive endpoint configuration.

## What to use MCP for today

The core MCP experience is mock-first:

1. Create a folder for an API domain.
2. Add subfolders for route hierarchy.
3. Create endpoint mocks with methods, paths, responses, matching, and dynamic data.
4. Preview the response against a realistic request.
5. Capture, import, or refine the mock as the API contract evolves.

## Core tools

| Area | Tool | Typical use |
|---|---|---|
| Folders | `manage_folders` | Create and organize API domains. |
| Mock subfolders | `manage_mock_subfolders` | Model nested route paths such as `/users/:id/orders`. |
| Mocks | `manage_mocks` | Create, update, list, delete, and preview endpoint mocks. |
| Logs | `manage_logs` | Inspect served requests and reconstruct a request trace. |

Use a folder for a coherent API surface, then use subfolders to keep large endpoint collections navigable. A mock represents one endpoint response and remains the simplest way to unblock frontend development.

## Useful prompts

> “Create a `Catalog API` folder with `/products` and `/products/:id` endpoint mocks.”

> “Add a `users` subfolder under my API folder and create GET, POST, and GET-by-id mocks.”

> “Preview the `GET /products` mock with `page=2` and a `category` query parameter.”

> “Import this OpenAPI document, group the endpoints into subfolders, and generate realistic schema-based responses.”

## Journey direction

Journeys are Mockzilla’s simplified model for stateful API behavior. A Journey is standalone and groups declared lifecycle tracks, small carried fields, and Actions around a complete business flow such as authentication, checkout, and delivery. Handlebars is its only template language.

Journey documentation defines the intended product model. It does not claim a separate MCP contract is available yet. Use folders, subfolders, and ordinary mocks for today’s API work, then read [Journeys](./journeys.md) to design future stateful behavior in the new model.

## Connection

Mockzilla exposes MCP over Streamable HTTP:

```text
http://localhost:36666/api/mcp
```

For a desktop client that requires a local stdio entry:

```json
{
  "mcpServers": {
    "mockzilla": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:36666/api/mcp",
        "--allow-http"
      ]
    }
  }
}
```

See [Mock Subfolders](./mock-subfolders.md), [OpenAPI Import](./openapi-import.md), and [Journeys](./journeys.md).
