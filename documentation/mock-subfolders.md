# Mock Subfolders

Mock subfolders organize mocks inside a top-level folder without changing the public folder slug.

## Model

- Top-level folders still own the public namespace: `/api/mock/{folderSlug}`.
- Mock subfolders are stored in `mock_subfolders`.
- Each subfolder has:
  - `folderId`: parent top-level folder.
  - `parentId`: optional parent subfolder for nesting.
  - `name`: display title.
  - `slug`: user-controlled URL segment.
  - `mainPath`: the derived absolute base path used when serving mocks.
- Mocks store `mockFolderId` and a relative `path`.

## Effective Paths

Mockzilla derives each subfolder `mainPath` from the nested slug hierarchy, then serves a mock by joining that `mainPath` with the mock's relative path.

| Subfolder hierarchy | Derived main path | Mock path | Served path |
| --- | --- | --- | --- |
| `users` | `/users` | `/123` | `/users/123` |
| `users/details` | `/users/details` | `/123` | `/users/details/123` |
| `users/details` | `/users/details` | `/` | `/users/details` |

The public URL remains:

```text
/api/mock/{folderSlug}{servedPath}
```

Example:

```text
/api/mock/api/users/details/123
```

When editing mocks in the web UI, the endpoint path is kept relative to the selected subfolder. For example, in folder `ticket-management` and subfolder `/app`, the mock path should be `/ticket-type`; the preview renders `/api/mock/ticket-management/app/ticket-type`. If a user pastes `/api/mock/ticket-management/app/ticket-type` or `/ticket-management/app/ticket-type`, the editor strips the public folder and subfolder prefixes before saving.

Subfolder slug fields apply the same normalization. When creating or editing a child under `/app`, pasting `/api/mock/ticket-management/app/ticket-type` stores the child slug as `ticket-type` and previews `/app/ticket-type`, not `/app/ticket-management-app-ticket-type`.

The API now enforces the same normalization on `POST /api/mock-subfolders`, `PUT /api/mock-subfolders?id=...`, and `PATCH /api/mock-subfolders?id=...`. Direct clients can send either a single-segment slug like `ticket-type` or a pasted full path like `/api/mock/ticket-management/app/ticket-type`; Mockzilla stores the final slug as `ticket-type` and derives `mainPath` from the parent hierarchy.

## API

Subfolders are managed through `/api/mock-subfolders`.

- `GET /api/mock-subfolders?folderId={id}&parentId=root` lists root-level subfolders.
- `GET /api/mock-subfolders?folderId={id}&parentId={subfolderId}` lists children.
- `GET /api/mock-subfolders?folderId={id}&all=true` lists all subfolders in a folder.
- `GET /api/mock-subfolders?id={id}` returns one subfolder.
- `POST /api/mock-subfolders` creates a subfolder with `folderId`, optional `parentId`, `name`, and optional `slug`.
- `PUT /api/mock-subfolders?id={id}` updates `name`, `slug`, or `parentId`.
- `PATCH /api/mock-subfolders?id={id}` applies the same partial update behavior as `PUT`.
- `DELETE /api/mock-subfolders?id={id}` deletes only empty subfolders.

If `slug` is omitted on create, Mockzilla generates it from `name` for backward compatibility. After creation, changing `name` only changes the display title. Changing `slug` or moving a subfolder recomputes its `mainPath` and all descendant `mainPath` values.

`mainPath` is returned by the API but is not client-controlled.

Read paths are also canonicalized from `parentId` plus each subfolder `slug`. If older data contains a stale flat `mainPath`, API responses, mock listing, MCP preview, and live serving still resolve the effective path as the full nested hierarchy, such as `/users/details/history`.

## MCP

Agents can manage the same hierarchy through `manage_mock_subfolders`.

- `list`: Requires `folderId` or `folderSlug`; optional `parentId` lists children; `parentId: null` lists root-level subfolders; `all: true` lists the full tree ordered by `mainPath`.
- `create`: Requires `folderId` or `folderSlug` and `name`; optional `slug` controls the URL segment; optional `parentId` creates a nested child.
- `get`: Requires `id`.
- `update`: Requires `id`; optional `name` changes the title; optional `slug` changes the URL segment and recomputes descendant paths; optional `parentId` moves the subfolder and recomputes descendant paths.
- `delete`: Requires `id`; only succeeds when the subfolder has no child subfolders or mocks.

Example MCP sequence:

```json
{ "action": "create", "folderSlug": "api", "name": "Users", "slug": "people" }
```

```json
{
  "action": "create",
  "folderSlug": "api",
  "parentId": "returned-users-subfolder-id",
  "name": "Details"
}
```

Then create a mock with `manage_mocks` using the returned `Details` subfolder ID:

```json
{
  "action": "create",
  "folderSlug": "api",
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

Imports rebuild subfolder `mainPath` from imported parent/slug relationships instead of trusting exported `mainPath` values.

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

Deleting a non-empty subfolder returns `409`; move or delete its child mocks/subfolders first.
