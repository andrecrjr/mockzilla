---
name: mockzilla-cli
description: Use when an agent needs to configure Mockzilla from a terminal, attach JSON Schemas, test dynamic responses, or manage exact, substring, wildcard, and variant mocks without MCP access.
---

# Mockzilla CLI Skill

Use the mockzilla CLI for reproducible, terminal-only Mockzilla work. It talks to the running Mockzilla REST API and is suitable for humans, shell scripts, CI, and agents that do not have MCP access.

This skill covers the complete response path: route matching, response sources, JSON Schema generation, request interpolation, wildcard captures, variants, and curl verification. Read the whole skill before changing a mock whose path contains an asterisk or whose response is schema-driven.

## Scope and boundaries

Use this skill for:

- configuring a Mockzilla URL and checking server health;
- creating, reading, updating, listing, and deleting folders and mocks;
- attaching static JSON/text responses or JSON Schemas;
- testing dynamic responses, request interpolation, wildcard variants, and fallback behavior;
- diagnosing why a request matched the wrong mock or returned the base response.

Use the UI when the task is primarily visual editor work. Use the workflow/state skill for stateful scenario transitions and database effects. Use the mock-maker skill when a high-fidelity domain schema must be designed first. The CLI remains the execution and curl-test path for all of them.

## Start here

~~~bash
mockzilla config set --url http://localhost:36666
mockzilla health
mockzilla folders list --json
~~~

The CLI stores one default server URL. The url flag overrides it for one command; MOCKZILLA_URL is useful in automation. Use the json flag whenever another tool must parse output. Configuration precedence is command flag, environment variable, then saved config.

The CLI can be installed without cloning the repository:

~~~bash
npx --yes github:andrecrjr/mockzilla health
pnpm dlx github:andrecrjr/mockzilla health
~~~

Do not use npm or yarn in this repository. The package is a Node CLI and does not require the Next.js development dependencies to run.

## Command map

~~~text
config set --url <url>       Save the default server URL
config get                   Show the configured URL
health                       Check the server
folders list|get|create|update|delete
mocks list|get|create|update|delete
agent-skill                  Print this Markdown for another agent
~~~

Create a folder before creating a mock:

~~~bash
mockzilla folders create --name Demo --slug demo
mockzilla folders list --json
~~~

Mock payloads can come from a JSON file or stdin:

~~~bash
mockzilla mocks create --file mock.json --json
mockzilla mocks create --file - --json < mock.json
mockzilla mocks update <mock-id> --file mock.json --json
mockzilla mocks get <mock-id> --json
mockzilla mocks list --folder-slug demo --json
mockzilla mocks delete <mock-id> --yes --json
~~~

folderSlug is resolved to the server folder ID before a REST create request. For complex mocks, put the complete object in a file and use flags only for small overrides such as name, path, method, status-code, match-type, response, body-type, dynamic, and folder-slug.

Destructive commands require yes in non-interactive shells. Every failure includes an agent discovery hint; see Diagnose a mismatch.

## Choose the match type first

exact is the default. A path containing an asterisk does not become wildcard matching automatically: set matchType to wildcard explicitly.

