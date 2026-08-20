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

- [x] Add Journey persistence for identity, Lifecycle definitions, field definitions, current state map, and current field values.
- [x] Add Action persistence for method, path, required states, declared transitions, field writes, and response configuration.
- [x] Add Journey, Lifecycle, field, and Action validation.
- [x] Reject duplicate method/path/requires-map Action combinations.
- [x] Implement route-parameter matching for Actions.
- [x] Add reset-to-initial-lifecycle-state-and-field behavior.

**Done when:** a Journey can be created, listed, updated, reset, and deleted without execution behavior.

## Sprint 2 — Handlebars execution

- [x] Define the Journey Handlebars context: `request`, `params`, `state`, `fields`, and `faker`.
- [x] Select Actions by method, path, and optional exact Lifecycle-state requirements.
- [x] Apply declared Lifecycle transitions and field writes atomically before response output.
- [x] Render response headers and body with the resulting state map and fields.
- [x] Return `409 Conflict` with useful state information when no Action is available.
- [x] Reject unknown Lifecycle keys, undeclared state values, unknown fields, and invalid field values with clear validation errors.
- [x] Add unit and integration coverage for multi-Lifecycle branches and field carry/reset behavior.

**Done when:** an authentication, checkout, and polling sequence can execute and reset predictably.

## Sprint 3 — HTTP and MCP management

- [x] Add Journey CRUD API routes.
- [x] Add Action CRUD API routes.
- [x] Add Journey execution and reset API routes.
- [x] Add one `manage_journeys` MCP manager for Journey, Action, run, and reset operations.
- [x] Ensure HTTP and MCP validation rules are identical.
- [x] Add API/MCP parity tests.

**Done when:** an AI agent and the dashboard can manage the same Journey behavior.

## Journey reliability regressions — fix before Sprint 4 completion

These are verified Journey-only defects. Do not fold them into the legacy workflow engine.

### Runtime consistency under concurrent requests

- [ ] Prevent lost Journey state and Field writes when two valid requests execute concurrently.
  - Affected path: `lib/journey-store.ts`, `executePersistedJourney()`.
  - Root cause to preserve in the regression: the transaction reads `journey_runtime_states`, calculates the next runtime in application code, then updates the row without locking it or checking a version. Two requests can therefore calculate from the same snapshot and the later update can erase the other request’s transition/Field write.
  - Add a database-backed integration test with two independently started requests/transactions and a synchronization barrier. Use two Actions that are both valid from the initial runtime and mutate different Lifecycle/Field keys; assert the persisted runtime is serializable (contains both changes if both requests succeed, or one request is rejected/retried), never a last-writer-wins partial state.
  - Fix with a row lock (`SELECT … FOR UPDATE`) or an optimistic runtime version/CAS retry. Keep definition, Action, runtime read, action selection, and write in the same protected critical section.
  - On contention, return a deterministic result and retain the existing `409` contract for unavailable Actions; never return a false successful response for a transition that was not persisted.

### Invalid route-parameter encoding

- [ ] Make malformed percent-encoded Journey path parameters a controlled client error/non-match, not an unhandled `URIError`.
  - Affected path: `lib/journeys.ts`, `matchJourneyPath()`.
  - Reproduction: `matchJourneyPath('/orders/:id', '/orders/%E0%A4%A')` currently throws `URIError: URI error` at `decodeURIComponent`.
  - Decision: treat invalid encoding as an Action-path non-match (`409 Conflict` when no other Action is available); catch decoding failures at the matcher without masking unrelated execution failures.
  - Add unit coverage for malformed encoding and route-level coverage that verifies no runtime mutation occurs and no `500` is returned.

### Dashboard text-response authoring

- [ ] Let the Journey dashboard author and run text responses correctly.
  - Affected path: `app/app/journeys/[slug]/page.tsx`, `addAction()`.
  - Root cause: the form treats non-JSON response input as valid text but always submits `bodyType: 'json'`; the server therefore serializes the text as a JSON string instead of returning its literal text body.
  - Add an explicit JSON/text body-type control, preserve the selected type while editing, and submit it to `/api/journeys/:slug/actions`.
  - Add browser coverage: create a text Action with `hello`, run it, and assert literal `hello` plus an appropriate text content type; retain a separate JSON-body assertion.
  - Keep response headers configurable in the same Action editor so authored content types are not silently overridden.

### Required verification and debugging evidence

- [ ] Run the focused Journey unit and integration suites inside Docker: `docker compose exec app bun test tests/unit/journeys.test.ts tests/unit/journey-execution.test.ts tests/unit/journey-store.test.ts` plus the new regression tests.
- [ ] Record the concurrent-request test's before/after runtime snapshots and request outcomes in its assertion messages so a failure identifies the lost update directly.
- [ ] Run `bun run typecheck` and `bun run lint` from the repository root after the fixes, and update `documentation/journeys.md` if the malformed-path response or dashboard response-authoring behavior changes.

