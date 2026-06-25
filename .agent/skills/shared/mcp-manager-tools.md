# Mockzilla MCP Manager Tools Contract

Use the consolidated manager tools for all agent workflows. Granular legacy tool names may still exist in internal handlers or old docs, but skills should not instruct agents to call them directly.

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

## Deprecated Names To Avoid In Skills

Replace these names with manager-tool actions:

| Deprecated name | Use instead |
| :--- | :--- |
| `create_schema_mock` | `manage_mocks` (action: `create`) with `jsonSchema` |
| `preview_mock` | `manage_mocks` (action: `preview`) |
| `update_mock` | `manage_mocks` (action: `update`) |
| `create_workflow_transition` | `manage_transitions` (action: `create`) |
| `update_workflow_transition` | `manage_transitions` (action: `update`) |
| `delete_workflow_transition` | `manage_transitions` (action: `delete`) |
| `create_full_workflow` | `manage_transitions` (action: `create_full`) |
| `inspect_workflow_state` | `workflow_control` (action: `inspect`) |
| `reset_workflow_state` | `workflow_control` (action: `reset`) |
| `test_workflow` | `workflow_control` (action: `test`) |
| `evaluate_template` | `workflow_control` (action: `evaluate_template`) |
| `export_workflow` | `manage_scenarios` (action: `export`) |
| `import_workflow` | `manage_scenarios` (action: `import`) |
| `get_request_trace` | `manage_logs` (action: `trace`) |

## Skill Maintenance Rule

When a manager action changes, update this file first, then update every skill that links to it and the public docs in `documentation/`.
