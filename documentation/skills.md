# Agent Skills

Agent Skills give AI assistants focused Mockzilla knowledge for creating useful API simulations.

## Mock-first capability

The primary skills should help an agent:

- create folders for API domains;
- organize endpoints in subfolders;
- create and preview ordinary endpoint mocks;
- generate realistic responses from JSON Schema and dynamic data;
- import an OpenAPI description into a clean mock hierarchy.

## Journey capability

Journeys are the simplified stateful model. A Journey-aware agent should turn a product story into declared lifecycle tracks, small scalar fields, clear Actions, and a replayable request sequence using Handlebars for field and response values.

## Prompting examples

> “Create a Catalog API folder with product and category subfolders, then add realistic list and detail mocks.”

> “Import this OpenAPI document and organize the endpoints by resource under nested subfolders.”

> “Design a checkout Journey with pending, paid, shipped, and cancelled states.”

> “Explain the Journey request sequence a frontend should use to reach the shipped state.”

## Vocabulary contract

Skills should use these terms consistently:

- Folder and subfolder for mock organization.
- Mock for an endpoint response.
- Journey for a stateful API simulation.
- State, Action, and replay for Journey behavior.

Read [Mock Subfolders](./mock-subfolders.md), [Journeys](./journeys.md), and [MCP Integration](./mcp.md).
