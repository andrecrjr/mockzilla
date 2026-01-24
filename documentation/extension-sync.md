# Extension Synchronization & High-Fidelity Data

Mockzilla allows for seamless synchronization between the local Chrome Extension and the Mockzilla Server. This document outlines the architecture, data flow, and "High-Fidelity" storage mechanisms.

## Overview

The goal of the synchronization system is to allow users to move data between the Extension (Local) and Server (Remote) without losing platform-specific features.

- **Extension → Server**: Backup local rules to the server.
- **Server → Extension**: Import shared mock libraries into the local browser.

## High-Fidelity Data Storage

A key challenge in syncing is that the Extension and Server may support different feature sets at different times. For example, the Extension might support `variants` or `delays` before the Server has UI to display them.

To solve this, Mockzilla uses a **High-Fidelity Storage Strategy**.

### The `meta` Column

The `folders` table in the Server database includes a `meta` column (`jsonb`).

```typescript
// lib/db/schema.ts
export const folders = pgTable('folders', {
  // ...
  meta: jsonb('meta').default({}),
});
```

When the Extension syncs data, the **entire raw extension payload** (including fields unknown to the Server) is stored inside `meta.extensionSyncData`.

### Data Flow

#### 1. Sync (POST `/api/sync/extension`)

1.  **Transport**: The Extension sends a JSON payload containing groups of mocks.
2.  **Storage**:
    -   The Server creates/updates a Folder corresponding to the Group.
    -   It parses standard fields (`name`, `method`, `status`, `response`) to create usable server-side mocks.
    -   **CRITICAL**: It stores the *original* group object into `folders.meta.extensionSyncData`.

This ensures that even if the Server drops fields it doesn't understand (like `mock.variants`), they are safely preserved in the database blob.

#### 2. Export / Import (GET `/api/folders/:id/to-extension`)

When the Extension requests data back:

1.  **Retrieval**: The Server fetches the Folder and its active Mocks from the database.
2.  **Merge Strategy**:
    -   It checks for `folders.meta.extensionSyncData`.
    -   If found, it uses the stored extension data as the **Base**.
    -   It then overlays the **Current Server State** (Status Code, Response Body, Enabled Status) on top of the base.

**Why merge?**
This allows a user to:
1.  Sync a complex mock with Variants to the Server.
2.  Edit the *Response Body* or *Status Code* using the Server UI.
3.  Import it back to the Extension.

**Result**: The user gets the *updated* Response Body (from Server) AND their original Variants (restored from Meta).

## API Reference

### POST `/api/sync/extension`

Syncs a list of groups/folders to the server.

**Payload:**
```json
{
  "groups": [
    {
      "id": "...",
      "name": "My Folder",
      "mocks": [
        {
          "id": "...",
          "name": "Auth",
          "method": "POST",
          "statusCode": 200,
          "variants": [...] // Preserved in meta
        }
      ]
    }
  ]
}
```

### GET `/api/folders/:id/to-extension`

Returns a folder in the format expected by the Extension importer.

**Response:**
```json
{
  "groups": [
    {
      "id": "...", // Folder ID
      "name": "My Folder (Extension)",
      "mocks": [...] // Merged Mocks
    }
  ]
}
```
