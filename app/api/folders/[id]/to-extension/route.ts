
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { folders, mockResponses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { HttpMethod, MatchType } from '@/lib/types';

interface ExtensionMock {
    id: string;
    name: string;
    pattern: string;
    method: HttpMethod;
    body: string;
    response: string;
    statusCode: number;
    matchType: MatchType;
    enabled: boolean;
	bodyType: 'json' | 'text';
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

        // 3. Transform to Extension Format
        // 3. Transform to Extension Format (with High Fidelity Merge)
        const meta = folder.meta as { extensionSyncData?: ExtensionGroup } | null;
        const extensionSyncData = meta?.extensionSyncData;

        const extensionMocks: ExtensionMock[] = mocks.map(mock => {
            // Attempt to find original mock to preserve metadata (variants, etc.)
            const originalMock = extensionSyncData?.mocks?.find(m => 
                m.name === mock.name && 
                m.pattern === mock.endpoint && 
                m.method === mock.method
            );

            if (originalMock) {
                return {
                    ...originalMock, // Keep variants, extra fields
                    // Overwrite with Server's current truth
                    pattern: mock.endpoint,
                    method: (mock.method as HttpMethod) || 'GET',
                    body: mock.response,
                    response: mock.response,
                    statusCode: mock.statusCode,
                    enabled: mock.enabled,
                    bodyType: mock.bodyType || originalMock.bodyType || 'json',
                    // Keep original ID
                    id: originalMock.id 
                };
            }

            // Fallback for new mocks
            return {
                id: mock.id,
                name: mock.name,
                pattern: mock.endpoint,
                method: (mock.method as HttpMethod) || 'GET',
                body: mock.response,
                response: mock.response,
                statusCode: mock.statusCode,
                matchType: 'substring',
                enabled: mock.enabled,
                bodyType: mock.bodyType || 'json'
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
