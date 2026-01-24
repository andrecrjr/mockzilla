
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { folders, mockResponses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { HttpMethod, MatchType } from '@/lib/types';

// Helper to generate slugs (consistent with import route)
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as SyncPayload;
        
        if (!body.groups || !Array.isArray(body.groups)) {
             return NextResponse.json(
                { error: 'Invalid sync payload: groups array required' },
                { status: 400 }
            );
        }

        const results = {
            foldersCreated: 0,
            foldersUpdated: 0,
            mocksSynced: 0
        };

        await db.transaction(async (tx) => {
            for (const group of body.groups) {
                // Normalize name: remove existing "(Extension)" suffix if present to avoid recursive stacking
                const cleanedName = group.name.replace(/\s*\(Extension\)$/i, '').trim();
                
                // Logic: Extension groups sync to "[Name]-extension" folders
                // We append -extension to the slug to distinguish them
                const baseSlug = generateSlug(cleanedName);
                const extensionSlug = `${baseSlug}-extension`;
                const folderName = `${cleanedName} (Extension)`;

                // 1. Check if folder exists
                const existingFolder = await tx.query.folders.findFirst({
                    where: eq(folders.slug, extensionSlug)
                });

                let folderId: string;

                if (existingFolder) {
                    folderId = existingFolder.id;
                    // Update metadata if needed
                    await tx.update(folders)
                        .set({ 
                            name: folderName,
                            updatedAt: new Date(),
                            meta: { extensionSyncData: group }
                        })
                        .where(eq(folders.id, folderId));
                    results.foldersUpdated++;
                    
                    // CLEAR existing mocks in this folder to ensure exact sync
                    // This prevents "zombie" mocks that were deleted in extension but stay in server
                    await tx.delete(mockResponses)
                        .where(eq(mockResponses.folderId, folderId));
                } else {
                    const [newFolder] = await tx.insert(folders)
                        .values({
                            name: folderName,
                            slug: extensionSlug,
                            description: `Synced from Chrome Extension: ${group.description || ''}`,
                            meta: { extensionSyncData: group }
                        })
                        .returning();
                    folderId = newFolder.id;
                    results.foldersCreated++;
                }

                // 2. Insert Mocks
                if (group.mocks && group.mocks.length > 0) {
                    for (const mock of group.mocks) {
                        await tx.insert(mockResponses).values({
                            name: mock.name,
                            endpoint: mock.pattern,
                            method: mock.method, // User selected method
                            statusCode: mock.statusCode,
                            response: mock.response || mock.body || '', // Fallback
                            folderId: folderId,
                            matchType: mock.matchType || 'substring', // Enforce default
                            bodyType: 'json', // Extension sends JSON predominantly, or we can add a field for it
                            enabled: mock.enabled,
                            useDynamicResponse: false, 
                        });
                        results.mocksSynced++;
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            results
        });

    } catch (error: unknown) {
        console.error('[API] Sync error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to sync data' },
            { status: 500 }
        );
    }
}
