# OpenAPI Import Flow

Mockzilla provides a high-fidelity OpenAPI (Swagger) import system that converts industry-standard specifications into functional mock environments.

## Import Process

The import flow, implemented in `app/api/import/openapi/route.ts`, follows these stages:

### 1. Specification Parsing
- Supports both **JSON** and **YAML** formats.
- Uses the `yaml` library for robust parsing.
- Extracts metadata from the `info` block to create a corresponding Folder.

### 2. Path & Endpoint Mapping
- Normalizes paths (e.g., removing trailing slashes).
- Converts OpenAPI path parameters into Mockzilla wildcards:
  - `/users/{id}` → `/users/*`
  - Sets `matchType: 'wildcard'`.
- Operations without parameters use `matchType: 'exact'`.

### 3. Response Selection
- Analyzes the `responses` object for each operation.
- Prioritizes successful responses:
  1. Specific `200` or `201` codes.
  2. First available `2xx` response.
  3. Falls back to the `default` response if no `2xx` is found.

### 4. Response Body Generation
Mockzilla attempts to create realistic payloads based on the response content:

- **Schema-Driven**: If a `schema` is present, it uses `json-schema-faker` (JSF) and `faker.js` during import to generate a static response body.
  - **Optimization**: Recursively injects `maxItems: 3` into array schemas.
  - **Fallback Logic**: If schema generation fails, a fallback generator creates a clean JSON structure based on property types (e.g., empty strings, zeroes) to avoid artificial warning fields.
- **Example-Driven**: If no `schema` is found but `examples` or a single `example` exists, Mockzilla uses the provided example value as the static response body. This ensures high-fidelity mocks even when schemas are missing.
- **Pre-generation**: Generating static bodies during import makes the dashboard UI significantly faster by avoiding heavy processing on every page load.

### 5. Wildcard Variants
For path parameters converted to wildcards:
- A default catch-all variant with key `*` is created.
- This variant stores the generated/fallback response body and status code.

### 6. Feature Defaults
- **Write Methods**: For `POST`, `PUT`, and `PATCH` methods without a response schema, `echoRequestBody: true` is enabled by default.
- **Query Parameters**: Extracts default values or examples from the `parameters` block to populate Mockzilla's query parameter matching.

## Conversion Strategy Summary

| Feature | Mockzilla Implementation |
| :--- | :--- |
| **Path Params** | `*` Wildcard + Variant with key `*` |
| **JSON Schema** | Pre-generated static body + stored Schema reference |
| **Array Items** | Limited to 3 for performance |
| **Errors** | Handled via basic type fallback (no `_warning` fields) |
| **Auth/Headers** | Preserved in the original spec reference |
