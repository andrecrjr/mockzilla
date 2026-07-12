# Mockzilla MCP Manager Tools Contract

Use the consolidated manager tools for all agent workflows.

This contract is the source of truth for tool selection. Read the relevant
skill and this file before making MCP calls; do not invent tool names or actions.

## Current Manager Tools

| Tool | Actions |
| :--- | :--- |
| `manage_folders` | `list`, `create`, `get`, `update`, `delete` |
| `manage_mock_subfolders` | `list`, `create`, `get`, `update`, `delete` |
| `manage_mocks` | `list`, `create`, `get`, `update`, `delete`, `preview` |
| `manage_scenarios` | `list`, `create`, `delete`, `export`, `import` |
| `manage_transitions` | `list`, `create`, `update`, `delete`, `create_full` |
| `workflow_control` | `inspect`, `reset`, `seed`, `test`, `evaluate_template` |
| `manage_logs` | `get`, `trace`, `clear` |

## Current operating rules

- Use `manage_folders` for folder records and `manage_mock_subfolders` for nested endpoint organization.
- Use `manage_mocks` for mock CRUD and request-context previews. Create requires `name`, `path`, `method`, `statusCode`, and `folderSlug` or `folderId`; provide `response` unless a dynamic `jsonSchema` is supplied.
- Use `manage_scenarios` for scenario records and import/export; use `manage_transitions` for transition CRUD; use `workflow_control` to test, inspect, seed, or reset runtime state.
- Treat folder and scenario IDs as strings. Transition IDs are integers.
- Read with `get`/`list` before updating or deleting. After writes, re-read or preview the affected resource.
- Keep stateless mock interpolation (`{$.path}`) separate from workflow Handlebars (`{{path}}`).
- Update relevant `documentation/` when behavior or conventions change.

## Skill Maintenance Rule

When a manager action changes, update this file first, then update every skill that links to it and the public docs in `documentation/`.
