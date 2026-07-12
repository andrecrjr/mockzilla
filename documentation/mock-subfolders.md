# Mock Subfolders

Mock subfolders organize mocks inside a top-level folder without changing the public folder path.

## Model

- Top-level folders still own the public namespace: `/api/mock{folderPath}`.
- Mock subfolders are stored in `mock_subfolders`.
- Each subfolder has:
  - `folderId`: parent top-level folder.
  - `parentId`: optional parent subfolder for nesting.
  - `name`: display title.
  - `segment`: internal single URL segment.
  - `path`: the user-facing absolute base path used when serving mocks.
- Mocks store `mockFolderId` and a relative `path`.

## Effective Paths

Mockzilla derives each subfolder `path` from the nested segment hierarchy, then serves a mock by joining that `path` with the mock's relative path.

| Subfolder hierarchy | Derived path | Mock path | Served path |
| --- | --- | --- | --- |
| `users` | `/users` | `/123` | `/users/123` |
| `users/details` | `/users/details` | `/123` | `/users/details/123` |
| `users/details` | `/users/details` | `/` | `/users/details` |

The public URL remains:

```text
/api/mock{folderPath}{servedPath}
```

Example:

```text
/api/mock/api/users/details/123
```

When editing mocks in the web UI, the endpoint path is kept relative to the selected subfolder. For example, in folder `ticket-management` and subfolder `/app`, the mock path should be `/ticket-type`; the preview renders `/api/mock/ticket-management/app/ticket-type`. If a user pastes `/api/mock/ticket-management/app/ticket-type` or `/ticket-management/app/ticket-type`, the editor strips the public folder and subfolder prefixes before saving.

Subfolder path fields apply the same normalization. When creating or editing a child under `/app`, pasting `/api/mock/ticket-management/app/ticket-type` preserves the user-facing path as `/app/ticket-type`. Internally, Mockzilla still derives the final segment as `ticket-type`.

In the web UI, `path` is the only user-facing subfolder path. For a child under `/app`, entering either `ticket-type` or `/api/mock/ticket-management/app/ticket-type` normalizes the field to `/app/ticket-type`.

Both create and edit modals now preserve and submit the full path string entered in the UI. The front-end does not expose or display the last-segment internal segment as the editable path anymore.

The API now enforces the same normalization on `POST /api/mock-subfolders`, `PUT /api/mock-subfolders?id=...`, and `PATCH /api/mock-subfolders?id=...`. Direct clients can send either a single-segment path like `ticket-type`, compatibility `slug`, or a pasted full path like `/api/mock/ticket-management/app/ticket-type`; Mockzilla stores the final internal segment as `ticket-type` and derives the returned `path` from the parent hierarchy.

On create, full paths are resolved against the existing hierarchy. For example, creating `/app/ticket-management/gamma` from the root level reuses existing `/app` and `/app/ticket-management` subfolders, then creates only the missing `gamma` child. If missing intermediate segments do not exist yet, Mockzilla creates them in order before creating the final subfolder.

## API

Subfolders are managed through `/api/mock-subfolders`.

- `GET /api/mock-subfolders?folderId={id}&parentId=root` lists root-level subfolders.
- `GET /api/mock-subfolders?folderId={id}&parentId={subfolderId}` lists children.
- `GET /api/mock-subfolders?folderId={id}&all=true` lists all subfolders in a folder.
- `GET /api/mock-subfolders?id={id}` returns one subfolder.
- `POST /api/mock-subfolders` creates a subfolder with `folderId`, optional `parentId`, `name`, and optional `path`. If `path` contains multiple segments, Mockzilla resolves that hierarchy under the provided parent and creates any missing segments.
- `PUT /api/mock-subfolders?id={id}` updates `name`, `path`, or `parentId`.
- `PATCH /api/mock-subfolders?id={id}` applies the same partial update behavior as `PUT`.
- `DELETE /api/mock-subfolders?id={id}` deletes only empty subfolders.

