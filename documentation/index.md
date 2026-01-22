# Mockzilla Reference

High-performance mocking server for JSON and stateful API workflows.

## 📚 Documentation

- [MCP Integration](/documentation/mcp.md) - Connect via Model Context Protocol.
- [Workflow Mode](/documentation/workflow-mode.md) - Stateful transitions and mini-db logic.
- [Schema Interpolation](/documentation/schema-interpolation.md) - `{$.path}` and `{{input.*}}` templates.
- [Agent Skills](/documentation/skills.md) - Instruction sets (Creator, Architect).
- [AGENTS.md](/AGENTS.md) - Capability catalog.
- [Technical Setup](/documentation/technical-index.md) - Docker, Makefiles, and config.

## 🧠 Patterns

- **Mini-Database (`db.*`)**: Persistent in-memory state. Use `inspect_workflow_state` to verify.
- **Action-Driven**: Trigger endpoints with `effects` rather than manual mutation.
- **High-Fidelity Mocks**: Use `create_schema_mock` with the [reference guide](/documentation/json-schema-faker.md#High-Fidelity-Patterns) for production-grade data.
