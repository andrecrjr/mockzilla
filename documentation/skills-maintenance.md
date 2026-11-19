# Skills Maintenance

This page records the maintenance rules for `.agent/skills/`.

## Current Skills

| Skill | Use |
| :--- | :--- |
| `mockzilla-mock-maker` | Stateless mocks, JSON Schema Faker responses, variants, and previews. |
| `mockzilla-workflow-architect` | Stateful workflow design, transitions, mini-DB effects, and fallback behavior. |
| `mockzilla-spec-translator` | Translating OpenAPI, Swagger, Jira, or endpoint inventories into Mockzilla setup. |
| `mockzilla-logic-doctor` | Forensics for transition matching, state drift, request traces, and broken interpolation. |
| `mockzilla-cli` | Release checks, terminal configuration, folders/subfolders, mocks, data import/export, OpenAPI import, and serving checks. |

## MCP Manager Tool Rule

MCP-focused skills must prefer the consolidated manager tools documented in `documentation/mcp.md`:

- `manage_folders`
- `manage_mock_subfolders`
- `manage_mocks`
- `manage_scenarios`
- `manage_transitions`
- `workflow_control`
- `manage_logs`

Use only the current consolidated manager tools and actions. Their contract lives in `.agent/skills/shared/mcp-manager-tools.md`.

The `mockzilla-cli` skill is a separate terminal workflow. It teaches the dependency-free `mockzilla` executable and `curl`; it does not call manager tools or blend MCP instructions into its CLI workflow. It can be used whenever the request explicitly asks for the Mockzilla CLI, even when MCP is available.

## Metadata Rule

Each skill should include:

- `SKILL.md` with clear frontmatter `name` and `description`.
- `agents/openai.yaml` with `display_name`, `short_description`, and `default_prompt`.
- Optional `resources/`, `examples/`, or `assets/` only when they reduce repeated context in `SKILL.md`.

## Progressive Disclosure Rule

Keep `SKILL.md` focused on:

- when to use the skill
- tool selection
- critical syntax rules
- standard workflow
- validation checklist
- links to references

Move long examples, domain templates, and detailed reference material into files under `resources/` or `examples/`.

## Validation Checklist

After changing skills:

- Search `.agent/skills` for stale tool names or unsupported actions.
- Confirm MCP-focused skills still link to the shared manager tools contract; keep the CLI skill independent.
- Confirm `agents/openai.yaml` descriptions match `SKILL.md`.
- Update `documentation/skills.md` when user-facing skill behavior changes.
- Run local checks when code changed. Markdown-only skill updates do not require database or Docker commands.