## Sprint 4 — Journey dashboard: understand, author, run

**Outcome:** a developer can see what a Journey currently does, build it without memorising its JSON shape, and prove a request sequence from the dashboard.

### 4.0 — Protect the browser experience

- [ ] Add browser coverage for the critical path: create a Journey, add an Action, run it, inspect the resulting runtime, and reset it.
- [ ] Keep that coverage passing after Docker rebuilds.
- [ ] Keep Next client hydration and HMR routes outside the application proxy so dashboard controls stay interactive in Docker development.

### 4.1 — Make the Journey list useful

- [ ] Provide a clear empty state that explains when to use a Journey versus folders/subfolders.
- [ ] Make creation guided: name, URL-safe slug, optional description, and a visible default Lifecycle that can be edited next.
- [ ] On each list item, show the name, description, Action count, Lifecycle count, and a concise runtime-status summary.
- [ ] Support direct navigation to a Journey and a clear return path to the list.

### 4.2 — Make the detail page readable at a glance

- [ ] Replace the equal three-column layout with responsive authoring and testing regions that remain usable on a laptop and narrow viewport.
- [ ] Add a persistent Journey header with description, served base URL, current runtime summary, reset, and primary authoring action.
- [ ] Present Lifecycle tracks as labelled state chips, clearly marking each initial state and current state.
- [ ] Present Fields with key, scalar type, initial value, and current value; use an explicit empty state when none exist.
- [ ] Keep runtime state and fields visible while editing or running; show when displayed runtime data was last refreshed.

### 4.3 — Replace raw JSON authoring with guided editors

- [ ] Add compact create/edit/delete controls for Lifecycles and Fields, with inline validation and clear descriptions of keys, allowed states, types, and initial values.
- [ ] Replace the raw-JSON Action form with labelled controls for method, route pattern, state requirements, Lifecycle transitions, Field writes, status, headers, body type, and response body.
- [ ] Use selectable declared Lifecycle and Field keys wherever possible; prevent unknown keys and incompatible values before submission.
- [ ] Explain Handlebars context beside the response and Field-write inputs, with short copyable examples for `request`, `params`, `state`, `fields`, and `faker`.
- [ ] Keep a JSON escape hatch only for structured response bodies and headers; validate it in place and preserve formatting.
- [ ] Show save, discard, delete, and API-validation failures close to the affected editor.

### 4.4 — Make Actions and execution debuggable

- [ ] Show Actions as readable, ordered cards: method/path, requirements, transitions, Field writes, response status/body type, and a concise response preview.
- [ ] Make route-parameter names and overlapping method/path combinations easy to spot; identify an Action that cannot run from the current runtime.
- [ ] Add an Action-focused request runner that preselects its method and path, offers editable path parameters, headers, query parameters, and request body, and displays the exact endpoint URL.
- [ ] After a run, show HTTP status, selected Action, rendered headers/body, and a before/after runtime diff for Lifecycle states and Fields.
- [ ] For `409 Conflict`, show current runtime and the candidate Action requirements in an actionable empty/error state.
- [ ] Provide reset confirmation and a clear post-reset summary of restored states and Fields.

### 4.5 — Keep v1 intentionally simple

- [ ] Keep the UI list-and-form based; do not add a graph/canvas editor, resources, contexts, effects, conditions, custom expressions, or session partitioning.
- [ ] Verify the dashboard uses the same HTTP validation and error messages as MCP.
- [ ] Add focused component and browser coverage for validation, unavailable Actions, response rendering, runtime diffs, and reset.

**Done when:** a developer can understand the current runtime, author a valid Journey and its Actions, execute a sequence, diagnose a rejected request, and reset the story without reading engine internals or composing raw configuration maps.

## Sprint 5 — Information architecture, documentation, and release quality

- [ ] Make folders and subfolders the primary documentation path for ordinary mocks; state the decision boundary before introducing Journeys.
- [ ] Update public Journey docs to match the delivered dashboard vocabulary and flow: create, define Lifecycles/Fields, author Actions, run, inspect, reset.
- [ ] Document Lifecycle tracks and scalar Fields as the only persisted Journey state, including initial/current values and reset semantics.
- [ ] Document Handlebars as the only dynamic Journey language for Field writes, headers, and responses; include the supported context and a concise error guide.
- [ ] Publish copyable authentication, checkout, and polling tutorials that each include a request sequence, expected runtime changes, and reset step.
- [ ] Update MCP and skill documentation with equivalent management and execution examples, including `409 Conflict` diagnosis.
- [ ] Add contextual links in the dashboard to the Journey concept, authoring guide, and Handlebars reference.
- [ ] Verify navigation and cross-links; remove stale workflow terminology and any "planned" notices once the corresponding Journey surface ships.
- [ ] Run focused tests, full tests, `bun run typecheck`, `bun run lint`, and `bun run build`.

**Done when:** the dashboard, HTTP API, MCP, skills, and docs teach the same small Journey model and let a developer recover from common authoring and execution errors.

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
