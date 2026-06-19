# Mock Subfolders

Mock subfolders organize mocks inside a top-level folder without changing the public folder slug.

## Model

- Top-level folders still own the public namespace: `/api/mock/{folderSlug}`.
- Mock subfolders are stored in `mock_subfolders`.
- Each subfolder has:
  - `folderId`: parent top-level folder.
  - `parentId`: optional parent subfolder for nesting.
  - `name` and generated `slug`.
  - `mainPath`: the absolute base path used when serving mocks.
- Mocks store `mockFolderId` and a relative `path`.

## Effective Paths

Mockzilla serves a mock by joining the subfolder `mainPath` with the mock's relative path.

| Subfolder main path | Mock path | Served path |
| --- | --- | --- |
| `/` | `/users` | `/users` |
| `/v1/users` | `/123` | `/v1/users/123` |
| `/v1/users` | `/` | `/v1/users` |

The public URL remains:

```text
/api/mock/{folderSlug}{servedPath}
```

Example:

```text
/api/mock/api/v1/users/123
```

## API

Subfolders are managed through `/api/mock-subfolders`.

- `GET /api/mock-subfolders?folderId={id}&parentId=root` lists root-level subfolders.
- `GET /api/mock-subfolders?folderId={id}&parentId={subfolderId}` lists children.
- `GET /api/mock-subfolders?folderId={id}&all=true` lists all subfolders in a folder.
- `GET /api/mock-subfolders?id={id}` returns one subfolder.
- `POST /api/mock-subfolders` creates a subfolder with `folderId`, optional `parentId`, `name`, and `mainPath`.
- `PUT /api/mock-subfolders?id={id}` updates `name`, `mainPath`, or `parentId`.
- `DELETE /api/mock-subfolders?id={id}` deletes only empty subfolders.

Mocks use `mockFolderId`:

- `mockFolderId: null` means the root of the top-level folder.
- `GET /api/mocks?folderId={id}&mockFolderId=root` lists root mocks.
- `GET /api/mocks?folderId={id}&mockFolderId={subfolderId}` lists mocks in one subfolder.
- Create and update calls accept `mockFolderId` to place or move mocks.

## UI Behavior

The folder page shows the current subfolder level:

- Subfolder cards navigate into child levels.
- New subfolders are created under the current level.
- The mock list shows mocks in the current level only.
- The mock editor path field is relative to the selected subfolder.
- Preview and copied URLs use the computed effective path.

Deleting a non-empty subfolder returns `409`; move or delete its child mocks/subfolders first.
