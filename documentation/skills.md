# Agent Skills

Agent Skills are specialized instruction sets (located in `.agent/skills/`) that supercharge AI agents with expert Mockzilla knowledge. Instead of just having access to raw tools, a skill-enabled agent understands our **Action-Driven** philosophy and knows exactly how to build high-fidelity simulations.

---

## 🛠️ Available Skills

### 1. Mockzilla Mock Maker (`mockzilla-mock-maker`)
Expert for high-fidelity, data-heavy mocks using JSON Schema + Faker.
- **Resources**: [JSON Faker Mock References](/documentation/json-schema-faker.md)
- **Best for**: Catalogs, User profiles, Search results, Analytics events.
- **Principle**: "Stateless First" - Use powerful schemas for 90% of your mocking needs.

### 2. Mockzilla Workflow Architect (`mockzilla-workflow-architect`)
Expert for stateful, interactive API scenarios and business logic.
- **Best for**: Checkouts, Authentication flows, Inventory management, State-dependent responses.
- **Principle**: "Action-Driven" - Endpoints are actions, and state changes are side-effects stored in the mini-DB.

### 3. Mockzilla Spec Translator (`mockzilla-spec-translator`)
High-velocity architect for project bootstrapping from external specs.
- **Best for**: Migrating from OpenAPI, Jira requirements, or legacy documentation.
- **Workflow**: Automated creation of folders and high-fidelity schema mocks.

### 4. Mockzilla Logic Doctor (`mockzilla-logic-doctor`)
Forensic specialist for debugging complex workflow matching and state issues.
- **Best for**: Resolving "No matching transition found" and state corruption errors.
- **Method**: Step-by-step reproduction and surgical fixes using MCP tools.

---

## 🚀 Installation

You can install these skills into any compatible agent (like Gemini CLI) using the universal `npx skills` command:

```bash
# Install the Mock Maker skill
npx skills add github.com/andrecrjr/mockzilla/.agent/skills/mockzilla-mock-maker

# Install the Workflow Architect skill
npx skills add github.com/andrecrjr/mockzilla/.agent/skills/mockzilla-workflow-architect
```

---

## 💡 How to Use Skills

Skills are activated through **Inference-based Activation**. You don't need to manually import them; you just need to prompt the agent with intent.

### Examples:

> **"Use mockzilla-mock-maker to create a realistic E-commerce product catalog API."**
> *The agent will activate the skill, read its internal documentation on schemas, and generate a robust response.*

> **"Design a stateful checkout flow using mockzilla-workflow-architect."**
> *The agent will load the workflow best practices and use the proper `state.set` and `db.push` effects.*

### Tips for Success:
- **Mention the skill name**: It helps the agent identify the best expert for the task.
- **Provide a spec**: Skills work best when you provide an OpenAPI or JSON Schema as a starting point.
- **Verify state**: When using the Workflow Architect, ask the agent to "Show me the mini-DB tables" to confirm state is being handled correctly.
