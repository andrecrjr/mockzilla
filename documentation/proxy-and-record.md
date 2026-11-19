# Proxy & Record Mode

User guide: `content/docs/guides/proxy-and-record.mdx` (served at `/docs/guides/proxy-and-record`). This file covers the implementation.

## Flow

`app/api/mock/[...path]/route.ts` → `buildResponse()` → `handleProxyAndRecord()` when the matched mock has `meta.proxyTargetUrl`. Wildcard captures (`paramsMap`) are passed in so `*` in the target can be substituted.

1. `buildProxyTargetUrl()` validates the target (http/https only), replaces each `*` with the next capture, merges the incoming query, then applies `meta.proxyQueryParams` on top (configured values win). Invalid targets return `502 { error: 'Invalid proxy target URL' }` instead of throwing.
2. `buildProxyRequestHeaders()` forwards request headers (unless `meta.proxyForwardHeaders === false`), then applies `meta.proxyHeaders` on top; names compare case-insensitively. Incoming headers forwarded, except `host`, hop-by-hop headers (`connection`, `keep-alive`, `transfer-encoding`, `te`, `trailer`, `upgrade`, `proxy-*`), `content-length`, and `expect`. Node's fetch rejects some of these.
3. The upstream response is recorded as an exact mock:
   - `name`: `buildRecordedMockName()` → `Recorded: GET /users?page=1`
   - `folderId` and `mockFolderId` from the proxy mock; `endpoint` relative to that subfolder (`getMockFolderRelativePath`)
   - `queryParams`: the request's query
   - `meta`: `{ recordedFrom: <proxy mock id>, recordedAt, recordedTarget }`
   Recording failures are logged and do not block the live response.
4. The live status/body/content type are returned. Statuses that forbid a body (204/304…) return no body.
5. Fetch failures return `502 { error: 'Proxy request failed', details, target }`.

TLS verification is no longer disabled. The old code set `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'` process-wide on the first proxied request. For a self-signed upstream, set that env var on the container explicitly.

### Upstream settings (`meta`)

| Key | Type | Meaning |
| :--- | :--- | :--- |
| `proxyTargetUrl` | string | Upstream URL; `*` is replaced by wildcard captures |
| `proxyHeaders` | `Record<string,string>` | Sent upstream, replacing incoming headers of the same name |
| `proxyQueryParams` | `Record<string,string>` | Added upstream, replacing incoming params of the same name |
| `proxyForwardHeaders` | boolean | `false` sends only `proxyHeaders`; unset means forward |

`getProxyUpstreamConfig()` reads them defensively; `validateProxyHeaderName()` rejects invalid names and headers the proxy manages. Values are stored in plain text in `meta`, so they appear in exports and API responses. They are never copied to recordings, and the 502 body, logs, and `recordedTarget` meta contain only the upstream origin and path, because configured query values can hold secrets. The editor UI is `components/mock-proxy-options.tsx` (masked rows with show/hide for sensitive names).

### Setting it from REST, MCP, and the CLI

All three use one merge function, `applyProxySettings(existingMeta, input)` in `lib/utils/proxy-record.ts`, so behavior is identical:

- REST `POST/PUT /api/mocks` accept a `proxy` object next to `meta`. `meta`, when present, replaces first; `proxy` then merges on top. Errors are `400`. The dashboard still sends full `meta` (clearing a key means omitting it).
- MCP `manage_mocks` `create|update` take `proxy`; output includes `proxy` and `recorded` through `summarizeProxy()`, which masks sensitive values as `***` (`REDACTED_VALUE`). `***` sent back for an existing name keeps the stored value. `preview` returns the upstream URL (credentials masked) without calling it.
- CLI `--proxy-url`, `--proxy-headers[-file]`, `--proxy-params[-file]`, `--[no-]forward-headers`, `--clear-proxy` build the same `proxy` payload. The CLI does not mask output.

`proxy` semantics: omitted = unchanged, `null` = clear, `targetUrl: null` = off and clears headers, params, and forwarding. `headers`/`queryParams` replace the whole map. Headers, params, or `forwardHeaders: false` without a target are rejected.

## Matching recordings

`isRecordedMock(meta, name)` (`lib/utils/proxy-record.ts`) identifies recordings by `meta.recordedFrom` or the legacy `Auto-captured: ` name prefix. Both matcher callers (the serve route and the MCP preview in `lib/mcp/handlers.ts`) set `MockCandidate.exactQuery` for recordings. `scoreCandidate()` then rejects requests that carry query keys the recording did not capture. Without this, a recording of `/users` with no query answered every `/users?…` request, so new queries were never proxied.

Ties between a recording and its proxy mock go to the recording (`sortMocksForMatchTieBreakers`: non-proxy first, then newest).

## UI

- `components/mock-proxy-options.tsx` (rendered by `mock-advanced-options.tsx`): **Proxy & Record** section with help text, the `*` hint, a "recording is on" note, inline validation, and key/value rows for upstream headers and query params (sensitive names masked). `MockEditor` blocks saving an invalid target or header name and switches to Advanced Options.
- `components/mock-response-config.tsx`: "Proxy & Record is on" notice with an **Edit proxy** button while a target is set.
- `components/mock-card.tsx`: **Recorded** badge on recordings; the existing **Proxy:** badge on proxy mocks.

## Tests

- `tests/unit/proxy-record.test.ts`: URL validation and wildcard substitution, header filtering, naming, recording detection, and the exact-query matching rule.
- `tests/integration/proxy-and-record.test.ts`: GET/POST proxy and record, 404 with no match, and a 502 on upstream failure.
