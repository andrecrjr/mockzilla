---
name: mockzilla-cli
description: Use the Mockzilla terminal client to configure a server, inspect and manage folders, subfolders and mocks, import data or OpenAPI specs, check for CLI updates, and verify served responses.
---

# Mockzilla CLI Playbook

Use this skill when the user asks to work with Mockzilla through the `mockzilla` command line or in a terminal-only workflow. Treat it as an operating guide: inspect first, make a focused change, then verify persisted configuration and the live response.

This is a CLI workflow. Use `mockzilla` for configuration and data changes, and `curl` for a real serving request. Do not replace the CLI steps with MCP calls. If the user requests an operation the CLI and its documented REST endpoints do not expose, say so plainly.

## Standard workflow

1. **Connect.** Run `mockzilla health`. If the server URL is wrong, configure it or set `MOCKZILLA_URL`.
2. **Inspect.** List the target folder and mocks before creating anything. Reuse matching records where appropriate; repeated creates and data imports can add duplicates.
3. **Plan the route.** Decide whether the endpoint is exact, wildcard, or intentionally broad substring matching. Decide separately whether query parameters filter the mock or only supply request data.
4. **Prepare the payload.** Put full mock definitions, schemas, variants, query maps, and credentials in files. Use stdin for generated payloads. Avoid complex shell-escaped JSON.
5. **Apply the smallest change.** Use `mocks update <id>` for an existing mock. Use `--json` when capturing IDs or passing output to another tool.
6. **Verify stored state.** Read the changed record with `mocks get`, or list its folder/subfolder and confirm the new record is there.
7. **Exercise the real route.** Send the actual method, path, query, headers, and body with `curl`. Test the intended match plus the relevant fallback or mismatch case.

Finish by reporting what changed, the IDs or URLs that matter, and what request you used to verify it. Do not describe a stored mock as tested if only `mocks get` was run.

## Install and update

The CLI is a dependency-free Node.js client and requires Node.js 18.18 or newer. The package is installed from GitHub, not from the npm registry as `mockzilla`.

Run one command without a global install:

```bash
npx --yes github:andrecrjr/mockzilla health
```

Install globally with Bun or npm:

```bash
bun add --global github:andrecrjr/mockzilla
npm install --global github:andrecrjr/mockzilla
```

Check the current CLI and latest published release:

```bash
mockzilla --version
mockzilla update check
```

The check compares the installed package version with GitHub's latest release. It runs only when requested and reports published releases, not unreleased commits on a development branch. If an update is available, rerun the printed Bun or npm global-install command. The CLI does not poll in the background or update itself.

## Connect and choose a server

```bash
mockzilla config set --url http://localhost:36666
mockzilla health
mockzilla config show
```

The default is `http://localhost:36666`. URL precedence is `--url`, `MOCKZILLA_URL`, saved configuration, then the default. An explicit URL applies to one command:

```bash
mockzilla --url http://localhost:36666 folders list --json
```

Use `--json` for machine-readable output. A list response may contain a `data` array and pagination metadata. Human output is a compact table; JSON preserves the API response. Errors in JSON mode include an `agentHint` field. Run `mockzilla agent-skill` to print the instructions packaged with the installed CLI.

## Command reference

```text
mockzilla config set --url <url>
mockzilla config show|clear
mockzilla health
mockzilla update check
mockzilla folders list|get|create|update|delete
mockzilla subfolders list|get|create|update|delete
mockzilla mocks list|get|create|update|delete
mockzilla export [--output <file>]
mockzilla import --file <json-file|->
mockzilla openapi import --file <json-or-yaml-file|->
mockzilla agent-skill
```

Folder `get` takes a slug; folder `update` and `delete` take an ID. Subfolder `get`, `update`, and `delete` take a subfolder ID. Mock `get`, `update`, and `delete` take a mock ID. Every delete asks for confirmation in a terminal and requires `--yes` in a non-interactive script.

### Inspect existing data

```bash
mockzilla folders list --json
mockzilla folders get demo --json
mockzilla mocks list --folder-slug demo --json
mockzilla mocks list --folder-slug demo --mock-folder-id root --json
mockzilla mocks get <mock-id> --json
```

`mocks list` accepts `--folder-id` or `--folder-slug`, `--mock-folder-id`, `--query`, `--page`, and `--limit`. `--mock-folder-id root` means mocks at the top level of that folder. A subfolder ID selects its mocks.

## Create or edit folders, subfolders, and mocks

Create a top-level folder before adding mocks:

```bash
mockzilla folders create --name Demo --slug demo --json
mockzilla folders update <folder-id> --description 'Local test fixtures' --json
```

Create nested subfolders. `--parent-id root` means top level; omitting `--parent-id` on create also creates a root subfolder.

```bash
mockzilla subfolders create --folder-slug demo \
  --name Users --path users --json
mockzilla subfolders create --folder-slug demo --parent-id <users-id> \
  --name Details --path details --json
mockzilla subfolders list --folder-slug demo --all --json
mockzilla subfolders update <details-id> --parent-id root --json
```

