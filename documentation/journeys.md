# Mockzilla Journeys

## Status

Journeys are the approved replacement design for Mockzilla workflows. Sprint 3 exposes the model through `/api/journeys` and the `manage_journeys` MCP manager: both use the same Journey validation for definitions and Actions, and support CRUD, execution, and reset. Actions execute with a Handlebars context containing `request`, `params`, `state`, `fields`, and `faker`; the selected Action applies transitions and field writes atomically before its response is rendered. An unavailable Action reports `409 Conflict` with the current state and candidate requirements. The existing workflow engine stays operational until Sprint 6, when the delivered Journey surface has been verified.

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

## Intentional exclusions

Do not implement resources, collections, mini-databases, contexts, session partitioning, arbitrary JSON state beyond declared scalar fields, condition/effect DSLs, graph/canvas UI, Handlebars side effects outside `setFields`, or JavaScript execution in v1.

## Required documentation standard

Public MDX must describe a full Journey with declared lifecycle tracks and fields, clearly label it planned until shipped, and avoid presenting the old workflow engine as Journey behavior. Each Journey page must link to the concept page, authoring guide, and ordinary-mocks path where relevant.

## Implementation reference

The acceptance scenarios are in [Journey Acceptance Criteria](./journey-acceptance.md). The phased backlog, tests, and removal order are in [todo.md](../todo.md). The governing product contract is [JOURNEY.md](../JOURNEY.md).
