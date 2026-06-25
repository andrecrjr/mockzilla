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
- [Skills Maintenance](/documentation/skills-maintenance.md) - Rules for keeping `.agent/skills/` current.
- [AGENTS.md](/AGENTS.md) - Capability catalog.
- [Technical Setup](/documentation/technical-index.md) - Docker, Makefiles, and config.
- [Desktop App](/documentation/desktop-app.md) - Tauri packaging for Windows, macOS, and Linux.

## 🛠️ Observability

- **Structured Logging**: Production-grade logs via Pino in `.logs/mockzilla.log` for web/dev runs, or the configured desktop log directory for packaged desktop builds.
- **Request Tracing**: Every mock request is tracked via a unique `reqId`.
- **Workflow Tracing**: Inspect why transitions did or didn't match with `executionTrace`.

## 🧠 Patterns

- **Mini-Database (`db.*`)**: Persistent in-memory state. Use `workflow_control` (action: `inspect`) to verify.
- **Action-Driven**: Trigger endpoints with `effects` rather than manual mutation.
- **High-Fidelity Mocks**: Use `manage_mocks` (action: `create`) with `jsonSchema` and the [reference guide](/documentation/json-schema-faker.md#High-Fidelity-Patterns) for production-grade data.
