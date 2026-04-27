# Mock Serving Route

The mock serving route is the core endpoint that delivers configured mock responses to clients.

## Entry Point

**File:** `app/api/mock/[...path]/route.ts`

## URL Structure

The route uses Next.js catch-all segments to match mock requests:

```
/api/mock/{folderSlug}/{mockPath...}
```

### Examples

- `/api/mock/users/` - Root endpoint for the "users" folder (path: "/")
- `/api/mock/users/list` - Matches mock with path "/list" in "users" folder
- `/api/mock/users/123/profile` - Matches mock with path "/123/profile" in "users" folder

## Path Resolution

### Segment Parsing

The route extracts path segments from the URL:

1. **First segment**: Folder slug (required)
2. **Remaining segments**: Mock path (optional, defaults to "/" if not provided)

```typescript
const folderSlug = pathSegments[0];
const mockPath = pathSegments.length === 1
  ? '/'
  : `/${pathSegments.slice(1).join('/')}`;
```

### Root Path Support

When only the folder slug is provided (e.g., `/api/mock/users/`), the route treats it as a root path `/`. This allows creating root-level endpoints for folders.

**Valid URL patterns:**
- `/api/mock/users/` → folder: "users", path: "/"
- `/api/mock/users` → folder: "users", path: "/" (trailing slash optional)
- `/api/mock/users/list` → folder: "users", path: "/list"

## Matching Logic

The route uses a two-phase matching strategy:

### Phase 1: Exact Match

Attempts to find an exact match for the endpoint and HTTP method:

```typescript
const [exactMock] = await db
  .select()
  .from(mockResponses)
  .where(
    and(
      eq(mockResponses.folderId, folder.id),
      eq(mockResponses.endpoint, mockPath),
      eq(mockResponses.method, method),
      eq(mockResponses.enabled, true),
    ),
  )
  .limit(1);
```

If an exact match is found and its `matchType` is `'exact'`, the route checks query parameters:
- If query params match → return response immediately
- If query params don't match → fall through to Phase 2

### Phase 2: Fallback Matching

Fetches all enabled mocks for the folder and method, then evaluates them using the mock matcher:

1. **Build candidates**: All mocks with their match types and query params
2. **Find best match**: Uses `findBestMatch()` to score and rank candidates
3. **Select variant**: For wildcard mocks, selects the appropriate variant if configured

#### Variant Selection for Wildcards

For mocks using `matchType: 'wildcard'`, Mockzilla supports multiple response variants based on the captured wildcard value:

1. **Extract Key**: The captured wildcard segment(s) are joined by `|` to form a key (e.g., `/users/123` matches `/users/*` with key `123`).
2. **Match Variant**: 
   - Tries to find a variant with an exact match for the key.
   - Falls back to a variant with key `*` (catch-all) if available.
3. **Override Response**: If a variant is matched, its `body`, `statusCode`, and `bodyType` override the default mock configuration. 
   - **Note**: When a variant is matched, `useDynamicResponse` is automatically disabled for that request to ensure the variant's static body is returned.

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
  "folderSlug": "users"
}
```

```json
{
  "error": "Mock endpoint not found",
  "folder": "users",
  "path": "/list",
  "method": "GET"
}
```

## Related Documentation

- [Schema Interpolation](/documentation/schema-interpolation.md) - How `{$.path}` templates resolve
- [Test Schemas](/documentation/test-schemas.md) - Sample schemas for dynamic generation
- [Mock Matcher](/lib/utils/mock-matcher.ts) - Matching logic for wildcard and substring types
