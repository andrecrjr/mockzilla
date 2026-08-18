# Journey Delivery Backlog

Use [JOURNEY.md](./JOURNEY.md) as the product and engineering contract. Complete sprints in order.

## Sprint 0 — Ground the Journey model

- [x] Review `JOURNEY.md` before beginning implementation work.
- [x] Rewrite the developer reference at `documentation/journeys.md` from the Journey contract; it must distinguish shipped workflow behavior from the planned Journey model.
- [x] Rewrite the public MDX concept page at `content/docs/concepts/journeys.mdx` around Lifecycle tracks, declared fields, Actions, and Handlebars.
- [x] Rewrite `content/docs/guides/creating-journeys.mdx` as a complete, copyable Journey example with Lifecycles and fields but no resources, contexts, effects, conditions, or graph concepts.
- [x] Add a short decision guide: ordinary mocks in folders/subfolders by default; use a Journey only when a previous request changes the next response.
- [x] Check navigation and cross-links so every Journey page leads to the concept, authoring guide, and current implementation-status notice.
- [x] Add focused baseline tests for folders, subfolders, and ordinary mocks to protect unaffected behavior.
- [x] Define representative Journey examples: authentication, checkout, and polling.
- [x] Confirm the complete example uses declared Lifecycle tracks, scalar fields, and Handlebars templates only.
- [x] Record rejected complexity: resources, contexts, graph UI, effects, conditions, and custom expressions.
- [x] Define Journey acceptance criteria from the examples before adding persistence or APIs.

**Done when:** the Journey contract is grounded in executable examples, developer docs, and public MDX; no Journey page describes rejected engine concepts; and ordinary mocks remain protected.

## Sprint 1 — Journey persistence and routing

- [ ] Add Journey persistence for identity, Lifecycle definitions, field definitions, current state map, and current field values.
- [ ] Add Action persistence for method, path, required states, declared transitions, field writes, and response configuration.
- [ ] Add Journey, Lifecycle, field, and Action validation.
- [ ] Reject duplicate method/path/requires-map Action combinations.
- [ ] Implement route-parameter matching for Actions.
- [ ] Add reset-to-initial-lifecycle-state-and-field behavior.

**Done when:** a Journey can be created, listed, updated, reset, and deleted without execution behavior.

## Sprint 2 — Handlebars execution

- [ ] Define the Journey Handlebars context: `request`, `params`, `state`, `fields`, and `faker`.
- [ ] Select Actions by method, path, and optional exact Lifecycle-state requirements.
- [ ] Apply declared Lifecycle transitions and field writes atomically before response output.
- [ ] Render response headers and body with the resulting state map and fields.
- [ ] Return `409 Conflict` with useful state information when no Action is available.
- [ ] Reject unknown Lifecycle keys, undeclared state values, unknown fields, and invalid field values with clear validation errors.
- [ ] Add unit and integration coverage for multi-Lifecycle branches and field carry/reset behavior.

**Done when:** an authentication, checkout, and polling sequence can execute and reset predictably.

## Sprint 3 — HTTP and MCP management

- [ ] Add Journey CRUD API routes.
- [ ] Add Action CRUD API routes.
- [ ] Add Journey execution and reset API routes.
- [ ] Add one `manage_journeys` MCP manager for Journey, Action, run, and reset operations.
- [ ] Ensure HTTP and MCP validation rules are identical.
- [ ] Add API/MCP parity tests.

**Done when:** an AI agent and the dashboard can manage the same Journey behavior.

## Sprint 4 — Minimal dashboard DX

- [ ] Add Journey list and create screens.
- [ ] Add compact Lifecycle and Field editors.
- [ ] Add a compact Action editor for requirements, transitions, field writes, and response configuration.
- [ ] Show the current lifecycle state map, fields, and a reset control.
- [ ] Show an endpoint URL and request runner.
- [ ] Show selected Action, rendered response, and resulting lifecycle state map and fields after a run.
- [ ] Keep the UI list-and-form based; do not add a graph/canvas editor.

**Done when:** a developer can create and test a Journey without reading engine internals.

## Sprint 5 — Documentation and release quality

- [ ] Make folders and subfolders the primary documentation path for ordinary mocks.
- [ ] Document Journeys as the only stateful model.
- [ ] Document Lifecycle tracks and scalar Fields as the only persisted Journey state.
- [ ] Document Handlebars as the only dynamic Journey language for field writes and responses.
- [ ] Rewrite authentication, shopping-cart, and polling tutorials as Journeys.
- [ ] Update MCP and skill documentation.
- [ ] Verify links and remove stale workflow terminology.
- [ ] Run focused tests, full tests, `bun run typecheck`, `bun run lint`, and `bun run build`.

**Done when:** implementation, MCP, UI, and docs describe one consistent Journey model.

## Sprint 6 — Retire the workflow engine

- [ ] Inventory old workflow tables, routes, handlers, schemas, MCP tools, UI components, tests, exports, and docs.
- [ ] Confirm Journey acceptance examples pass through HTTP, MCP, and dashboard flows.
- [ ] Remove workflow database schema and migrations.
- [ ] Remove workflow routes, handlers, schemas, exports, and imports.
- [ ] Remove workflow MCP tools.
- [ ] Remove workflow UI pages, editors, inspectors, and components.
- [ ] Remove workflow unit and integration tests.
- [ ] Remove workflow documentation, tutorials, navigation, and public links.
- [ ] Verify no workflow route, MCP tool, UI entry, or documentation page remains.

**Done when:** Journeys are the sole stateful model and repository search finds no supported workflow-engine surface.
