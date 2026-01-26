import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { folders, mockResponses } from '@/lib/db/schema';
import type { ExportData, Folder, LegacyImportFormat, Mock } from '@/lib/types';

function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');
}

function isLegacyFormat(data: unknown): data is LegacyImportFormat {
	return (
		typeof data === 'object' &&
		data !== null &&
		((data as Record<string, unknown>).groups !== undefined ||
			(data as Record<string, unknown>).rules !== undefined) &&
		(data as Record<string, unknown>).folders === undefined
	);
}

function convertLegacyFormat(data: LegacyImportFormat): ExportData {
	const folderMap = new Map<string, Folder>();
	const convertedMocks: Mock[] = [];

	const groupIds = new Set<string>();

	if (data.groups) {
		for (const group of data.groups) {
			groupIds.add(group.id);
		}
	}

	if (data.rules) {
		for (const rule of data.rules) {
			if (rule.group) {
				groupIds.add(rule.group);
			}
		}
	}

	// Convert groups to folders
	if (data.groups) {
		for (const group of data.groups) {
			const folder: Folder = {
				id: group.id,
				name: group.name,
				slug: generateSlug(group.name),
				description: group.description,
				createdAt: new Date().toISOString(),
			};
			folderMap.set(group.id, folder);
		}
	}

	for (const groupId of groupIds) {
		if (!folderMap.has(groupId)) {
			const folder: Folder = {
				id: groupId,
				name: `Group ${groupId}`,
				slug: generateSlug(`Group ${groupId}`),
				createdAt: new Date().toISOString(),
			};
			folderMap.set(groupId, folder);
		}
	}

	// Convert rules to mocks
	if (data.rules) {
		for (const rule of data.rules) {
			const folderId = rule.group || crypto.randomUUID();

			if (!folderMap.has(folderId)) {
				folderMap.set(folderId, {
					id: folderId,
					name: 'Imported Mocks',
					slug: 'imported-mocks',
					createdAt: new Date().toISOString(),
				});
			}

			const mock: Mock = {
				id: rule.id,
				name: rule.name,
				path: rule.pattern,
				method: 'GET',
				response: rule.body,
				statusCode: rule.statusCode,
				folderId,
				matchType: rule.matchType || 'exact',
				bodyType: rule.bodyType || 'json',
				enabled: rule.enabled !== false,
				createdAt: new Date().toISOString(),
			};
			convertedMocks.push(mock);
		}
	}

	return {
		folders: Array.from(folderMap.values()),
		mocks: convertedMocks,
		exportedAt: new Date().toISOString(),
	};
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		let exportData: ExportData;
		if (isLegacyFormat(body)) {
			exportData = convertLegacyFormat(body);
		} else if (body.folders && body.mocks) {
			exportData = body as ExportData;
		} else {
			return NextResponse.json(
				{ error: 'Invalid import data format' },
				{ status: 400 },
			);
		}

		const results = {
			folders: 0,
			mocks: 0,
		};

		// Create a map to track old IDs to new IDs for folders
		const folderIdMap = new Map<string, string>();

		// Use a transaction for atomic imports
		await db.transaction(async (tx) => {
			// Import folders first
			for (const folder of exportData.folders) {
				try {
					const [newFolder] = await tx
						.insert(folders)
						.values({
							name: folder.name,
							slug: folder.slug,
							description: folder.description || null,
							meta: folder.meta || {},
						})
						.returning();

					folderIdMap.set(folder.id, newFolder.id);
					results.folders++;
				} catch (error) {
					console.error('[API] Failed to import folder:', error);
				}
			}

			// Import mocks with updated folder IDs
			for (const mock of exportData.mocks) {
				try {
					const mappedFolderId =
						folderIdMap.get(mock.folderId) || mock.folderId;

					await tx.insert(mockResponses).values({
						name: mock.name,
						endpoint: mock.path,
						method: mock.method,
						statusCode: mock.statusCode,
						response: mock.response,
						folderId: mappedFolderId,
						matchType: mock.matchType || 'exact',
						bodyType: mock.bodyType || 'json',
						enabled: mock.enabled ?? true,
						jsonSchema: mock.jsonSchema,
						useDynamicResponse: mock.useDynamicResponse ?? false,
						echoRequestBody: mock.echoRequestBody ?? false,
					});

					results.mocks++;
				} catch (error) {
					console.error('[API] Failed to import mock:', error);
				}
			}
		});

		return NextResponse.json({
			success: true,
			imported: results,
		});
	} catch (error: unknown) {
		console.error('[API] Import error:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Failed to import data' },
			{ status: 500 },
		);
	}
}
