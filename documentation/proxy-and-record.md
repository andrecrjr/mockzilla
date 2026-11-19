# Proxy & Record Mode

User guide: `content/docs/guides/proxy-and-record.mdx` (served at `/docs/guides/proxy-and-record`). This file covers the implementation.

## Flow

`app/api/mock/[...path]/route.ts` → `buildResponse()` → `handleProxyAndRecord()` when the matched mock has `meta.proxyTargetUrl`. Wildcard captures (`paramsMap`) are passed in so `*` in the target can be substituted.

1. `buildProxyTargetUrl()` validates the target (http/https only), replaces each `*` with the next capture, and merges the incoming query. Invalid targets return `502 { error: 'Invalid proxy target URL' }` instead of throwing.
2. `buildProxyRequestHeaders()` forwards request headers except `host`, hop-by-hop headers (`connection`, `keep-alive`, `transfer-encoding`, `te`, `trailer`, `upgrade`, `proxy-*`), `content-length`, and `expect`. Node's fetch rejects some of these.
3. The upstream response is recorded as an exact mock:
   - `name`: `buildRecordedMockName()` → `Recorded: GET /users?page=1`
   - `folderId` and `mockFolderId` from the proxy mock; `endpoint` relative to that subfolder (`getMockFolderRelativePath`)
   - `queryParams`: the request's query
   - `meta`: `{ recordedFrom: <proxy mock id>, recordedAt, recordedTarget }`
   Recording failures are logged and do not block the live response.
4. The live status/body/content type are returned. Statuses that forbid a body (204/304…) return no body.
5. Fetch failures return `502 { error: 'Proxy request failed', details, target }`.

TLS verification is no longer disabled. The old code set `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'` process-wide on the first proxied request. For a self-signed upstream, set that env var on the container explicitly.

## Matching recordings

`isRecordedMock(meta, name)` (`lib/utils/proxy-record.ts`) identifies recordings by `meta.recordedFrom` or the legacy `Auto-captured: ` name prefix. Both matcher callers (the serve route and the MCP preview in `lib/mcp/handlers.ts`) set `MockCandidate.exactQuery` for recordings. `scoreCandidate()` then rejects requests that carry query keys the recording did not capture. Without this, a recording of `/users` with no query answered every `/users?…` request, so new queries were never proxied.

Ties between a recording and its proxy mock go to the recording (`sortMocksForMatchTieBreakers`: non-proxy first, then newest).

## UI

- `components/mock-advanced-options.tsx`: **Proxy & Record** section with help text, the `*` hint, a "recording is on" note, and inline validation (`validateProxyTargetUrl`). `MockEditor` blocks saving an invalid target and switches to Advanced Options.
- `components/mock-response-config.tsx`: "Proxy & Record is on" notice with an **Edit proxy** button while a target is set.
- `components/mock-card.tsx`: **Recorded** badge on recordings; the existing **Proxy:** badge on proxy mocks.

## Tests

- `tests/unit/proxy-record.test.ts`: URL validation and wildcard substitution, header filtering, naming, recording detection, and the exact-query matching rule.
- `tests/integration/proxy-and-record.test.ts`: GET/POST proxy and record, 404 with no match, and a 502 on upstream failure.
