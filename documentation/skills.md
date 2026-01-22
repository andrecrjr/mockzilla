# Agent Skills

Specialized instruction sets in `.agent/skills/` for AI agents.

## 🛠️ Skills

### 1. Mockzilla Mock Maker (`mockzilla-mock-maker`)
High-quality, dynamic mocks using JSON Schema + Faker.
- **Resources**: [JSON Faker Mock References](/documentation/json-schema-faker.md)
- **Focus**: Premium templates, internal interpolation, and high-fidelity data.
- **Principle**: "Stateless First" - Use schemas for 90% of cases.

### 2. Mockzilla Workflow Architect (`mockzilla-workflow-architect`)
Interactive, stateful API scenarios.
- **Focus**: Transitions, Conditions, and Effects (`state.set`, `db.push`).
- **Principle**: "Action-Driven" - Endpoints are actions, state changes are side effects.

## 🚀 Usage
Instruct the agent to use a specific skill:
> "Use **mockzilla-creator** to build a realistic user catalog."