If `path` is omitted on create, Mockzilla generates the internal segment from `name` for backward compatibility. After creation, changing `name` only changes the display title. Changing `path` or moving a subfolder recomputes its derived path and all descendant paths.

`path` is returned by the API. `segment`, `slug`, and `mainPath` remain compatibility/internal fields.

Read paths are also canonicalized from `parentId` plus each subfolder segment. If older data contains a stale flat `mainPath`, API responses, mock listing, MCP preview, and live serving still resolve the effective path as the full nested hierarchy, such as `/users/details/history`.

## MCP

Agents can manage the same hierarchy through `manage_mock_subfolders`.

- `list`: Requires `folderId` or `folderSlug`; optional `parentId` lists children; `parentId: null` lists root-level subfolders; `all: true` lists the full tree ordered by canonical path.
- `create`: Requires `folderId` or `folderSlug` and `name`; optional `path` controls the user-facing path and may include multiple segments; optional compatibility `slug` controls the final segment; optional `parentId` creates a nested child.
- `get`: Requires `id`.
- `update`: Requires `id`; optional `name` changes the title; optional `path` or compatibility `slug` changes the final segment and recomputes descendant paths; optional `parentId` moves the subfolder and recomputes descendant paths.
- `delete`: Requires `id`; only succeeds when the subfolder has no child subfolders or mocks.

Example MCP sequence:

```json
{ "action": "create", "folderSlug": "/api", "name": "Users", "path": "/people" }
```

```json
{
  "action": "create",
  "folderSlug": "/api",
  "parentId": "returned-users-subfolder-id",
  "name": "Details"
}
```

Then create a mock with `manage_mocks` using the returned `Details` subfolder ID:

```json
{
  "action": "create",
  "folderSlug": "/api",
  "mockFolderId": "returned-details-subfolder-id",
  "name": "User Details",
  "path": "/123",
  "method": "GET",
  "statusCode": 200,
  "response": "{\"ok\":true}"
}
```

Mocks use `mockFolderId`:

- `mockFolderId: null` means the root of the top-level folder.
- `mockFolderId` must belong to the same top-level folder as the mock.
- `GET /api/mocks?folderId={id}&mockFolderId=root` lists root mocks.
- `GET /api/mocks?folderId={id}&mockFolderId={subfolderId}` lists mocks in one subfolder.
- Create and update calls accept `mockFolderId` to place or move mocks.

Imports rebuild subfolder paths from imported parent/segment relationships instead of trusting exported compatibility `mainPath` values.

## Implementation Notes

- Shared hierarchy helpers live in `lib/mock-subfolders.ts`.
- Canonical path helpers rebuild nested paths from parent links before formatting subfolders or resolving mock effective paths.
- Subfolder rename/move updates run in a transaction so parent and descendant paths change atomically.
- Live serving matches all root and subfolder mocks through the same effective-path matcher.

## UI Behavior

The folder page shows the current subfolder level:

- Subfolder cards navigate into child levels.
- New subfolders are created under the current level.
- The mock list shows mocks in the current level only.
- The mock editor path field is relative to the selected subfolder.
- Preview and copied URLs use the computed effective path.
- Mock create, duplicate, delete, inline card edits, and full editor saves revalidate the active paginated mock list cache.
- The edit form hydrates all inputs from the saved mock revision when SWR receives newer persisted data, so stale cached fields do not overwrite newer mock values.
- SWR fetchers use `cache: 'no-store'` and throw on non-2xx responses, preventing failed requests from being treated as valid cached data.
- Mock creation and duplication invalidate every paginated `/api/mocks?folderId=...` cache variant, including subfolder, page, limit, and search parameters.
- Folder and mock creation optimistically insert the server-created record into the active SWR list before background revalidation completes, so the previous list is not shown as the immediate result.
- The subfolder edit dialog derives the parent path from the saved subfolder path, so nested paths like `/app/ticket-management` preview correctly even before the full subfolder tree finishes loading.

Deleting a non-empty subfolder returns `409`; move or delete its child mocks/subfolders first.
