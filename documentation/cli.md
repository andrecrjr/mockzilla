# Mockzilla CLI

The `mockzilla` command is a dependency-free Node.js client for managing data on a running Mockzilla server. It is distributed from this GitHub repository and is not published to the npm registry as `mockzilla`.

## Install and connect

Node.js 18.18 or newer is required. Run once with `npx`, or install globally with Bun or npm:

```bash
npx --yes github:andrecrjr/mockzilla health
bun add --global github:andrecrjr/mockzilla
# or
npm install --global github:andrecrjr/mockzilla
```

Configure the server URL:

```bash
mockzilla config set --url http://localhost:36666
mockzilla health
mockzilla config show
```

The default URL is `http://localhost:36666`. Precedence is `--url`, `MOCKZILLA_URL`, saved config, then the default. Use `--json` for machine-readable output. `mockzilla agent-skill` prints the CLI-specific agent instructions.

Verify a global installation and its bundled instructions with:

```bash
mockzilla --version
mockzilla agent-skill
```

Check the latest published release with `mockzilla update check`. It compares the installed version with GitHub's latest release and prints global Bun/npm install commands if a newer release exists. The check is opt-in, reports published releases rather than unreleased branch commits, and does not update the CLI automatically. Re-run the install command to upgrade.

## Commands

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

`folders get` accepts a folder slug; update and delete accept an ID. `mocks list` supports `--folder-id` or `--folder-slug`, `--mock-folder-id`, `--query`, `--page`, and `--limit`. Use `--mock-folder-id root` for root-level mocks. `subfolders list` requires `--folder-id` or `--folder-slug`, accepts `--parent-id root|<id>`, and supports `--all`. Create and update subfolders accept `--name`, `--path`, and `--parent-id` where applicable. Deleting a folder, subfolder, or mock requires confirmation; pass `--yes` for automation.

## Create mocks

Pass a complete mock definition using `--file`, or read it from stdin with `--file -`:

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

```bash
mockzilla mocks create --file mock.json --json
mockzilla mocks update <mock-id> --file changes.json --json
mockzilla mocks get <mock-id> --json
mockzilla mocks list --folder-slug demo --json
mockzilla mocks delete <mock-id> --yes --json
```

Common flags can override fields in the file: `--name`, `--path`, `--method`, `--status-code`, `--folder-id`, `--folder-slug`, `--mock-folder-id`, `--response`, `--response-file`, `--match-type`, `--body-type`, `--json-schema`, `--json-schema-file`, `--variants-file`, `--query-params`, `--query-params-file`, `--enabled`, `--disabled`, `--dynamic`, `--echo-request-body`, and `--wildcard-require-match` / `--no-require-match`.

To place a mock inside a subfolder, pass its ID as `mockFolderId` in the JSON or use `--mock-folder-id`. The mock path is relative to that subfolder. For nested folders:

```bash
mockzilla subfolders create --folder-slug demo --name Users --path users --json
mockzilla subfolders create --folder-slug demo --parent-id <users-id> \
  --name Details --path details --json
mockzilla subfolders list --folder-slug demo --all --json
mockzilla mocks create --file mock.json --mock-folder-id <details-id> --json
mockzilla mocks list --folder-slug demo --mock-folder-id <details-id> --json
```

The server supports multi-segment subfolder paths and creates missing ancestors. `--parent-id root` places a subfolder at the top level. A subfolder can be deleted only after its child subfolders and mocks are removed.

## Dynamic responses and variants

Dynamic responses use a JSON Schema. Store the raw schema object in a separate file and attach it on create:

```bash
mockzilla mocks create --file mock.json \
  --json-schema-file user.schema.json --dynamic --json
```

Set `useDynamicResponse: true` and `bodyType: "json"`. Keep `response` as a valid static fallback; a schema-only create gets `{}` as its fallback. Templates such as `{{$.params.[0]}}`, `{{$.query.page}}`, `{{$.headers.[x-trace-id]}}`, and `{{$.body.name}}` read request data during response generation.

Wildcard paths require `matchType: "wildcard"`; an asterisk in an exact path is literal. Variants use ordered `captures` arrays and an optional `isFallback: true` catch-all. Set `wildcardRequireMatch: true` to return 404 when no variant matches. The selected variant replaces the base response configuration. See [routing and matching](../content/docs/reference/routing-and-matching.mdx), [dynamic wildcard mocks](../content/docs/guides/dynamic-wildcard-mocks.mdx), [schema interpolation](schema-interpolation.md), and [wildcard variants](wildcard-variants-audit.md) for server semantics.

## Proxy and record

`mocks create|update` accept `--proxy-url`, `--proxy-headers` or `--proxy-headers-file`, `--proxy-params` or `--proxy-params-file`, `--no-forward-headers`, and `--clear-proxy`. These options update a partial proxy configuration while preserving unrelated mock metadata.

Use file options for credentials so they stay out of shell history. Proxy credentials are stored with the mock, and CLI output is not redacted. Transport-managed headers such as `Host`, `Content-Length`, and `Connection` are rejected.

## Import and export

Export folders, subfolders, and mocks to a JSON file, then import a file in the supported export format or legacy groups/rules format:

```bash
mockzilla export --output backup.json
mockzilla import --file backup.json --json
```

Import adds mocks, so importing the same backup repeatedly can create duplicates. Review the target server before repeating an import.

OpenAPI 3.x and Swagger 2.0 specs can be imported from JSON or YAML. The server creates or updates a folder from the spec title and creates mocks and static subfolders from its operations:

```bash
mockzilla openapi import --file openapi.yaml --json
```

Review returned warnings and counts, then inspect the created records with `folders` and `mocks`. Re-import updates operations with matching identity and preserves selected user settings. See [OpenAPI import](openapi-import.md) for conversion behavior.

## Test a mock

The CLI does not have a non-mutating match preview. Send a real request to the serving route to exercise matching and response generation:

```bash
mockzilla health
mockzilla mocks get <mock-id> --json
curl -i http://localhost:36666/api/mock/demo/health
curl -i 'http://localhost:36666/api/mock/demo/users/42?page=2'
```

For dynamic responses, call twice and verify generated fields vary while request-derived fields remain stable. For wildcard variants, try a known capture and an unknown capture. For subfolder mocks, include the subfolder path after the top-level folder slug.

The CLI manages folders, subfolders, mocks, imports, and exports. It does not expose workflow/scenario state, request-log tracing, or the MCP non-mutating preview operation.