Subfolder `--path` may contain several segments. The server resolves existing ancestors and creates missing segments. It is the effective path within the top-level folder. A subfolder can be deleted only after its child subfolders and mocks have been removed; a failed delete returns a conflict.

Use a JSON file for the full mock payload. `folderSlug` is resolved to a folder ID on create. The mock path is relative to the selected subfolder.

```json
{
  "name": "Health",
  "path": "/health",
  "method": "GET",
  "folderSlug": "demo",
  "statusCode": 200,
  "bodyType": "json",
  "response": "{\"ok\":true}"
}
```

```bash
mockzilla mocks create --file mock.json --json
mockzilla mocks update <mock-id> --file changes.json --json
mockzilla mocks create --file mock.json --mock-folder-id <details-id> --json
mockzilla mocks list --folder-slug demo --mock-folder-id <details-id> --json
```

For inline changes, flags override corresponding fields from `--file`. Common flags include `--name`, `--path`, `--method`, `--status-code`, `--folder-id`, `--folder-slug`, `--mock-folder-id`, `--response`, `--response-file`, `--body-type`, `--match-type`, `--json-schema`, `--json-schema-file`, `--variants-file`, `--query-params`, `--query-params-file`, `--enabled`, `--disabled`, `--dynamic`, `--echo-request-body`, `--wildcard-require-match`, and `--no-require-match`.

`--file -` reads JSON from stdin. The CLI accepts one complete JSON object for a mock. Create defaults are status `200`, `matchType: "exact"`, and `bodyType: "json"`. The mock API stores `response` as a string. For updates, the CLI cannot change the top-level folder; use `mockFolderId` only to place the mock in a subfolder of that same folder.

Example generated payload:

```bash
mockzilla mocks create --file - --json <<'JSON'
{
  "name": "Echo request",
  "path": "/echo",
  "method": "POST",
  "folderSlug": "demo",
  "response": "{}",
  "echoRequestBody": true
}
JSON
```

## Pick matching rules deliberately

`exact` is the default. An asterisk in a path is literal until `matchType: "wildcard"` is set. Use `substring` only when a deliberately broad path-fragment match is wanted.

| Type | Example | Meaning |
| --- | --- | --- |
| `exact` | `/users/test` | The full request path must match. |
| `wildcard` | `/users/*/orders/*` | Asterisks capture path values in order. |
| `substring` | `/users` | The path may contain this fragment. |

Matching uses a score: exact/wildcard/substring contribute 300/200/100; each required query parameter contributes 10; each configured query value without `*` contributes 1; endpoint length is also added. Ties prefer a non-proxy mock, then the newest mock. This means a wildcard with many query requirements can outrank an exact path. Add `queryParams` only when those values should constrain which mock wins.

Path wildcards and search parameters are separate:

- `/users/*` captures a path value, available as `{{$.params.[0]}}`.
- `?status=active` is request data, available as `{{$.query.status}}`.
- `queryParams: { "status": "*" }` requires `status` to be present, while accepting any value. Parameter names are exact; configured values support `*` glob matching.
- A mock with no required query parameters can match requests with any query string.

Wildcard `*` can span `/` and matching is anchored at the end of the path. Use the full route prefix: `/shop/products/*`, not `/products/*`, if the API path includes `/shop`.

An exact mock can win before a wildcard mock's variants are considered. If `/users/test` is both an exact route and a capture for `/users/*`, inspect both records when diagnosing which response was selected.

## Configure static and dynamic responses

### Static JSON or text

Use static output when tests need a deterministic body. JSON response content must parse as JSON; text bodies may contain arbitrary text. Keep the response string in the file to avoid shell escaping.

### Dynamic response from a schema

Attach the schema to the mock itself. Save the raw JSON Schema object in `user.schema.json`; the CLI sends its text in `jsonSchema`.

```json
{
  "name": "Generated user",
  "path": "/users/*",
  "method": "GET",
  "folderSlug": "demo",
  "matchType": "wildcard",
  "response": "{}",
  "bodyType": "json",
  "useDynamicResponse": true
}
```

```json
{
  "type": "object",
  "properties": {
    "id": { "const": "{{$.params.[0]}}" },
    "email": { "type": "string", "format": "email" },
    "active": { "type": "boolean" },
    "tags": { "type": "array", "items": { "type": "string" }, "maxItems": 3 }
  },
  "required": ["id", "email", "active", "tags"]
}
```

```bash
mockzilla mocks create --file mock.json \
  --json-schema-file user.schema.json --dynamic --json
mockzilla mocks get <mock-id> --json
```

Dynamic mode requires `bodyType: "json"`. Keep a valid static `response` as fallback; the CLI supplies `{}` only when creating a schema-backed mock with no response. Use `required`, explicit array `items`, and bounded `maxItems` for reliable, compact test data.

For request-derived fields, use type-preserving templates such as `{{$.params.[0]}}`, `{{$.query.page}}`, `{{$.headers.[x-trace-id]}}`, and `{{$.body.name}}`. Use Handlebars blocks and helpers when a response needs loops or conditionals. Read the current server's interpolation guide before relying on advanced template syntax.

### Wildcard variants

