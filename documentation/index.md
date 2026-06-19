# Mockzilla Reference

High-performance mocking server for JSON and stateful API workflows.

## 📚 Documentation

- [MCP Integration](/documentation/mcp.md) - Connect via Model Context Protocol.
- [Design System](/documentation/design-system.md) - Color palette, typography, and UI patterns.
- [OpenAPI Import](/documentation/openapi-import.md) - Specification parsing and mock conversion.
- [Workflow Mode](/documentation/workflow-mode.md) - Stateful transitions and mini-db logic.
- [Proxy & Record Mode](/documentation/proxy-and-record.md) - Capture live traffic and auto-generate mocks.
- [Mock Subfolders](/documentation/mock-subfolders.md) - Nested mock organization and effective serving paths.
- [Schema Interpolation](/documentation/schema-interpolation.md) - `{$.path}` and `{{input.*}}` templates.
- [Agent Skills](/documentation/skills.md) - Instruction sets (Creator, Architect).
- [AGENTS.md](/AGENTS.md) - Capability catalog.
- [Technical Setup](/documentation/technical-index.md) - Docker, Makefiles, and config.

## 🛠️ Observability

- **Structured Logging**: Production-grade logs via Pino in `.logs/mockzilla.log`.
- **Request Tracing**: Every mock request is tracked via a unique `reqId`.
- **Workflow Tracing**: Inspect why transitions did or didn't match with `executionTrace`.

## 🧠 Patterns

- **Mini-Database (`db.*`)**: Persistent in-memory state. Use `inspect_workflow_state` to verify.
- **Action-Driven**: Trigger endpoints with `effects` rather than manual mutation.
- **High-Fidelity Mocks**: Use `create_schema_mock` with the [reference guide](/documentation/json-schema-faker.md#High-Fidelity-Patterns) for production-grade data.
