# Journey Acceptance Criteria

This page freezes the Sprint 0 behavior that the Journey implementation must prove before it adds persistence, HTTP, MCP, or UI surfaces. It is a developer test contract, not an available API.

## Shared rules

- A Journey has several declared Lifecycle tracks, a current state map with one state for each track, and declared scalar fields with current values.
- An Action matches only HTTP method, path, route parameters, and optional exact `requires` pairs.
- An Action changes only its declared `transitions` and `setFields` pairs; every referenced Lifecycle, state, and field must be declared.
- Templates use Handlebars for field writes, headers, and response bodies with `request`, `params`, `state`, `fields`, and `faker` only.
- No matching Action returns `409 Conflict` with the current state map and candidate requirements. Fields do not participate in matching.
- Reset restores every Lifecycle to its `initialState` and every field to its `initialValue`.

## Complete customer Journey

The same Journey carries all of these tracks:

```text
auth:     signed_out → authenticated
checkout: browsing → pending → paid → shipped
delivery: not_started → tracking → delivered

fields: accessToken, orderId, trackingCode
```

| Start | Request | Response | End |
|---|---|---|---|
| `auth: signed_out`, `accessToken: null` | `POST /auth/sign-in` | `200`; Action sets `accessToken` with `{{faker.string.uuid}}` | `auth: authenticated` and token is carried |
| `auth: authenticated` | `GET /me` | `200`; body can use `{{state.auth}}` | unchanged |
| `auth: authenticated`, `checkout: pending`, `orderId: null` | `POST /orders/order-1/pay` | `200`; Action sets `orderId` from `{{params.id}}` | `checkout: paid` and order ID is carried |
| `auth: authenticated`, `checkout: paid`, `orderId: order-1` | `POST /orders/order-1/ship` | `200`; body can use `{{fields.orderId}}` | `checkout: shipped` |
| `auth: authenticated`, `delivery: not_started` | `POST /reports` | `202` | `delivery: tracking` |
| `auth: authenticated`, `delivery: tracking` | `GET /reports/report-1` | `200`; Action sets `trackingCode` | `delivery: delivered` and tracking code is carried |
| `auth: signed_out` | `GET /me` | `409`; reports current `auth` and required `authenticated` | unchanged |
| `checkout: pending` | `POST /orders/order-1/ship` | `409`; reports current `checkout` and required `paid` | unchanged |

## Validation cases

- A Lifecycle must have at least one state and an `initialState` from that list.
- Each Action `requires` and `transitions` key must name a Lifecycle in its Journey.
- Each state value in `requires` and `transitions` must be declared by that Lifecycle.
- Each field must declare a scalar type and compatible initial value.
- Each `setFields` key must name a Journey field; rendered values must match its scalar type.
- Two Actions cannot share the same method, path, and normalized `requires` map.
- Fields cannot be used as Action requirements or selectors.
- A reset restores the whole state map and all field values without changing Lifecycle definitions or Actions.

## Protection for ordinary mocks

Journey work must not change ordinary mock behavior. The focused integration baseline proves that a root mock and a mock in a nested subfolder remain independently reachable from the same folder. Existing folder CRUD and subfolder hierarchy tests remain required coverage.

Read [JOURNEY.md](../JOURNEY.md) for the product contract and [todo.md](../todo.md) for the sprint order.