Variants are chosen after the mock itself wins route matching. Store one capture value per `*`, in order. Use `isFallback: true` for a catch-all; do not use partial capture arrays as fallbacks.

```json
{
  "captures": ["42"],
  "isFallback": false,
  "body": "{\"id\":42,\"name\":\"Ada\"}",
  "statusCode": 200,
  "bodyType": "json"
}
```

```json
{
  "isFallback": true,
  "body": "{\"id\":0,\"name\":\"Unknown\"}",
  "statusCode": 404,
  "bodyType": "json"
}
```

Put large variant arrays in `variants.json` and pass `--variants-file variants.json`. Dynamic variants need their own JSON schema, `useDynamicResponse: true`, JSON body type, and a valid body fallback. A selected variant replaces the base body, status, body type, schema, dynamic mode, and echo behavior. Set `wildcardRequireMatch: true` when an unmatched capture should return 404 instead of the base response.

### Echo the request body

Set `echoRequestBody: true` for a direct POST/PUT/PATCH echo mock. A selected wildcard variant overrides base echo settings; test that case separately.

## Proxy and record

Proxy flags on `mocks create|update` set a partial proxy configuration; updating the target does not clear unrelated metadata:

```bash
mockzilla mocks update <mock-id> --proxy-url https://api.example.com/v1/users
mockzilla mocks update <mock-id> --proxy-headers-file headers.json
mockzilla mocks update <mock-id> --proxy-params '{"api_key":"test"}'
mockzilla mocks update <mock-id> --no-forward-headers
mockzilla mocks update <mock-id> --clear-proxy
```

`--proxy-headers` and `--proxy-params` replace their stored maps. Use the `-file` options for credentials so secrets stay out of shell history. Proxy credentials are stored in the mock and CLI output is not redacted. Transport-managed headers such as `Host`, `Content-Length`, and `Connection` are rejected. A `*` in the proxy URL is replaced with wildcard captures.

Proxy & Record saves upstream responses as exact mocks named `Recorded: …`. A saved response only answers its exact path and query. Delete the recorded mock to fetch from the upstream target again.

## Import, export, and OpenAPI

Export folders, subfolders, and mocks before a larger change:

```bash
mockzilla export --output backup.json
```

Import a Mockzilla export or legacy groups/rules file:

```bash
mockzilla import --file backup.json --json
```

Import adds mock records. Re-importing the same backup may duplicate mocks, so inspect the target first and do not repeat a failed-looking import before checking the result.

Import OpenAPI 3.x or Swagger 2.0 JSON/YAML:

```bash
mockzilla openapi import --file openapi.yaml --json
```

The server creates or updates the folder based on the spec title, creates subfolders for safe static path prefixes, converts path parameters to wildcards, and builds response bodies from examples or schemas. It returns counts and warnings; inspect them, then list the created folder and mocks. External `$ref` targets are not fetched and are reported as warnings. Re-import updates matching operations and preserves selected user settings.

## Verify the actual HTTP response

The CLI has no non-mutating `preview` command. A real request verifies the selected mock, variant, delay, and dynamic response together. Use the same top-level folder and effective subfolder path as the client will call.

GET example:

```bash
mockzilla health
mockzilla mocks get <mock-id> --json
curl -i http://localhost:36666/api/mock/demo/health
curl -i 'http://localhost:36666/api/mock/demo/users/42?page=2'
```

POST example:

```bash
curl -i -X POST http://localhost:36666/api/mock/demo/echo \
  -H 'content-type: application/json' \
  --data '{"name":"Ada"}'
```

For dynamic responses, call twice: generated values should vary, while constants and request references should remain stable. For a wildcard route, request a named capture, a second capture if the path has two `*` segments, and an unknown capture. If query conditions exist, try both a matching and a missing/different value.

## Diagnose a mismatch

| Symptom | Check |
| --- | --- |
| 404 / no mock found | `health`; `mocks list`; method; effective folder+subfolder path; enabled status; required query params. |
| Another response wins | Exact/wildcard/substring score, query specificity, proxy tie-break, and newer mocks. Inspect all candidates in that folder. |
| Base body appears | Confirm `matchType: "wildcard"`, exact ordered `captures`, and that an exact route did not win first. |
| Wrong wildcard variant | Capture count and order; use `isFallback: true` for catch-all. |
| Schema output falls back | Confirm `useDynamicResponse`, valid `jsonSchema`, `bodyType: "json"`, and a valid static response fallback. |
| Import reports warnings | Read the returned warning list; unresolved external refs are deliberately not downloaded. |
| CLI API request fails | Read the error and `agentHint`; recheck `mockzilla health`, selected server URL, and file JSON. |

The CLI does not expose workflow/scenario state, request-log tracing, or the MCP-only non-mutating matcher preview. Do not claim those operations were performed through the CLI.

## Server documentation

Read `/llms.txt` from the configured Mockzilla server for its current documentation index. Fetch only the relevant page listed there, such as `/llms/docs/reference/routing-and-matching.txt`, `/llms/docs/guides/dynamic-wildcard-mocks.txt`, or `/llms/docs/reference/dynamic-interpolation.txt`. Server behavior documentation takes precedence over assumptions based on a different CLI or server version.
