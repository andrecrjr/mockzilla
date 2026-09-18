# Mockzilla CLI

The `mockzilla` CLI is a dependency-free Node.js client for the Mockzilla REST API. It is distributed from the repository so agents and developers can use it without installing the dashboard dependencies.

## Install and connect

Node.js 18.18 or newer is required.

```bash
npx --yes github:andrecrjr/mockzilla health
pnpm dlx github:andrecrjr/mockzilla health
pnpm add --global github:andrecrjr/mockzilla
```

Set the default server URL once:

```bash
mockzilla config set --url http://localhost:36666
mockzilla config show
mockzilla config clear
```

The URL precedence is `--url`, `MOCKZILLA_URL`, the saved profile, then `http://localhost:36666`. Use `--json` for automation. Human errors include a hint to run `mockzilla agent-skill`; JSON errors include an `agentHint` property.

## Commands

```text
mockzilla health
mockzilla folders list [--query <text>] [--page <n>] [--limit <n>]
mockzilla folders get <slug>
mockzilla folders create --name <name> [--slug <slug>] [--description <text>]
mockzilla folders update <id> [--name <name>] [--slug <slug>] [--description <text>]
mockzilla folders delete <id> --yes
mockzilla mocks list [--folder-id <id>|--folder-slug <slug>] [--query <text>]
mockzilla mocks get <id>
mockzilla mocks create --file <path|->
mockzilla mocks update <id> --file <path|->
mockzilla mocks delete <id> --yes
mockzilla agent-skill
```

`--file -` reads one JSON object from stdin. Common mock fields can also be overridden with flags: `--name`, `--path`, `--method`, `--status-code`, `--folder-id`, `--folder-slug`, `--response`, `--response-file`, `--match-type`, `--body-type`, `--json-schema`, `--json-schema-file`, `--variants-file`, `--enabled`, `--dynamic`, `--echo-request-body`, `--wildcard-require-match`, and `--no-require-match`.

## Mock payloads

Create a static exact mock:

```json
{
  "name": "Health",
  "path": "/health",
  "method": "GET",
  "folderSlug": "demo",
  "statusCode": 200,
  "response": "{\"ok\":true}",
  "matchType": "exact",
  "bodyType": "json"
}
```

For dynamic responses, provide `jsonSchema` as a JSON string and set `useDynamicResponse` to `true`. The CLI supplies `{}` as the required static fallback when creating a schema-only mock.

Wildcard paths use `*`, and variants use canonical `captures` arrays in wildcard order:

```json
{
  "name": "User",
  "path": "/users/*/orders/*",
  "method": "GET",
  "folderSlug": "demo",
  "matchType": "wildcard",
  "response": "{}",
  "variants": [
    {
      "captures": ["alice", "101"],
      "statusCode": 200,
      "bodyType": "json",
      "body": "{\"user\":\"alice\",\"order\":101}"
    }
  ]
}
```

Use `isFallback: true` for an explicit catch-all variant. Legacy `key: "*"` remains accepted by the server and is normalized on read.

## Response and route testing

The complete terminal workflow is rendered by `mockzilla agent-skill`. Its behavior rules are important when a path contains `*`:

- `exact` is the default. A wildcard-looking path remains exact unless `matchType: "wildcard"` is set.
- `exact` wins over `wildcard`, and `wildcard` wins over `substring`; an exact `/users/test` mock therefore wins over `/users/*`.
- Dynamic responses attach a JSON Schema through `jsonSchema` plus `useDynamicResponse: true`; `bodyType` must be `json` and `response` is the generation fallback.
- Wildcard variants use ordered `captures` arrays. Use `isFallback: true` for an explicit fallback, and use `wildcardRequireMatch` when an unknown capture must return 404.
- A selected variant overrides the base response source, status, body type, schema, dynamic mode, and echo behavior.

Query parameters are matched separately from path wildcards. Parameter names are exact, but values support `*` glob matching: `queryParams: { "status": "*" }` matches `?status=active`, `?status=banned`, or any other present status value. The parameter must still be present, and an exact value such as `status=active` wins over the wildcard mock when both match. Values are available to Dynamic Response templates as `{{$.query.name}}`.

For a schema file and a real serving request:

```bash
mockzilla mocks create --file mock.json --json-schema-file schema.json --dynamic --json
mockzilla mocks get <id> --json
curl -sS -D - http://localhost:36666/api/mock/demo/users/123
```

The skill also documents Faker keywords, request interpolation (`{$.params.[0]}`, query, headers, and body), schema test matrices, fallback behavior, and mismatch diagnosis. The maintained schema references are [test schemas](test-schemas.md), [JSON Schema Faker](json-schema-faker.md), [schema interpolation](schema-interpolation.md), and [wildcard variants](wildcard-variants-audit.md).

## Agent skill

`mockzilla agent-skill` prints `.agent/skills/mockzilla-cli/SKILL.md` to stdout. This lets an agent load the exact terminal workflow from a Git checkout without writing into its skill directory. The same skill is packaged with the CLI install.
