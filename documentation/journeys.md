# Mockzilla Journeys

## Status

Journeys are the approved replacement design for Mockzilla workflows. Sprints 3–4 expose the model through `/api/journeys`, the `manage_journeys` MCP manager, and the dashboard: all use the same Journey validation for definitions and Actions, and support CRUD, execution, and reset. Actions execute with a Handlebars context containing `request`, `params`, `state`, `fields`, and `faker`; the selected Action applies transitions and field writes atomically before its response is rendered. An unavailable Action reports `409 Conflict` with the current state and candidate requirements. The existing workflow engine stays operational until Sprint 6, when the delivered Journey surface has been verified.

## Use the smallest model that fits

Use folders and subfolders with ordinary mocks unless a request must change the result of a later request. Use a standalone Journey when a product flow combines related lifecycles, such as authentication, checkout, and delivery.

| Need | Use |
|---|---|
| Independent endpoint response or schema-generated data | Folder/subfolder and ordinary mock |
| One product story across sign-in, checkout, and polling | Journey |

## V1 contract

A Journey contains `name`, `slug`, optional `description`, declared Lifecycles, declared scalar fields, a current state map, current field values, and ordered Actions.

A Lifecycle has a stable key, display name, state names, and an `initialState`. A field has a stable key, scalar type, and `initialValue`. An Action has `name`, `method`, `path`, optional exact `requires` state pairs, optional declared `transitions` state pairs, optional `setFields`, `statusCode`, headers, and body.

Matching uses only method, path, route parameters, and exact lifecycle-state requirements. Reject duplicate method/path/normalized-requires combinations. A non-matching state returns `409 Conflict`, including the state map and candidate requirements.

Malformed percent-encoded route parameters are treated as a non-matching Action path. They do not execute an Action or mutate the Journey runtime.

Each successful Action uses an optimistic runtime version check before its state and Field changes are persisted. If another request changes the Journey first, the Action is evaluated again against the latest runtime; it is never reported as successful unless its resulting runtime was saved.

## Template contract

Handlebars is the only Journey language, for declared field writes, response headers, and body. Templates may access:

```text
request.body
request.query
request.headers
params
state
fields
faker
```

Apply declared Action transitions and `setFields` before rendering its response, so a body can use `{{state.checkout}}` and `{{fields.orderId}}`. Handlebars does not choose lifecycle states; fields never affect Action matching.

## Dashboard workflow

The Journey detail screen is organized around the runtime story rather than engine internals:

1. Read the current Lifecycle states and carried Field values.
2. Inspect Actions by method/path, required state, transition, Field writes, and response preview.
3. Choose **Run this Action** to prefill the request runner, replace route parameters where needed, and execute the same endpoint a client uses.
4. Inspect the response together with runtime values before and after the request. If no Action matches, use the returned `409 Conflict` requirements to identify the missing prior request.
5. Reset when beginning a new test sequence; every Lifecycle and Field returns to its declared initial value.

When authoring an Action, select a JSON or text response explicitly. Text bodies are sent as literal text; response headers, including a custom content type, can be supplied as a JSON map.

The dashboard remains list-and-form based. It deliberately does not provide a graph/canvas editor or a general-purpose state store.

## Intentional exclusions

Do not implement resources, collections, mini-databases, contexts, session partitioning, arbitrary JSON state beyond declared scalar fields, condition/effect DSLs, graph/canvas UI, Handlebars side effects outside `setFields`, or JavaScript execution in v1.

## Required documentation standard

Public MDX must describe a full Journey with declared lifecycle tracks and fields, clearly label it planned until shipped, and avoid presenting the old workflow engine as Journey behavior. Each Journey page must link to the concept page, authoring guide, and ordinary-mocks path where relevant.

## Implementation reference

The acceptance scenarios are in [Journey Acceptance Criteria](./journey-acceptance.md). The phased backlog, tests, and removal order are in [todo.md](../todo.md). The governing product contract is [JOURNEY.md](../JOURNEY.md).
