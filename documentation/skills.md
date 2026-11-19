# Agent Skills

Agent Skills are specialized instruction sets in `.agent/skills/`. The four Mockzilla specialist skills use MCP tools. `mockzilla-cli` is a separate terminal workflow for users and agents who want to manage Mockzilla through its executable.

---

## Maintenance Contract

MCP-focused skills should use the consolidated manager tools:

| Area | Tool |
| :--- | :--- |
| Folders | `manage_folders` |
| Mock subfolders | `manage_mock_subfolders` |
| Mocks | `manage_mocks` |
| Workflow scenarios | `manage_scenarios` |
| Workflow transitions | `manage_transitions` |
| Workflow state/testing | `workflow_control` |
| Logs and traces | `manage_logs` |

Use only the current manager tools and actions listed above. Their canonical contract lives in `.agent/skills/shared/mcp-manager-tools.md`.

The `mockzilla-cli` skill is independent: it teaches the `mockzilla` executable and `curl`, and must not substitute MCP tool instructions. It is appropriate for CLI-specific requests such as “use the Mockzilla CLI” or “manage this mock from the terminal.” If a task has no CLI command or documented REST path, the skill states that limit.

MCP-focused skills start with a **Look up docs fast (llms.txt)** section: fetch `/llms.txt` for the index, then only relevant `/llms/docs/<page>.txt` pages. Use `/llms-full.txt` only when the full manual is needed. See `documentation/llms-txt.md`.

Each skill also has `agents/openai.yaml` metadata for UI display and default prompts. Keep that metadata aligned with the corresponding `SKILL.md` frontmatter.

---

## 🛠️ Available Skills

### 1. Mockzilla Mock Maker (`mockzilla-mock-maker`)
Expert for high-fidelity, data-heavy mocks using JSON Schema + Faker.
- **Resources**: [JSON Faker Mock References](/documentation/json-schema-faker.md)
- **Best for**: Catalogs, User profiles, Search results, Analytics events.
- **Principle**: "Stateless First" - Use powerful schemas for 90% of your mocking needs.
- **Verify with**: `manage_mocks` (action: `preview`).

### 2. Mockzilla Workflow Architect (`mockzilla-workflow-architect`)
Expert for stateful, interactive API scenarios and business logic.
- **Best for**: Checkouts, Authentication flows, Inventory management, State-dependent responses.
- **Principle**: "Action-Driven" - Endpoints are actions, and state changes are side-effects stored in the mini-DB.
- **Verify with**: `workflow_control` (actions: `test`, `inspect`).

### 3. Mockzilla Spec Translator (`mockzilla-spec-translator`)
High-velocity architect for project bootstrapping from external specs.
- **Best for**: Translating OpenAPI, Jira requirements, or endpoint documentation into a current Mockzilla setup.
- **Workflow**: Automated creation of folders and high-fidelity schema mocks.
- **Verify with**: `manage_mocks` (action: `preview`) for stateless endpoints and `workflow_control` (action: `test`) for stateful flows.

### 4. Mockzilla Logic Doctor (`mockzilla-logic-doctor`)
Forensic specialist for debugging complex workflow matching and state issues.
- **Best for**: Resolving "No matching transition found" and state corruption errors.
- **Method**: Step-by-step reproduction and surgical fixes using MCP tools.
- **Verify with**: `manage_logs` (action: `trace`) and `workflow_control` (actions: `test`, `inspect`).

### 5. Mockzilla CLI (`mockzilla-cli`)
Terminal specialist for checking CLI releases, configuring a Mockzilla server, managing folders/subfolders and mocks, importing/exporting data, importing OpenAPI, and verifying responses through the dependency-free CLI.
- **Best for**: Requests explicitly asking for the Mockzilla CLI, CI setup, reproducible terminal work, and shell automation.
- **Entry point**: `mockzilla agent-skill` prints the current Markdown instructions.

---

## 🚀 Installation

Install these skills into any compatible agent (like Gemini CLI) using the universal `npx skills` command pointing to this repository:

```bash
npx skills add github.com/andrecrjr/mockzilla
```

When you run this command, you will be able to select one or more of the following specialized experts:

- **Mockzilla Mock Maker**: Expert for high-fidelity, data-heavy mocks using JSON Schema + Faker.
- **Mockzilla Workflow Architect**: Expert for stateful, interactive API scenarios and business logic.
- **Mockzilla Spec Translator**: High-velocity architect for project bootstrapping from OpenAPI or technical specs.
- **Mockzilla Logic Doctor**: Forensic specialist for debugging complex workflow matching and state issues.
- **Mockzilla CLI**: Terminal workflows for folders, subfolders, mocks, import/export, OpenAPI, variants, and dynamic responses.

---

## 💡 How to Use Skills

Skills are activated through **Inference-based Activation**. You don't need to manually import them; you just need to prompt the agent with intent.

### Examples:

> **"Use mockzilla-mock-maker to create a realistic E-commerce product catalog API."**
> *The agent will activate the skill, read its internal documentation on schemas, and generate a robust response.*

> **"Design a stateful checkout flow using mockzilla-workflow-architect."**
> *The agent will load the workflow best practices and use the proper `state.set` and `db.push` effects.*

> **"Use mockzilla-cli to import this OpenAPI file, create a mock in its subfolder, and verify the response."**
> *The agent will use the `mockzilla` commands and a real serving request from the terminal.*

### Tips for Success:
- **Mention the skill name**: It helps the agent identify the best expert for the task.
- **Provide a spec**: Skills work best when you provide an OpenAPI or JSON Schema as a starting point.
- **Verify state**: When using the Workflow Architect, ask the agent to "Show me the mini-DB tables" to confirm state is being handled correctly.
- **Keep docs synced**: When changing skill behavior, update this page and the relevant reference in `documentation/`.
