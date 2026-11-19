# OpenAPI Import Flow

Mockzilla provides a high-fidelity OpenAPI (Swagger) import system that converts industry-standard specifications into functional mock environments.

## Import Process

The import flow, implemented in `app/api/import/openapi/route.ts`, follows these stages:

### 1. Specification Parsing
- Supports both **JSON** and **YAML** formats.
- Uses the `yaml` library for robust parsing.
- Extracts metadata from the `info` block to create a corresponding Folder.

### 2. Supported Specification Formats
- **OpenAPI 3.x**: Reads `content[mediaType]` (`selectMediaContent`). Order:
  `application/json`, then any other JSON type (`application/*+json`, `*/*`), then
  `text/*` (stored with `bodyType: 'text'`, no `jsonSchema`). Other types import `{}`.
- **Swagger 2.0**: Reads `responses[code].schema` / `examples` directly.
- **Server path**: `getServerBasePath` takes the path of `servers[0].url` (server
  variables replaced by their `default`) or Swagger `basePath`, and prefixes every
  spec path with it before subfolder mapping. Hosts are ignored.

### 3. Ref Resolution & Safety
Mockzilla uses `@apidevtools/json-schema-ref-parser` with `resolve: { external: false }`:
internal `#/...` refs are dereferenced, external refs (URLs or files) are **never
fetched**, which prevents a spec upload from making the server request arbitrary
hosts (SSRF). `stripUnresolvedRefs` replaces the leftover `$ref` objects under
`paths` with `{}` and the response includes a `warnings` entry with the count.

#### Circular References
Mockzilla is resilient to circular references in specifications:
- **Detection**: Recursive functions (like `limitArrayItems`) track visited objects using a `WeakSet`.
- **Handling**: If a circular reference is detected during response generation, it falls back to a safe, non-recursive object structure.
- **Storage**: The `jsonSchema` is saved using a circular-safe stringifier to prevent database or import failures.

### 4. Path & Endpoint Mapping
- Normalizes paths (e.g., removing trailing slashes).
- Creates mock subfolders from static path prefixes when a path has nested segments:
  - `/v1/users` → subfolder `/v1`, mock path `/users`
  - `/v1/users/{id}` → subfolder `/v1/users`, mock path `/*`
  - `/v1/users/{id}/orders` → subfolder `/v1/users`, mock path `/*/orders`
- Only path segments that are already valid URL-safe subfolder segments are used for subfolders. If a segment contains case-sensitive or symbolic characters, Mockzilla keeps that segment in the relative mock path so the served URL does not change.
- Converts OpenAPI path parameters into Mockzilla wildcards:
  - `/users/{id}` → `/users/*`
  - Sets `matchType: 'wildcard'`.
- Operations without parameters use `matchType: 'exact'`.

### 5. Response Selection
- Analyzes the `responses` object for each operation.
- `selectSuccessResponse`: `200`, then `201`, then the first other `2xx` code, then
  a `2XX` range key (served as `200`).
- Falls back to the `default` response only when no `2xx` key exists; the status code
  is then `200`.
- `selectErrorResponses`: every `4xx`/`5xx` key (ranges `4XX`/`5XX` map to `400`/`500`;
  an exact code wins over a range with the same status) becomes a **sibling mock**
  named `<operation> (<code>)` with the same endpoint, method, and match type, the
  operation's required query rows, plus `__status: "<code>"`. The extra required row
  outscores the success mock, so `?__status=404` selects it. Error mocks have no
  variants and never echo. `default` is not imported as an error.

### 6. Response Body Generation
Mockzilla attempts to create realistic payloads based on the response content:

- **Schema-Driven**: If a `schema` is present, it uses `json-schema-faker` (JSF) and `faker.js` during import to generate a static response body.
  - **Optimization**: Recursively injects `maxItems: 3` into array schemas.
  - **Fallback Logic**: If schema generation fails, a fallback generator creates a clean JSON structure based on property types (e.g., empty strings, zeroes) to avoid artificial warning fields.
- **Example-Driven**: If no `schema` is found but `examples` or a single `example` exists, Mockzilla uses the provided example value as the static response body. This ensures high-fidelity mocks even when schemas are missing.
- **Pre-generation**: Generating static bodies during import makes the dashboard UI significantly faster by avoiding heavy processing on every page load.

### 7. Wildcard Variants
For path parameters converted to wildcards:
- A fallback variant (`isFallback: true`, legacy key `*`) is created.
- This variant stores the generated/fallback response body and status code.
- Because a selected variant replaces the base response and disables echo, a
  wildcard write operation without a response schema returns the fallback's `{}`
  instead of echoing the request body.

### 8. Feature Defaults
- **Write Methods**: For `POST`, `PUT`, and `PATCH` methods without a response schema, `echoRequestBody: true` is enabled by default.
- **Query Parameters**: path-level and operation parameters are merged
  (`mergeParameters`; the operation wins on the same `in` + `name`). Only
  `in: query` parameters with `required: true` become query rows, with value `*`
  (key must be present, any value). Optional parameters are not match filters.
- **Dynamic mode**: `jsonSchema` is stored but `useDynamicResponse` stays `false`,
  so the pre-generated body is served on every request until dynamic mode is
  enabled. The stored schema is the original (not the `maxItems: 3` copy), so
  enable it only after setting array limits.
- **Re-import**: the folder is upserted by slug (from `info.title`) and subfolders
  by `(folderId, mainPath)`. Mocks are matched by `getImportIdentity`:
  `method + endpoint + mockFolderId + __status`. A match is **updated** (name, status,
  response, matchType, bodyType, queryParams, jsonSchema, echoRequestBody, variants);
  `enabled`, `delay`, `meta` (proxy), and `useDynamicResponse` are kept, and when the
  mock is dynamic and the spec has no schema, the stored `jsonSchema` is kept too.
  `mergeImportedVariants` keeps non-fallback variants and replaces the fallback
  (keeping its schema/dynamic mode if the user made it dynamic). Mocks for removed
  operations are not deleted. Two operations with the same identity in one spec:
  the first wins, the rest are counted in `skippedCount`.
- **Response**: `{ success, folderId, importedCount, updatedCount, skippedCount,
  importedSubfoldersCount, warnings }`.

## Conversion Strategy Summary

| Feature | Mockzilla Implementation |
| :--- | :--- |
| **Nested Paths** | Static path prefixes become mock subfolders; mocks store relative paths with `mockFolderId` |
| **Path Params** | `*` Wildcard + fallback variant |
| **JSON Schema** | Pre-generated static body + stored schema (dynamic mode off) |
| **Array Items** | Limited to 3 for performance |
| **Errors** | Handled via basic type fallback (no `_warning` fields) |
| **Error responses** | Sibling mocks selected with `?__status=<code>` |
| **External `$ref`** | Not fetched; replaced with `{}` and reported in `warnings` |
| **Auth/Headers** | Preserved in the original spec reference |
