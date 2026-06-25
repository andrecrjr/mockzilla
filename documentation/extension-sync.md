# Extension Synchronization & High-Fidelity Data

Mockzilla allows for seamless synchronization between the local Chrome Extension and the Mockzilla Server. This document outlines the architecture, data flow, and "High-Fidelity" storage mechanisms that enable team collaboration and cross-platform backup.

## Overview

The goal of the synchronization system is to allow users to move data between the Extension (Local) and Server (Remote) without losing platform-specific features or metadata.

-   **Extension → Server**: Backup local rules to the server for sharing or backup.
-   **Server → Extension**: Import shared mock libraries from the server into the local browser.
-   **Server UI Editing**: Edit synced mocks directly on the server and sync them back to the extension.

## High-Fidelity Data Storage

A key challenge in syncing is that the Extension and Server may support different feature sets. For example, the Extension supports complex `variants` and specific match types that the server's standard mocking engine might handle differently.

To solve this, Mockzilla uses a **High-Fidelity Storage Strategy**:
-   **Primary Storage**: Synced data is stored in the `meta` column of the `folders` table under the `extensionSyncData` key.
-   **Full Payload Preservation**: The server stores the *entire* raw JSON object sent by the extension. Any fields unknown to the server (like extension-specific IDs or new features) are safely preserved in this JSON blob.
-   **Dual-Layer Representation**: While the full data is in `meta`, the server also creates individual rows in the `mock_responses` table. This allows the server to serve these mocks via its own HTTP API and display them in its standard UI.

### The `meta` Column

The `folders` table in the Server database includes a `meta` column (`jsonb`).

```typescript
// lib/db/schema.ts
export const folders = pgTable('folders', {
  // ...
  meta: jsonb('meta').default({}),
});
```

When the Extension syncs, the group metadata and its mocks are stored inside `meta.extensionSyncData`.

## Technical Flow

### 1. Extension → Server Sync (PUSH)
Initiated from the Extension's Rule Manager.

1.  **Selection**: The user enables "Server Sync" for specific rules or groups.
2.  **Transport**: `ruleManager.js` in the extension collects all sync-enabled rules, groups them by folder, and POSTs to `/api/sync/extension`.
3.  **Slug Generation**: The server generates a unique slug for the folder, appending an `-extension` suffix (e.g., `my-folder-extension`).
4.  **Consistency**: Before importing, the server **wipes existing mocks** in that specific folder to ensure the server state exactly matches the extension's pushed state.
5.  **Storage**: 
    -   Updates/Creates the `folders` record.
    -   Stores the raw group payload in `meta.extensionSyncData`.
    -   Creates corresponding rows in the `mock_responses` table for server-side serving.

### 2. Server-Side Editing
Mocks in "Extension Sync" folders can be edited via the Server UI.

1.  **Component**: `ExtensionMockTable.tsx` provides the editing interface.
2.  **Mechanism**: When a mock is updated, the component modifies the `extensionSyncData` blob inside the folder's `meta`.
3.  **Persistence**: It calls `PUT /api/folders?id=...` with the updated metadata.
4.  **Source of Truth**: For extension folders, the `meta.extensionSyncData` blob is the primary source of truth for both server-side edits and original extension data.

### 3. Server → Extension Sync (PULL/IMPORT)
Importing data back into the browser.

1.  **Retrieval**: `GET /api/folders/:id/to-extension` fetches the folder and its mocks.
2.  **Merge Strategy**:
    -   The server fetches the `extensionSyncData` from the folder's `meta`.
    -   It uses this data as the **Base** to ensure extension-specific fields (like `id`) are preserved.
    -   It trusts the `meta` content as the most up-to-date state (including any edits made in the Server UI).
3.  **Import**: The extension receives this merged payload and updates its local `chrome.storage.sync` and `chrome.storage.local`.

## API Reference

### POST `/api/sync/extension`
Syncs a list of groups/folders to the server.

**Payload:**
```json
{
  "groups": [
    {
      "id": "ext-folder-123",
      "name": "Auth API",
      "description": "Mocks for auth flows",
      "mocks": [
        {
          "id": "ext-mock-456",
          "name": "Login Success",
          "pattern": "/api/login",
          "method": "POST",
          "statusCode": 200,
          "body": "{\"token\": \"xyz\"}",
          "matchType": "substring",
          "enabled": true,
          "variants": []
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
      "id": "server-uuid-...",
      "name": "Auth API",
      "description": "Synced from Chrome Extension: Mocks for auth flows",
      "mocks": [
        {
          "id": "ext-mock-456", 
          "name": "Login Success",
          "pattern": "/api/login",
          "method": "POST",
          "statusCode": 200,
          "body": "{\"token\": \"xyz\"}",
          "matchType": "substring",
          "enabled": true,
          "variants": []
        }
      ]
    }
  ]
}
```

## Best Practices for Teams
1.  **Use Folders**: Always organize rules into folders before syncing to keep the server workspace clean.
2.  **Slug Suffixes**: Be aware that synced folders will have the `-extension` suffix to distinguish them from native server folders.
3.  **Auto-Sync**: Enable "Auto" in the extension to ensure your latest changes are always backed up to the server.
