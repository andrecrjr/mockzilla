# Skills Maintenance

This page records the maintenance rules for `.agent/skills/`.

## Current Skills

| Skill | Use |
| :--- | :--- |
| `mockzilla-mock-maker` | Stateless mocks, JSON Schema Faker responses, variants, and previews. |
| `mockzilla-workflow-architect` | Stateful workflow design, transitions, mini-DB effects, and fallback behavior. |
| `mockzilla-spec-translator` | Translating OpenAPI, Swagger, Jira, or endpoint inventories into Mockzilla setup. |
| `mockzilla-logic-doctor` | Forensics for transition matching, state drift, request traces, and broken interpolation. |

## Manager Tool Rule

Skills must prefer the consolidated MCP manager tools documented in `documentation/mcp.md`:

- `manage_folders`
- `manage_mock_subfolders`
- `manage_mocks`
- `manage_scenarios`
- `manage_transitions`
- `workflow_control`
- `manage_logs`

Do not add new skill instructions that rely on deprecated granular tool names. The canonical deprecated-name mapping lives in `.agent/skills/shared/mcp-manager-tools.md`.

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

- Search `.agent/skills` for deprecated tool names, allowing only `.agent/skills/shared/mcp-manager-tools.md`.
- Confirm every skill still links to the shared manager tools contract.
- Confirm `agents/openai.yaml` descriptions match `SKILL.md`.
- Update `documentation/skills.md` when user-facing skill behavior changes.
- Run local checks when code changed. Markdown-only skill updates do not require database or Docker commands.
