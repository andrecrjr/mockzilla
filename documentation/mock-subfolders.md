# Mock Subfolders

Mock subfolders organize mocks inside a top-level folder without changing the public folder slug.

## Model

- Top-level folders still own the public namespace: `/api/mock/{folderSlug}`.
- Mock subfolders are stored in `mock_subfolders`.
- Each subfolder has:
  - `folderId`: parent top-level folder.
  - `parentId`: optional parent subfolder for nesting.
  - `name` and generated `slug`.
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

## API

Subfolders are managed through `/api/mock-subfolders`.

- `GET /api/mock-subfolders?folderId={id}&parentId=root` lists root-level subfolders.
- `GET /api/mock-subfolders?folderId={id}&parentId={subfolderId}` lists children.
- `GET /api/mock-subfolders?folderId={id}&all=true` lists all subfolders in a folder.
- `GET /api/mock-subfolders?id={id}` returns one subfolder.
- `POST /api/mock-subfolders` creates a subfolder with `folderId`, optional `parentId`, and `name`.
- `PUT /api/mock-subfolders?id={id}` updates `name` or `parentId`.
- `DELETE /api/mock-subfolders?id={id}` deletes only empty subfolders.

`mainPath` is returned by the API but is not client-controlled. Renaming or moving a subfolder recomputes its `mainPath` and all descendant `mainPath` values.

Mocks use `mockFolderId`:

- `mockFolderId: null` means the root of the top-level folder.
- `mockFolderId` must belong to the same top-level folder as the mock.
- `GET /api/mocks?folderId={id}&mockFolderId=root` lists root mocks.
- `GET /api/mocks?folderId={id}&mockFolderId={subfolderId}` lists mocks in one subfolder.
- Create and update calls accept `mockFolderId` to place or move mocks.

Imports rebuild subfolder `mainPath` from imported parent/slug relationships instead of trusting exported `mainPath` values.

## Implementation Notes

- Shared hierarchy helpers live in `lib/mock-subfolders.ts`.
- Subfolder rename/move updates run in a transaction so parent and descendant paths change atomically.
- Live serving matches all root and subfolder mocks through the same effective-path matcher.

## UI Behavior

The folder page shows the current subfolder level:

- Subfolder cards navigate into child levels.
- New subfolders are created under the current level.
- The mock list shows mocks in the current level only.
- The mock editor path field is relative to the selected subfolder.
- Preview and copied URLs use the computed effective path.

Deleting a non-empty subfolder returns `409`; move or delete its child mocks/subfolders first.
