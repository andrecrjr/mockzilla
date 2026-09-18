# Wildcard Variants Audit

Date: 2026-09-17  
Branch: `feat/update-variants`

## Implemented contract

Wildcard variants remain backward compatible with the existing JSONB shape and now
use structured captures for response selection:

```ts
{
  captures: string[];
  isFallback?: boolean;
  key?: string; // generated compatibility field
  body: string;
  statusCode: number;
  bodyType: 'json' | 'text';
  jsonSchema?: string | null;
  useDynamicResponse?: boolean;
}
```

`useDynamicResponse: true` selects the variant schema and requires a JSON body type.
Legacy variants without the optional fields remain static. JSON variants are validated
before REST create/update; MCP uses the same Zod contract. Dynamic variants keep their
fallback `body` for the route's existing generation-error behavior.

## Matching and precedence

1. The matcher scores exact paths above wildcard paths, and wildcard paths above
   substring paths. Therefore `/users/test` still uses an exact mock even when
   `/users/*` has a matching variant or `key: "*"` catch-all.
2. A wildcard mock extracts one capture per `*`, in endpoint order. The matcher
   compares the structured array directly, so captured values can contain `|`.
3. Variant selection tries the normalized exact `captures` array, then an explicit
   fallback variant. Legacy `key` values are normalized automatically; `key: "*"`
   becomes a fallback marker.
4. A matching variant overrides response body, status, body type, schema source, and
   base echo behavior. If no variant matches, the base mock is used unless
   `wildcardRequireMatch` requires a 404.
5. Endpoint proxy behavior remains endpoint-level and is evaluated before response
   source generation.

Live route and MCP preview both use `applyVariantResponse()` so static, dynamic, and
echo precedence stay aligned.

## Editor contract

The core editor now has a responsive side menu:

- **Mock Response** contains Match Type. Exact and substring mocks show the Manual
  JSON / Dynamic Response source selector and active editor; wildcard mocks show
  variants as the primary response editor and hide the base source editor.
- **Advanced Options** contains query parameters, response delay, echo request body,
  and proxy target URL.
- Editing an existing mock opens **Mock Response** first; saved Advanced Options
  values remain available when that section is selected.
- Match Type remains `exact` by default, even when the endpoint contains `*`; users
  explicitly choose `wildcard` to enable variant editing.
- Switching away from `wildcard` preserves variants in local editor state but submits
  them only when wildcard matching is active. The hidden base response remains the
  fallback when wildcard matching does not require a variant match.
- Each specific variant shows one inline input per endpoint wildcard, with the route
  context and a matching URL preview kept visible. A fallback is added with a
  dedicated action rather than typing a special delimiter value.
- Every variant has the same two response sources as the base mock. Dynamic variants
  automatically use JSON; static variants can use JSON or text.

The separate extension editor is unchanged.

## Boundary preservation

Normal export/import now preserves `queryParams`, `variants`, and
`wildcardRequireMatch`, in addition to the existing response fields. OpenAPI-generated
variants remain static by default.

Legacy records are migrated lazily: API/MCP reads expose normalized `captures` and
`isFallback`, while create/update/import/export paths write both the canonical fields
and the compatibility `key`. No destructive global backfill is required.

## Focused regression coverage

The serving tests cover:

- exact-over-wildcard precedence;
- exact variant and `*` catch-all selection;
- no-variant fallback and required-match behavior;
- structured multi-capture values, including literal pipes;
- legacy single- and multi-capture keys;
- encoded keys;
- dynamic base with static variant;
- dynamic response generated from the selected variant schema;
- variant response taking precedence over base echo;
- status and body-type overrides.

The REST API rejects malformed variant status/body/source data with `400` before it can
reach the serving route. Export/import and MCP boundary coverage should be extended if
those endpoints gain dedicated round-trip fixtures.

## Browser verification

The headless Chrome DevTools MCP smoke test verified the core editor flow against the
local app: `/users/*` selects `Wildcard`, both source choices remain available while
only the active editor is shown, a variant switches to `Dynamic Response`, its body
type locks to JSON, and schema preview generates successfully. The browser reported no
console errors. The variant source switch uses one state update so the dynamic
selection is not overwritten by a stale body-type update.
