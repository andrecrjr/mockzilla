# Skills Maintenance

This page records the documentation contract for Mockzilla agent skills.

## Core authoring rules

- Start with a folder and subfolder structure for ordinary endpoint mocks.
- Keep each mock focused on one request and response behavior.
- Use realistic schemas and dynamic data only where they improve frontend work.
- Use Journeys only when behavior must persist across multiple requests.
- Describe stateful behavior with declared lifecycle tracks, scalar fields, Actions, Handlebars, and replay.

## Validation checklist

After changing a skill:

- Confirm mock examples use folders and subfolders when route hierarchy matters.
- Confirm Journey examples describe a user or business story.
- Confirm generated work includes a request sequence the frontend can run.
- Confirm documentation links point to `documentation/mock-subfolders.md`, `documentation/journeys.md`, and `documentation/mcp.md`.
- Update `documentation/skills.md` whenever user-facing behavior changes.
