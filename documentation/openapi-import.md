# OpenAPI Import Flow

Mockzilla provides a high-fidelity OpenAPI (Swagger) import system that converts industry-standard specifications into functional mock environments.

## Import Process

The import flow, implemented in `app/api/import/openapi/route.ts`, follows these stages:

### 1. Specification Parsing
- Supports both **JSON** and **YAML** formats.
- Uses the `yaml` library for robust parsing.
- Extracts metadata from the `info` block to create a corresponding Folder.

### 2. Supported Specification Formats
- **OpenAPI 3.x**: Full support for `content['application/json'].schema`.
- **Swagger 2.0**: Full support for schemas defined directly on the response object (`responses[code].schema`).

### 3. Ref Resolution & Safety
Mockzilla uses `@apidevtools/json-schema-ref-parser` to resolve all internal and external `$ref` nodes during import.

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
- Only path segments that are already valid subfolder slugs are used for subfolders. If a segment contains case-sensitive or symbolic characters, Mockzilla keeps that segment in the relative mock path so the served URL does not change.
- Converts OpenAPI path parameters into Mockzilla wildcards:
  - `/users/{id}` → `/users/*`
  - Sets `matchType: 'wildcard'`.
- Operations without parameters use `matchType: 'exact'`.

### 5. Response Selection
- Analyzes the `responses` object for each operation.
- Prioritizes successful responses:
  1. Specific `200` or `201` codes.
  2. First available `2xx` response.
  3. Falls back to the `default` response if no `2xx` is found.

### 6. Response Body Generation
Mockzilla attempts to create realistic payloads based on the response content:

- **Schema-Driven**: If a `schema` is present, it uses `json-schema-faker` (JSF) and `faker.js` during import to generate a static response body.
  - **Optimization**: Recursively injects `maxItems: 3` into array schemas.
  - **Fallback Logic**: If schema generation fails, a fallback generator creates a clean JSON structure based on property types (e.g., empty strings, zeroes) to avoid artificial warning fields.
- **Example-Driven**: If no `schema` is found but `examples` or a single `example` exists, Mockzilla uses the provided example value as the static response body. This ensures high-fidelity mocks even when schemas are missing.
- **Pre-generation**: Generating static bodies during import makes the dashboard UI significantly faster by avoiding heavy processing on every page load.

### 7. Wildcard Variants
For path parameters converted to wildcards:
- A default catch-all variant with key `*` is created.
- This variant stores the generated/fallback response body and status code.

### 8. Feature Defaults
- **Write Methods**: For `POST`, `PUT`, and `PATCH` methods without a response schema, `echoRequestBody: true` is enabled by default.
- **Query Parameters**: Extracts default values or examples from the `parameters` block to populate Mockzilla's query parameter matching.

## Conversion Strategy Summary

| Feature | Mockzilla Implementation |
| :--- | :--- |
| **Nested Paths** | Static path prefixes become mock subfolders; mocks store relative paths with `mockFolderId` |
| **Path Params** | `*` Wildcard + Variant with key `*` |
| **JSON Schema** | Pre-generated static body + stored Schema reference |
| **Array Items** | Limited to 3 for performance |
| **Errors** | Handled via basic type fallback (no `_warning` fields) |
| **Auth/Headers** | Preserved in the original spec reference |
