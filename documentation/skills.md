# Agent Skills

Specialized instruction sets in `.agent/skills/` for AI agents.

## 🛠️ Skills

### 1. Mockzilla Creator (`mockzilla-creator`)
High-quality, dynamic mocks using JSON Schema + Faker.
- **Focus**: Premium templates, internal interpolation.
- **Principle**: "Stateless First" - Use schemas for 90% of cases.

### 2. Mockzilla Workflow Architect (`mockzilla-workflow-architect`)
Interactive, stateful API scenarios.
- **Focus**: Transitions, Conditions, and Effects (`state.set`, `db.push`).
- **Principle**: "Action-Driven" - Endpoints are actions, state changes are side effects.

## 🚀 Usage
Instruct the agent to use a specific skill:
> "Use **mockzilla-creator** to build a realistic user catalog."
