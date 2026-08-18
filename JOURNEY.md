# Mockzilla Journey Engineering Contract

## Purpose

Journeys replace Mockzilla's workflow engine with a small, understandable way to model a complete stateful API story.

Folders and subfolders remain the default for ordinary endpoint mocks. Use a Journey when earlier requests change what later requests return, such as signing in, paying an order, and tracking delivery.

## V1 Product Model

A Journey is standalone and contains:

- `name`, `slug`, and optional `description`;
- named Lifecycle tracks;
- one mutable state map, with one current state per Lifecycle;
- declared Journey fields and their current scalar values;
- ordered Actions.

A Lifecycle contains a stable `key`, a display name, declared state names, and an `initialState`. A Journey starts with every Lifecycle at its own initial state.

A Journey field contains a stable `key`, a scalar `type` (`string`, `number`, or `boolean`), and an `initialValue` of that type or `null`. Fields carry a small value through the story, such as `orderId`, `accessToken`, or `trackingCode`. They are not records, collections, or a schema-less JSON store.

An Action contains:

- `name`;
- HTTP `method` and `path`;
- optional `requires`: exact Lifecycle-state pairs that must be true;
- optional `transitions`: Lifecycle-state pairs it changes;
- optional `setFields`: declared field values it writes;
- response `statusCode`, headers, and body template.

For example, one Journey can follow a complete customer story:

```text
Authentication: signed_out → authenticated
Checkout:      browsing → pending → paid → shipped
Delivery:      not_started → tracking → delivered
```

`POST /orders/:id/pay` can require `auth: authenticated` and `checkout: pending`, then transition only `checkout` to `paid`.

The same Action can set `orderId` from `{{params.id}}`, allowing a later delivery response to return that value without pretending the Journey owns an orders database.

An Action is selected only by method, path, route parameters, and exact required Lifecycle states. Duplicate method/path/requires combinations are invalid.

If no Action is available, return `409 Conflict` with the current lifecycle state map and the unmet requirements of candidate Actions.

## Handlebars Only

Handlebars is the only dynamic language in a Journey. It renders declared field writes, response headers, and body; it does not decide lifecycle transitions.

Every response template receives this context:

```text
request.body
request.query
request.headers
params
state
fields
faker
```

`state` is the declared Lifecycle-state map, for example `{{state.checkout}}`. `fields` contains current Journey fields, for example `{{fields.orderId}}`. Apply an Action's declared transitions and `setFields` atomically before rendering its response.

Use standard Handlebars helpers and blocks for response presentation. Do not introduce a second expression language.

## Explicit Non-Goals

Journey v1 must not add:

- condition or effect DSLs;
- tables, mini-databases, resources, or CRUD primitives;
- mutable JSON blobs beyond declared Lifecycle states and scalar Journey fields;
- per-user contexts or session partitioning;
- graph/canvas editing;
- template side effects;
- custom JavaScript execution.

The old workflow engine remains temporarily during Journey delivery. It is retired only after Journeys are feature-complete, verified, documented, and adopted as the sole stateful model.

Complex data behavior belongs in ordinary mocks, schemas, and folder/subfolder organization.

## Rejected Complexity Record

| Rejected in v1 | Why it is excluded | Use instead |
|---|---|---|
| Resources, collections, and CRUD primitives | They turn a lifecycle simulator into a second backend. | Ordinary mocks, schemas, folders/subfolders, and small declared Journey fields. |
| Contexts and session partitioning | They obscure the lifecycle state a developer must understand. | Reset the Journey for each test run. |
| Condition and effect DSLs | A second language makes selection and mutation difficult to trace. | Exact declared Lifecycle-state requirements, transitions, and one explicit `setFields` map. |
| Graph/canvas UI | A diagram adds editing complexity without making the contract smaller. | Lifecycle list, ordered Actions, and request runner. |
| Custom expressions and JavaScript | They make behavior unsafe and non-portable. | Handlebars helpers and blocks in responses only. |

These exclusions are product decisions, not deferred implementation shortcuts. A later version may revisit one only through a new written product decision and acceptance criteria.

## Sprint 0 Acceptance Criteria

The implementation must prove these scenarios before persistence or APIs are added:

| Example | Starting lifecycle state | Request | Expected result |
|---|---|---|---|
| Authentication | `auth: signed_out`, `accessToken: null` | `POST /auth/sign-in` | `200`, response can use Handlebars; `auth` becomes `authenticated` and Action sets `accessToken`. |
| Authentication | `auth: signed_out` | `GET /me` | `409` shows `auth: signed_out` and requirement `auth: authenticated`. |
| Checkout | `auth: authenticated`, `checkout: pending`, `orderId: null` | `POST /orders/:id/pay` | `200`, route parameter is available to Handlebars; `checkout` becomes `paid` and Action sets `orderId`. |
| Checkout | `auth: authenticated`, `checkout: pending` | `POST /orders/:id/ship` | `409` shows `checkout: pending` and requirement `checkout: paid`. |
| Polling | `delivery: not_started` | `POST /reports` then `GET /reports/:id` | Start returns `202` and moves `delivery` to `tracking`; poll returns `200` and moves it to `delivered`. |
| Reset | any changed state or field | reset | Every Lifecycle returns to its `initialState` and every field returns to its `initialValue`. |

Every Action uses only method, path, optional exact `requires`, optional declared `transitions`, optional `setFields`, status, headers, and body. The implementation must reject unknown Lifecycle keys or states, unknown field keys, invalid field values, and duplicate method/path/requires combinations. Fields never participate in Action matching.

## Engineering Loop

For every `todo.md` item:

1. Select one unchecked task from the active sprint.
2. Read the relevant implementation and tests before changing code.
3. Write or update the smallest test proving the desired behavior.
4. Implement the smallest change that makes the test pass.
5. Run focused tests, then `bun run typecheck` and `bun run lint`.
6. Update public documentation when behavior changes.
7. Record a decision only when changing this contract or deferring a product concern.
8. Mark the task complete only after verification succeeds.

Do not start a later sprint while the current sprint has incomplete acceptance checks.

## Decision Log

| Date | Decision | Reason |
|---|---|---|
| 2026-08-17 | A Journey holds several declared Lifecycle tracks, not one global state. | A complete product journey needs authentication, checkout, and delivery to coexist visibly. |
| 2026-08-17 | Lifecycle transitions are declared data, not Handlebars templates. | Developers must be able to see every possible lifecycle path before running it. |
| 2026-08-17 | Journeys have declared scalar fields alongside Lifecycle tracks. | Full stories need to carry a few values without introducing collections or a general effects engine. |
| 2026-08-17 | Handlebars is the only dynamic response language. | Avoids a second DSL while keeping dynamic response data familiar. |
| 2026-08-17 | Journeys are standalone. | Keeps folders/subfolders focused on ordinary endpoint mocks. |
| 2026-08-17 | The old workflow engine is removed last, not adapted. | Lets the Journey model prove its DX before the old model is retired. |

## Definition of Done

A Journey feature is complete only when:

- behavior matches this contract;
- focused tests and integration tests pass;
- `bun run typecheck`, `bun run lint`, and production build pass;
- documentation reflects the shipped behavior;
- no old workflow concept is reintroduced under another name.
