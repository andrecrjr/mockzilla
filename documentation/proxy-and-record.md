# Proxy & Record Mode

Mockzilla's "Proxy & Record" mode allows you to automatically capture live API traffic and convert it into mock endpoints. This is ideal for quickly bootstrapping a mock server from an existing backend or for capturing complex edge cases from real responses.

## How it Works

Proxy & Record is configured on individual mocks. If a matching mock has a
**Proxy Target URL** in `meta.proxyTargetUrl`, Mockzilla proxies that request to
the target instead of returning the mock's static response.

1. **Matched Request**: A request must match an existing mock by method, path,
   match type, and query params.
2. **Live Fetch**: Mockzilla forwards the request to the exact **Proxy Target URL** configured in the mock, preserving query parameters, method, headers, and request body. The original mock path is NOT appended to the target URL.
3. **Auto-Record**: The live response is returned to the client and saved as a new exact-match mock in the same folder, using the original request path.
4. **No Folder Fallback**: If no mock matches, Mockzilla returns `404`; folder
   metadata does not enable proxy recording.

## Configuration

### Via Dashboard

1. Create or edit a mock endpoint.
2. Under the basic fields, enter a **Proxy Target URL**.
3. Save the mock.

### Via API

Pass `proxyTargetUrl` inside the mock `meta` object in the request body.

```bash
curl -X PUT "http://localhost:3000/api/mocks?id={mock-id}" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Specific Proxy", 
       "meta": { "proxyTargetUrl": "https://api.example.com" }
     }'
```

## Features

- **Transparent Proxying**: Method, headers, and body are preserved during the proxy request.
- **Smart Body Detection**: Automatically detects if the response is JSON or plain text based on the `Content-Type` header.
- **Immediate Availability**: The recorded mock is active immediately and visible in the dashboard for further customization.
- **Mock Scoped**: Each proxy recorder is attached to one mock, so different endpoints can proxy to different upstream services inside the same folder.

## Use Cases

- **Backend Replacement**: Set the proxy to your staging server, hit all your app's features once, and you have a full mock environment ready for offline dev.
- **Edge Case Capture**: Point the proxy to a server that is currently exhibiting a bug. Once Mockzilla records the faulty response, you can test your frontend fix against it repeatedly.
- **API Versioning**: Record responses from `v1` of an API to ensure your app remains compatible while you develop against `v2`.

## Precedence

When multiple mocks match the same incoming request, Mockzilla follows these rules:

1. **Specificity**: Mocks with more matching query parameters take precedence.
2. **Recorded vs. Proxy**: If specificity is equal, a mock **without** a `proxyTargetUrl` (e.g., a recorded mock) takes precedence over one **with** a `proxyTargetUrl`. This ensures that once a response is captured, subsequent requests use the captured mock instead of proxying again.
3. **Recency**: If all else is equal, the most recently created mock is picked.