| Match type | How it matches | Use it when | Do not use it when |
| --- | --- | --- | --- |
| exact | The request path equals the endpoint | The endpoint is fixed, such as /health, /users, or /users/test | The endpoint contains a variable path value |
| wildcard | Asterisk characters capture values in endpoint order | One mock should serve paths such as /users/* or /users/*/orders/* | The path is fixed or you need arbitrary substring matching |
| substring | The request path contains the endpoint text | A deliberately broad legacy/fragment match is required | A path parameter or precise API route can be expressed with exact/wildcard |

Matching priority is exact, then wildcard, then substring. Endpoint length breaks ties after the match score. Therefore an exact /users/test mock wins over a wildcard /users/* mock even when the wildcard has a test variant. Query-parameter requirements are checked as part of matching; a mock with no required query parameters can match any query string.

Examples:

~~~json
{
  "name": "Fixed test user",
  "path": "/users/test",
  "method": "GET",
  "matchType": "exact",
  "folderSlug": "demo",
  "statusCode": 200,
  "bodyType": "json",
  "response": "{\"source\":\"exact\"}"
}
~~~

~~~json
{
  "name": "Any user",
  "path": "/users/*",
  "method": "GET",
  "matchType": "wildcard",
  "folderSlug": "demo",
  "statusCode": 200,
  "bodyType": "json",
  "response": "{\"source\":\"wildcard-base\"}"
}
~~~

If matchType is omitted from the second object, the asterisk is treated as part of an exact endpoint. Its variants will not run.

### Search parameters are a separate matcher

Search parameters can be present in every request and are available to Dynamic Response templates, but they are not path wildcard captures. Keep these two uses separate:

- Path wildcard: `/users/*` captures a path value and exposes it as `input.params.0`.
- Query input: `?status=active` is available as `input.query.status`.
- Structured `queryParams`: filters which mock wins. Parameter names are exact, while configured values support `*` glob matching. `queryParams: { "status": "*" }` matches any present status value; `act*` matches values such as `active`.
- A query string in a persisted API path is not the wildcard-query escape hatch. API and MCP writes keep the endpoint path and `queryParams` separate; the server removes the query before applying path match types.

The wildcard still requires the parameter to be present, including when its value is empty. Exact query values are more specific than wildcard values when both mocks match the same path. Query parameter names remain exact; use a concrete name such as `status`, not `*`. Dynamic responses can read the actual value with `{{$.query.status}}`.

## Choose the response source

Every mock has a response source. Keep the source decision separate from the route decision.

### Static/manual response

Use a static response when the body must be deterministic, when a test asserts an exact payload, or when a schema would add no value.

- response is a string, not an object.
- bodyType json requires valid JSON.
- bodyType text accepts arbitrary text.
- statusCode must be between 200 and 599.

~~~json
{
  "name": "Static health",
  "path": "/health",
  "method": "GET",
  "folderSlug": "demo",
  "matchType": "exact",
  "statusCode": 200,
  "bodyType": "json",
  "response": "{\"ok\":true}"
}
~~~

### Dynamic Response from JSON Schema

Use Dynamic Response when each request should receive generated values, the payload has a reusable contract, or the response needs request data. Attach the schema to jsonSchema and set useDynamicResponse to true.

- jsonSchema is stored as a JSON string in the API payload.
- bodyType must be json for dynamic output.
- Keep response as a valid static fallback. For REST creates, a schema-only mock is given response: "{}" by the CLI because the database still has a non-null static response column.
- If generation fails, Mockzilla serves the static fallback body; the route does not silently return an invalid JSON document.
- If response is present, do not rely on inference: set useDynamicResponse to true explicitly.

~~~json
{
  "name": "Generated user",
  "path": "/users",
  "method": "GET",
  "folderSlug": "demo",
  "matchType": "exact",
  "statusCode": 200,
  "bodyType": "json",
  "response": "{}",
  "useDynamicResponse": true,
  "jsonSchema": "{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\",\"format\":\"uuid\"},\"email\":{\"type\":\"string\",\"format\":\"email\"}},\"required\":[\"id\",\"email\"]}"
}
~~~

Attach a schema from a file instead of escaping it into a shell argument:

~~~bash
mockzilla mocks create \
  --file mock.json \
  --json-schema-file schema.json \
  --dynamic \
  --json
~~~

schema.json must contain the raw JSON Schema object. The CLI sends its text as the jsonSchema field. A jsonSchema object in a JSON payload is also normalized by the CLI, but the string form is the portable REST contract.

### Request-body echo

Use echoRequestBody true for a simple POST/PUT/PATCH echo test. Do not combine it with a dynamic variant expectation without testing precedence: a selected variant replaces the base response configuration and disables base echo for that request.

~~~json
{
  "name": "Echo update",
  "path": "/users/*",
  "method": "POST",
  "folderSlug": "demo",
  "matchType": "wildcard",
  "statusCode": 200,
  "bodyType": "json",
  "response": "{}",
  "echoRequestBody": true
}
~~~

## Attach (mount) schemas correctly

The schema is mounted on a mock, not on the folder and not as the response object. The minimum dynamic attachment is:

~~~text
mock.json          -> the mock definition
schema.json        -> one JSON Schema object
dynamic            -> use schema generation
json-schema-file   -> copy schema.json into jsonSchema
~~~

For a base mock, use:

~~~bash
mockzilla mocks create --file mock.json --json-schema-file schema.json --dynamic --json
~~~

For a wildcard variant, put jsonSchema inside that variant object. A variant schema is independent from the base schema and must include its own body, statusCode, bodyType, and useDynamicResponse fields:

~~~json
{
  "captures": ["test"],
  "isFallback": false,
  "body": "{}",
  "statusCode": 200,
  "bodyType": "json",
  "useDynamicResponse": true,
  "jsonSchema": "{\"type\":\"object\",\"properties\":{\"id\":{\"const\":\"test\"}},\"required\":[\"id\"]}"
}
~~~

Use variants-file variants.json when the array is large. The file must contain a JSON array of variant objects. The server validates every dynamic variant schema. A dynamic variant needs a non-empty valid schema and JSON body type; a static JSON variant needs parseable body JSON.

Useful file flags:

~~~text
--file <path|->                 Complete mock object; - means stdin
--response-file <path>          Static response body
--json-schema-file <path>       Raw JSON Schema text
--variants-file <path>          JSON array of wildcard variants
--query-params-file <path>      JSON query-parameter requirements
--wildcard-require-match        Return 404 when no wildcard variant matches
--no-require-match              Use the base response when no variant matches
~~~

## Build reliable JSON Schemas

Start with an explicit root type. Use required for fields consumers must always receive, even though the current generator also produces many optional properties. For arrays, always declare items; an array constraint without an item schema is a common source of invalid or empty test data.

~~~json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "name": { "type": "string", "minLength": 1 },
    "role": { "type": "string", "enum": ["admin", "member"] },
    "active": { "type": "boolean" },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "maxItems": 3
    }
  },
  "required": ["id", "name", "role", "active", "tags"]
}
~~~

Supported and useful constructs include object properties, nested objects, arrays, required, enum, const, string/number bounds, formats, oneOf, anyOf, allOf, and Faker keywords. Keep schemas portable: prefer explicit type, bounded arrays, and a small maxItems for test speed.

Faker examples:

~~~json
{
  "type": "object",
  "properties": {
    "firstName": { "type": "string", "faker": "person.firstName" },
    "product": { "type": "string", "faker": "commerce.productName" },
    "amount": {
      "type": "number",
      "faker": { "finance.amount": { "min": 100, "max": 1000, "dec": 2, "symbol": "" } }
    }
  },
  "required": ["firstName", "product", "amount"]
}
~~~

The generator uses JSON Schema Faker with deterministic fixed probabilities, uses defaults/examples, always fakes optional properties, and caps array size from MOCKZILLA_MAX_ITEMS (default 1000). Do not create unbounded arrays in a mock intended for curl or CI.

## Dynamic interpolation and request context

Dynamic generation first creates a schema-shaped value and then replaces templates. Use {$.path} or {{$.path}} request references for type-preserving values. The dollar alias points to request input in this context.

Common request context:

~~~text
{{input.params.0}}          First wildcard capture
{{$.params.[0]}}             Same capture with bracket syntax
{{input.query.page}}         Query parameter
{{$.headers.[x-trace-id]}}   Request header with a hyphen
{{input.body.name}}          JSON request-body field
{{faker.internet.email}}     Direct Faker template
~~~

Example schema that reflects the request:

~~~json
{
  "type": "object",
  "properties": {
    "userId": { "const": "{{$.params.[0]}}" },
    "page": { "const": "{{$.query.page}}" },
    "requestName": { "const": "{{$.body.name}}" }
  },
  "required": ["userId", "page", "requestName"]
}
~~~

Use Handlebars logic (each, if, and helpers such as math, eq, default, json, and faker) when the response needs loops, conditionals, or text around a value. Keep a response as valid JSON when possible so Mockzilla can preserve numbers, booleans, objects, and arrays instead of converting them to strings.

## Wildcards and variants

Set matchType to wildcard and use one asterisk per capture position:

~~~text
/users/*                 -> captures ["123"]
/users/*/orders/*        -> captures ["123", "abc"]
~~~

The canonical variant shape is:

~~~json
{
  "captures": ["test"],
  "isFallback": false,
  "body": "{\"source\":\"test\"}",
  "statusCode": 200,
  "bodyType": "json",
  "useDynamicResponse": false,
  "jsonSchema": null
}
~~~

Rules:

- Match uses the complete captures array in order. A variant for ["a", "b"] does not match ["a"].
- isFallback true is the explicit catch-all variant. Legacy key "*" is accepted and normalized.
- Do not encode new variants as pipe-delimited keys. The captures array preserves a literal pipe inside a URL value. Legacy multi-capture key values remain compatibility input only.
- A fallback is not a partial key. captures ["alice", "*"] is not the canonical fallback form.
- If no variant matches and wildcardRequireMatch is false or omitted, the base mock response is used.
- If no variant matches and wildcardRequireMatch is true, the server returns 404 with No matching variant found.
- A selected variant overrides base body, status, body type, schema, dynamic mode, and echo behavior.
- A static variant can override a dynamic base. A dynamic variant can override a static base or another dynamic base.

Complete wildcard example with a static exact variant, dynamic variant, and fallback:

~~~json
{
  "name": "Users by id",
  "path": "/users/*",
  "method": "GET",
  "folderSlug": "demo",
  "matchType": "wildcard",
  "response": "{\"source\":\"base\"}",
  "statusCode": 200,
  "bodyType": "json",
  "wildcardRequireMatch": false,
  "variants": [
    {
      "captures": ["test"],
      "body": "{\"source\":\"static-test\"}",
      "statusCode": 200,
      "bodyType": "json"
    },
    {
      "captures": ["dynamic"],
      "body": "{}",
      "statusCode": 202,
      "bodyType": "json",
      "useDynamicResponse": true,
      "jsonSchema": "{\"type\":\"object\",\"properties\":{\"capture\":{\"const\":\"{{$.params.[0]}}\"},\"requestId\":{\"type\":\"string\",\"format\":\"uuid\"}},\"required\":[\"capture\",\"requestId\"]}"
    },
    {
      "isFallback": true,
      "body": "{\"source\":\"fallback\"}",
      "statusCode": 404,
      "bodyType": "json"
    }
  ]
}
~~~

The test request can still be served by a separate exact /users/test mock, because exact route priority is evaluated before wildcard variants.

## Test schemas and routes with curl

The CLI has no hidden schema test mode: create the mock, inspect the stored configuration, then call the actual serving route. Always test both the matching path and the failure/fallback path.

Basic dynamic test:

~~~bash
mockzilla mocks create \
  --file mock.json \
  --json-schema-file schema.json \
  --dynamic \
  --json

mockzilla mocks get <mock-id> --json

curl -sS -D - http://localhost:36666/api/mock/demo/users
curl -sS -D - http://localhost:36666/api/mock/demo/users
~~~

Call twice and compare generated fields. UUIDs, Faker values, and unconstrained generated values should normally change; const, enum, and request references should remain stable.

Wildcard and variant matrix:

~~~bash
# Exact path should win if /users/test is also configured as an exact mock.
curl -sS -D - http://localhost:36666/api/mock/demo/users/test

# A named wildcard variant should select its captures entry.
curl -sS -D - http://localhost:36666/api/mock/demo/users/dynamic

# Unknown capture uses the base response or explicit fallback.
curl -sS -D - http://localhost:36666/api/mock/demo/users/unknown

# With wildcardRequireMatch=true, the previous request must be 404 instead.
curl -sS -D - 'http://localhost:36666/api/mock/demo/users/unknown?trace=1'

# Multi-capture route: /teams/acme/users/42 -> ["acme", "42"]
curl -sS -D - http://localhost:36666/api/mock/demo/teams/acme/users/42

# Query context is available to dynamic templates.
curl -sS -D - 'http://localhost:36666/api/mock/demo/users/dynamic?page=2'
~~~

Verify all of these, not just the body:

1. HTTP status is the selected base/variant statusCode.
2. Content-Type is JSON for JSON sources and text for text sources.
3. Dynamic values satisfy the schema and request references resolve.
4. Variant selection changes status/body/schema as a unit.
5. Exact, wildcard, and substring priority is the intended one.
6. Unknown wildcard captures use the intended base, fallback, or 404 behavior.
7. A literal pipe in a capture remains one capture value.

Useful source examples are maintained in documentation/test-schemas.md, documentation/json-schema-faker.md, documentation/schema-interpolation.md, and documentation/wildcard-variants-audit.md.

## Diagnose a mismatch

When a request does not behave as expected, inspect in this order:

1. mockzilla health and the configured URL.
2. Folder slug and the serving URL shape: /api/mock/{folderSlug}/{mockPath...}.
3. HTTP method; matching is method-specific.
4. matchType; wildcard paths must explicitly say wildcard.
5. Exact route priority; a fixed mock can hide a wildcard mock.
6. Query requirements and their string values.
7. Number and order of wildcard captures.
8. Canonical captures versus legacy pipe-delimited key.
9. wildcardRequireMatch and whether a fallback exists.
10. Dynamic fields: valid schema JSON, explicit type, array items, bounded arrays, JSON body type, and useDynamicResponse true.
11. Static fallback body; it is what the server returns when schema generation fails.

Common symptoms:

| Symptom | Likely cause |
| --- | --- |
| /users/test returns the fixed response | Exact matching correctly outranks /users/* |
| /users/123 returns no wildcard variant | The mock is still exact, captures differ, or the variant is not canonical |
| Unknown wildcard path returns base body | No variant matched and wildcardRequireMatch is disabled |
| Unknown wildcard path returns 404 | wildcardRequireMatch is enabled with no matching/fallback variant |
| Dynamic variant returns base-looking JSON | Variant schema failed and its static body was used |
| Dynamic mock returns {} | Schema-only REST fallback was used, or dynamic mode was not enabled |
| Dynamic request returns text/invalid JSON | bodyType is not json, or the schema/template produced an invalid body |
| A schema array is empty or huge | Missing items, or no practical minItems/maxItems bounds |
| A pipe in a user id changes variant matching | Legacy key parsing was used; migrate to captures: ["value|with|pipes"] |

For any CLI error, run:

~~~bash
mockzilla agent-skill
~~~

The command prints the current skill. Human-readable errors end with an Agent guidance line. JSON errors stay machine-readable and contain agentHint: mockzilla agent-skill.

## Completion checklist

- [ ] mockzilla health succeeds against the intended URL.
- [ ] Folder exists and folderSlug resolves to it.
- [ ] matchType is explicit whenever the route is wildcard or substring.
- [ ] Response source is intentional: static, dynamic schema, echo, or variant override.
- [ ] Dynamic schemas are attached through jsonSchema, are valid JSON, and use bodyType json.
- [ ] Schemas have explicit types, required contract fields, array items, and bounded collections.
- [ ] Wildcard variants use canonical captures arrays and an explicit fallback when needed.
- [ ] Exact-over-wildcard-over-substring behavior has been tested with curl.
- [ ] Named variant, unknown capture, fallback/404, query context, and repeated dynamic calls have been tested.
- [ ] mockzilla mocks get <id> --json confirms what the server stored.
