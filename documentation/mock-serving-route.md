# Mock Serving Route

The mock serving route is the core endpoint that delivers configured mock responses to clients.

## Entry Point

**File:** `app/api/mock/[...path]/route.ts`

## URL Structure

The route uses Next.js catch-all segments to match mock requests:

```
/api/mock/{folderPath...}/{mockPath...}
```

### Examples

- `/api/mock/users/` - Root endpoint for the `/users` folder (path: "/")
- `/api/mock/app/test/list` - Matches mock with path "/list" in the `/app/test` folder
- `/api/mock/users/123/profile` - Matches mock with path "/123/profile" in the `/users` folder
- `/api/mock/users/v1/accounts/123` - Can match a mock stored as `/123` inside a subfolder whose path is `/v1/accounts`

## Path Resolution

### Segment Parsing

The route extracts path segments from the URL:

1. **Longest matching folder path prefix**: Required
2. **Remaining segments**: Mock path (optional, defaults to "/" if not provided)

```typescript
Mockzilla resolves the incoming path against all known top-level folder paths and uses the longest matching prefix as the folder namespace. The remaining suffix becomes the mock path.
```

### Root Path Support

When only the folder path is provided (e.g., `/api/mock/users/` or `/api/mock/app/test/`), the route treats it as a root path `/`. This allows creating root-level endpoints for folders.

**Valid URL patterns:**
- `/api/mock/users/` → folder: `/users`, path: "/"
- `/api/mock/users` → folder: `/users`, path: "/" (trailing slash optional)
- `/api/mock/app/test/list` → folder: `/app/test`, path: "/list"

## Matching Logic

The route fetches all enabled mocks for the folder and method, then evaluates them using the mock matcher:

1. **Resolve subfolders**: Load mock subfolders for the top-level folder.
2. **Build candidates**: All mocks with their match types, query params, and effective paths.
3. **Find best match**: Uses `findBestMatch()` to score and rank candidates.
4. **Select variant**: For wildcard mocks, selects the appropriate variant if configured.

For mocks in subfolders, the matcher uses the subfolder's canonical `path` plus the mock's relative path. The subfolder path is derived from the nested internal segment hierarchy, with `mainPath` kept as a compatibility field.

### Endpoint Paths and Search Params

Stored mock paths are endpoint paths only. Search params are extracted from the incoming request URL and matched against the mock's structured `queryParams` field. The web UI keeps URL-style endpoint input visible in the path field, such as `/users?status=active`, while also copying those search params into Advanced Options. Advanced Options query-param edits also update the visible endpoint path and preview. On save, the frontend submits the API-safe path and structured `queryParams` separately. Create and update APIs reject persisted mock paths that include `?` because storage keeps endpoint paths separate from the query-param matcher.

Wildcard captures are extracted from the normalized path only. For example, `/users/123?status=active` matched against `/users/*` exposes `input.params.0 = "123"` and `input.query.status = "active"`; the query string is not included in the wildcard capture.

#### Variant Selection for Wildcards

For mocks using `matchType: 'wildcard'`, Mockzilla supports multiple response variants based on the captured wildcard value:

1. **Extract Key**: The captured wildcard segment(s) are joined by `|` to form a key (e.g., `/users/123` matches `/users/*` with key `123`).
2. **Match Variant**: 
   - Tries to find a variant with an exact match for the key.
   - Falls back to a variant with key `*` (catch-all) if available.
3. **Override Response**: If a variant is matched, its `body`, `statusCode`, and `bodyType` override the default mock configuration. 
   - **Note**: When a variant is matched, `useDynamicResponse` is automatically disabled for that request to ensure the variant's static body is returned.

### Proxy & Record

If a matched mock has `meta.proxyTargetUrl`, the route enters **Proxy & Record** mode for that mock. Unmatched requests still return `404`. See [Proxy & Record Mode](./proxy-and-record.md) for full details.

**Match types supported:**
- `exact`: Path must match exactly
- `wildcard`: Use `*` as wildcard (e.g., `/users/*`)
- `substring`: Path contains the endpoint

## Response Building

Once a match is found, the route builds the response based on the mock configuration:

### Static Response
Returns the configured `response` body with the specified `statusCode` and content type (`json` or `text`).

### Echo Request Body
If `echoRequestBody` is enabled, the response is exactly the request body received.

### Dynamic Response
If `useDynamicResponse` is enabled, generates fresh JSON from the configured `jsonSchema` on each request using the schema generator utility.

### Response Delay
If a `delay` (in milliseconds) is configured for a mock, Mockzilla will pause execution for that duration before returning the response. This is useful for simulating:
- **Network Latency**: Test how your application behaves under slow network conditions.
- **AI "Thinking" Time**: Simulate the inference time of expensive LLM models.
- **Loading States**: Verify that loading spinners and skeleton screens are correctly displayed in your UI.

The delay is applied to all response types (Static, Echo, and Dynamic) and occurs after a successful match is identified but before the response body is built.

## HTTP Methods

The route supports all standard HTTP methods:
- GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS

OPTIONS requests receive a 204 response for CORS preflight handling.

## Error Handling

| Status | Condition |
|--------|-----------|
| 400 | Invalid URL format (no path segments provided) |
| 404 | Folder not found, mock not found, or no matching variant |
| 500 | Internal server error during response building |

## Error Responses

```json
{
  "error": "Invalid mock URL format"
}
```

```json
{
  "error": "Folder not found",
  "folderPath": "/users"
}
```

```json
{
  "error": "Mock endpoint not found",
  "folder": "/users",
  "path": "/list",
  "method": "GET"
}
```

## Related Documentation

- [Schema Interpolation](/documentation/schema-interpolation.md) - How `{$.path}` templates resolve
- [Test Schemas](/documentation/test-schemas.md) - Sample schemas for dynamic generation
- [Mock Matcher](/lib/utils/mock-matcher.ts) - Matching logic for wildcard and substring types
