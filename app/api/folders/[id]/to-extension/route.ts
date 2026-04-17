
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { folders, mockResponses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { HttpMethod, MatchType } from '@/lib/types';

interface ExtensionMock {
    id: string;
    name: string;
    pattern: string;
    method: string;
    body: string;
    response: string;
    statusCode: number;
    matchType: string;
    enabled: boolean;
	bodyType: 'json' | 'text';
    variants: { key: string; bodyType: string; statusCode: number; body: string }[];
    wildcardRequireMatch: boolean;
}

interface ExtensionGroup {
    id: string;
    name: string;
    description?: string;
    mocks: ExtensionMock[];
}

interface SyncPayload {
    groups: ExtensionGroup[];
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: folderId } = await params;

        if (!folderId) {
            return NextResponse.json(
                { error: 'Folder ID is required' },
                { status: 400 }
            );
        }

        // 1. Fetch Folder
        const [folder] = await db
            .select()
            .from(folders)
            .where(eq(folders.id, folderId));

        if (!folder) {
            return NextResponse.json(
                { error: 'Folder not found' },
                { status: 404 }
            );
        }

        // 2. Fetch Mocks
        const mocks = await db
            .select()
            .from(mockResponses)
            .where(eq(mockResponses.folderId, folderId));

        const meta = folder.meta as { extensionSyncData?: ExtensionGroup } | null;
        const extensionSyncData = meta?.extensionSyncData;

        const extensionMocks: ExtensionMock[] = mocks.map(mock => {
            // Find the original extension data using the stable serverMockId link
            const originalMock = extensionSyncData?.mocks?.find(m =>
                (m as any).serverMockId === mock.id
            );

            const variants = mock.variants ? (mock.variants as { key: string; bodyType: string; statusCode: number; body: string }[]) : [];
            const wildcardRequireMatch = mock.wildcardRequireMatch || false;

            if (originalMock) {
                // If we found the original mock in meta, it means it was edited in the server UI
                // or synced from the extension. We should trust it as the source of truth.
                // NOTE: The name, method, status, etc. in originalMock are updated by ExtensionMockTable.tsx
                return {
                    ...originalMock,
                    name: mock.name, // Ensure DB-level edits win if meta wasn't updated (redundant but safe)
                    method: mock.method || 'GET',
                    statusCode: mock.statusCode,
                    enabled: mock.enabled,
                    response: mock.response,
                    body: mock.response,
                    variants: variants.length > 0 ? variants : originalMock.variants || [],
                    wildcardRequireMatch: wildcardRequireMatch || originalMock.wildcardRequireMatch || false,
                };
            }
            return {
                id: mock.id,
                name: mock.name,
                pattern: mock.endpoint,
                method: mock.method || 'GET',
                body: mock.response,
                response: mock.response,
                statusCode: mock.statusCode,
                matchType: mock.matchType || 'substring',
                enabled: mock.enabled,
                bodyType: mock.bodyType || 'json',
                variants,
                wildcardRequireMatch,
            };
        });

        const payload: SyncPayload = {
            groups: [
                {
                    id: folder.id,
                    name: folder.name,
                    description: folder.description || '',
                    mocks: extensionMocks
                }
            ]
        };

        return NextResponse.json(payload);

    } catch (error: unknown) {
        console.error('[API] Export to extension error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to export folder' },
            { status: 500 }
        );
    }
}
