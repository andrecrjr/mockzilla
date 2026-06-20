import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
	folders,
	mockResponses,
	mockSubfolders,
	scenarioState,
	scenarios,
	transitions,
} from '@/lib/db/schema';
import {
	collectDescendantSubfolders,
	computeCanonicalSubfolderMainPaths,
	computeSubtreeMainPaths,
	deriveSubfolderMainPath,
	findMainPathConflict,
	withCanonicalSubfolderMainPaths,
} from '@/lib/mock-subfolders';
import type {
	Condition,
	ConditionTrace,
	CreateMockRequest,
	HttpMethod,
	MatchType,
	MockVariant,
	Scenario,
	Transition,
} from '@/lib/types';
import type { MockCandidate } from '@/lib/utils/mock-matcher';
import {
	extractCaptureKey,
	findBestMatch,
	selectVariant,
} from '@/lib/utils/mock-matcher';
import { joinMockPaths } from '@/lib/utils/mock-paths';
import type {
	ListFoldersArgs,
	CreateFolderArgs,
	GetFolderArgs,
	UpdateFolderArgs,
	DeleteFolderArgs,
	ManageFoldersArgs,
	ListMockSubfoldersArgs,
	CreateMockSubfolderArgs,
	GetMockSubfolderArgs,
	UpdateMockSubfolderArgs,
	DeleteMockSubfolderArgs,
	ManageMockSubfoldersArgs,
} from './schemas/folders';
import type {
	CreateMockArgs,
	ListMocksArgs,
	GetMockArgs,
	UpdateMockArgs,
	DeleteMockArgs,
	PreviewMockArgs,
	ManageMocksArgs,
} from './schemas/mocks';
import type {
	ListWorkflowTransitionsArgs,
	CreateWorkflowTransitionArgs,
	UpdateWorkflowTransitionArgs,
	DeleteWorkflowTransitionArgs,
	CreateWorkflowScenarioArgs,
	DeleteWorkflowScenarioArgs,
	ResetWorkflowStateArgs,
	InspectWorkflowStateArgs,
	ListWorkflowScenariosArgs,
	TestWorkflowArgs,
	ExportWorkflowArgs,
	ImportWorkflowArgs,
	CreateFullWorkflowArgs,
	EvaluateTemplateArgs,
	SeedWorkflowStateArgs,
	ManageScenariosArgs,
	ManageTransitionsArgs,
	WorkflowControlArgs,
} from './schemas/workflows';
import type {
	GetLogsArgs,
	GetRequestTraceArgs,
	ManageLogsArgs,
} from './schemas/logs';

// Helpers
export function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');
}

// FOLDER HANDLERS
import { logger } from '../logger';

export async function callListFolders(args: ListFoldersArgs) {
	logger.info({ args }, 'MCP Tool: list_folders');
	const page = args.page ?? 1;
	const limit = args.limit ?? 10;
	const offset = (page - 1) * limit;
	const [totalResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(folders);
	const total = Number(totalResult.count);
	const totalPages = Math.ceil(total / limit);
	const rows = await db
		.select()
		.from(folders)
		.orderBy(folders.createdAt)
		.limit(limit)
		.offset(offset);
	const data = rows.map((folder) => ({
		id: folder.id,
		name: folder.name,
		slug: folder.slug,
		description: folder.description || null,
		meta: folder.meta || {},
		createdAt: folder.createdAt.toISOString(),
		updatedAt: folder.updatedAt?.toISOString() || null,
	}));
	return { data, meta: { total, page, limit, totalPages } };
}

export async function callCreateFolder(args: CreateFolderArgs) {
	logger.info({ args }, 'MCP Tool: create_folder');
	const slug = generateSlug(args.name);
	const [row] = await db
		.insert(folders)
		.values({
			name: args.name,
			slug,
			description: args.description ?? null,
		})
		.returning();
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		description: row.description ?? null,
		meta: row.meta || {},
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() ?? null,
	};
}

export async function callGetFolder(args: GetFolderArgs) {
	logger.info({ args }, 'MCP Tool: get_folder');
	let row: typeof folders.$inferSelect | null = null;
	if (args.id) {
		[row] = await db.select().from(folders).where(eq(folders.id, args.id));
	} else if (args.slug) {
		[row] = await db.select().from(folders).where(eq(folders.slug, args.slug));
	}
	if (!row) return null;
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		description: row.description || null,
		meta: row.meta || {},
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() || null,
	};
}

export async function callUpdateFolder(args: UpdateFolderArgs) {
	logger.info({ args }, 'MCP Tool: update_folder');
	const slug = generateSlug(args.name);
	const [row] = await db
		.update(folders)
		.set({
			name: args.name,
			slug,
			description: args.description ?? null,
			updatedAt: new Date(),
		})
		.where(eq(folders.id, args.id))
		.returning();
	if (!row) return null;
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		description: row.description || null,
		meta: row.meta || {},
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() || null,
	};
}

export async function callDeleteFolder(args: DeleteFolderArgs) {
	logger.info({ args }, 'MCP Tool: delete_folder');
	await db.delete(folders).where(eq(folders.id, args.id));
	return { success: true } as const;
}

export async function callManageFolders(args: ManageFoldersArgs) {
	switch (args.action) {
		case 'list':
			return callListFolders(args);
		case 'create':
			return callCreateFolder(args);
		case 'get':
			return callGetFolder(args);
		case 'update':
			return callUpdateFolder(args);
		case 'delete':
			return callDeleteFolder(args);
		default:
			throw new Error(`Unknown action: ${(args as { action: string }).action}`);
	}
}

type MockSubfolderRow = typeof mockSubfolders.$inferSelect;

function formatMockSubfolder(row: MockSubfolderRow, canonicalMainPath?: string) {
	return {
		id: row.id,
		folderId: row.folderId,
		parentId: row.parentId,
		name: row.name,
		slug: row.slug,
		mainPath: canonicalMainPath ?? row.mainPath,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() ?? null,
	};
}

function getEffectiveMockEndpoint(
	mock: typeof mockResponses.$inferSelect,
	subfoldersById: Map<string, MockSubfolderRow>,
): string {
	const subfolder = mock.mockFolderId
		? subfoldersById.get(mock.mockFolderId)
		: undefined;
	return joinMockPaths(subfolder?.mainPath ?? '/', mock.endpoint);
}

async function resolveFolderIdForSubfolders(args: {
	folderId?: string | null;
	folderSlug?: string | null;
}): Promise<string> {
	if (args.folderId) return args.folderId;
	if (args.folderSlug) {
		const [folder] = await db
			.select()
			.from(folders)
			.where(eq(folders.slug, args.folderSlug))
			.limit(1);
		if (!folder) {
			throw new Error('Folder not found for provided slug');
		}
		return folder.id;
	}
	throw new Error('folderId or folderSlug is required');
}

function hasMockSubfolderSiblingSlugInRows(
	rows: MockSubfolderRow[],
	parentId: string | null,
	slug: string,
	excludeId?: string,
): boolean {
	return rows.some(
		(row) =>
			row.parentId === parentId &&
			row.slug === slug &&
			row.id !== excludeId,
	);
}

export async function callListMockSubfolders(args: ListMockSubfoldersArgs) {
	logger.info({ args }, 'MCP Tool: list_mock_subfolders');
	const folderId = await resolveFolderIdForSubfolders(args);
	const parentId = args.parentId ?? null;
	const folderSubfolders = await db
		.select()
		.from(mockSubfolders)
		.where(eq(mockSubfolders.folderId, folderId));
	const canonicalPaths = computeCanonicalSubfolderMainPaths(folderSubfolders);
	const rows = args.all
		? [...folderSubfolders].sort((a, b) =>
				(canonicalPaths.get(a.id) ?? a.mainPath).localeCompare(
					canonicalPaths.get(b.id) ?? b.mainPath,
				),
			)
		: folderSubfolders
				.filter((row) =>
					parentId ? row.parentId === parentId : row.parentId === null,
				)
				.sort((a, b) => a.name.localeCompare(b.name));

	return rows.map((row) => formatMockSubfolder(row, canonicalPaths.get(row.id)));
}

export async function callCreateMockSubfolder(args: CreateMockSubfolderArgs) {
	logger.info({ args }, 'MCP Tool: create_mock_subfolder');
	const folderId = await resolveFolderIdForSubfolders(args);
	const parentId = args.parentId ?? null;
	const slug = generateSlug(args.name);
	if (!slug) {
		throw new Error('Subfolder name is invalid');
	}

	const folderSubfolders = await db
		.select()
		.from(mockSubfolders)
		.where(eq(mockSubfolders.folderId, folderId));
	const canonicalPaths = computeCanonicalSubfolderMainPaths(folderSubfolders);
	const parent = parentId
		? (folderSubfolders.find((row) => row.id === parentId) ?? null)
		: null;
	if (parentId && !parent) {
		throw new Error('Parent subfolder not found');
	}
	if (hasMockSubfolderSiblingSlugInRows(folderSubfolders, parentId, slug)) {
		throw new Error('A subfolder with this name already exists here');
	}
	const parentMainPath = parent
		? canonicalPaths.get(parent.id) ?? parent.mainPath
		: null;

	const [row] = await db
		.insert(mockSubfolders)
		.values({
			folderId,
			parentId,
			name: args.name.trim(),
			slug,
			mainPath: deriveSubfolderMainPath(parentMainPath, slug),
		})
		.returning();

	return formatMockSubfolder(row);
}

export async function callGetMockSubfolder(args: GetMockSubfolderArgs) {
	logger.info({ args }, 'MCP Tool: get_mock_subfolder');
	const [row] = await db
		.select()
		.from(mockSubfolders)
		.where(eq(mockSubfolders.id, args.id))
		.limit(1);
	if (!row) return null;
	const folderSubfolders = await db
		.select()
		.from(mockSubfolders)
		.where(eq(mockSubfolders.folderId, row.folderId));
	const canonicalPaths = computeCanonicalSubfolderMainPaths(folderSubfolders);
	return formatMockSubfolder(row, canonicalPaths.get(row.id));
}

export async function callUpdateMockSubfolder(args: UpdateMockSubfolderArgs) {
	logger.info({ args }, 'MCP Tool: update_mock_subfolder');
	const [existing] = await db
		.select()
		.from(mockSubfolders)
		.where(eq(mockSubfolders.id, args.id))
		.limit(1);
	if (!existing) return null;

	const nextParentId =
		args.parentId === undefined ? existing.parentId : args.parentId;
	const nextName = args.name?.trim() ?? existing.name;
	const nextSlug =
		args.name === undefined ? existing.slug : generateSlug(nextName);
	if (!nextSlug) {
		throw new Error('Subfolder name is invalid');
	}
	if (nextParentId === args.id) {
		throw new Error('Subfolder cannot be its own parent');
	}

	const storedFolderSubfolders = await db
		.select()
		.from(mockSubfolders)
		.where(eq(mockSubfolders.folderId, existing.folderId));
	const folderSubfolders = withCanonicalSubfolderMainPaths(storedFolderSubfolders);
	const descendants = collectDescendantSubfolders(folderSubfolders, args.id);
	const descendantIds = new Set(descendants.map((row) => row.id));
	if (nextParentId && descendantIds.has(nextParentId)) {
		throw new Error('Subfolder cannot be moved under its descendant');
	}

	const parent = nextParentId
		? (folderSubfolders.find((row) => row.id === nextParentId) ?? null)
		: null;
	if (nextParentId && !parent) {
		throw new Error('Parent subfolder not found');
	}
	if (hasMockSubfolderSiblingSlugInRows(folderSubfolders, nextParentId, nextSlug, args.id)) {
		throw new Error('A subfolder with this name already exists here');
	}

	const nextMainPath = deriveSubfolderMainPath(parent?.mainPath, nextSlug);
	const rootUpdate: MockSubfolderRow = {
		...existing,
		parentId: nextParentId,
		name: nextName,
		slug: nextSlug,
		mainPath: nextMainPath,
	};
	const rowsForPathComputation = folderSubfolders.map((row) =>
		row.id === args.id ? rootUpdate : row,
	);
	const nextPaths = computeSubtreeMainPaths(rowsForPathComputation, rootUpdate);
	const conflictingPath = findMainPathConflict(folderSubfolders, nextPaths);
	if (conflictingPath) {
		throw new Error('A subfolder with this main path already exists');
	}

	const row = await db.transaction(async (tx) => {
		const [updatedRoot] = await tx
			.update(mockSubfolders)
			.set({
				parentId: nextParentId,
				name: nextName,
				slug: nextSlug,
				mainPath: nextMainPath,
				updatedAt: new Date(),
			})
			.where(eq(mockSubfolders.id, args.id))
			.returning();

		for (const descendant of descendants) {
			const descendantMainPath = nextPaths.get(descendant.id);
			if (!descendantMainPath || descendantMainPath === descendant.mainPath) {
				continue;
			}
			await tx
				.update(mockSubfolders)
				.set({
					mainPath: descendantMainPath,
					updatedAt: new Date(),
				})
				.where(eq(mockSubfolders.id, descendant.id));
		}

		return updatedRoot;
	});

	return formatMockSubfolder(row);
}

export async function callDeleteMockSubfolder(args: DeleteMockSubfolderArgs) {
	logger.info({ args }, 'MCP Tool: delete_mock_subfolder');
	const [childCount] = await db
		.select({ count: sql<number>`count(*)` })
		.from(mockSubfolders)
		.where(eq(mockSubfolders.parentId, args.id));
	const [mockCount] = await db
		.select({ count: sql<number>`count(*)` })
		.from(mockResponses)
		.where(eq(mockResponses.mockFolderId, args.id));

	if (Number(childCount.count) > 0 || Number(mockCount.count) > 0) {
		throw new Error('Subfolder must be empty before it can be deleted');
	}

	await db.delete(mockSubfolders).where(eq(mockSubfolders.id, args.id));
	return { success: true } as const;
}

export async function callManageMockSubfolders(args: ManageMockSubfoldersArgs) {
	switch (args.action) {
		case 'list':
			return callListMockSubfolders(args);
		case 'create':
			return callCreateMockSubfolder(args);
		case 'get':
			return callGetMockSubfolder(args);
		case 'update':
			return callUpdateMockSubfolder(args);
		case 'delete':
			return callDeleteMockSubfolder(args);
		default: {
			const exhaustive: never = args;
			throw new Error(`Unknown action: ${JSON.stringify(exhaustive)}`);
		}
	}
}

// MOCK HANDLERS
export async function callCreateMock(args: CreateMockArgs) {
	logger.info({ args }, 'MCP Tool: create_mock');
	const folderSlug = args.folderSlug ?? null;
	const folderIdArg = args.folderId ?? null;
	let targetFolderId: string | null = folderIdArg;
	if (!targetFolderId && folderSlug) {
		const [folder] = await db
			.select()
			.from(folders)
			.where(eq(folders.slug, folderSlug))
			.limit(1);
		if (!folder) {
			throw new Error('Folder not found for provided slug');
		}
		targetFolderId = folder.id;
	}
	if (!targetFolderId) {
		throw new Error('folderSlug or folderId is required');
	}

	const body: CreateMockRequest = {
		name: args.name,
		path: args.path,
		method: args.method as HttpMethod,
		statusCode: args.statusCode,
		folderId: targetFolderId,
		mockFolderId: args.mockFolderId ?? null,
		response: args.response,
		matchType: args.matchType,
		bodyType: args.bodyType,
		enabled: args.enabled,
		queryParams: args.queryParams,
		variants: args.variants as MockVariant[] | null,
		wildcardRequireMatch: args.wildcardRequireMatch,
		jsonSchema: args.jsonSchema ?? undefined,
		useDynamicResponse: args.useDynamicResponse ?? undefined,
		echoRequestBody: args.echoRequestBody ?? undefined,
		delay: args.delay ?? undefined,
	};
	const [row] = await db
		.insert(mockResponses)
		.values({
			name: body.name,
			endpoint: body.path,
			method: body.method,
			statusCode: body.statusCode,
			response: body.response,
			folderId: body.folderId,
			mockFolderId: body.mockFolderId ?? null,
			matchType: body.matchType || 'exact',
			bodyType: body.bodyType || 'json',
			enabled: body.enabled ?? true,
			queryParams: body.queryParams || null,
			variants: body.variants || null,
			wildcardRequireMatch: body.wildcardRequireMatch ?? false,
			jsonSchema: body.jsonSchema,
			useDynamicResponse: body.useDynamicResponse ?? false,
			echoRequestBody: body.echoRequestBody ?? false,
			delay: body.delay ?? 0,
		})
		.returning();

	return {
		id: row.id,
		name: row.name,
		path: row.endpoint,
		method: row.method,
		response: row.response,
		statusCode: row.statusCode,
		folderId: row.folderId,
		mockFolderId: row.mockFolderId,
		matchType: (row.matchType as MatchType) || 'exact',
		bodyType: row.bodyType || 'json',
		enabled: row.enabled,
		queryParams: row.queryParams as Record<string, string> | null,
		variants: row.variants as MockVariant[] | null,
		wildcardRequireMatch: row.wildcardRequireMatch,
		jsonSchema: row.jsonSchema || null,
		useDynamicResponse: row.useDynamicResponse,
		echoRequestBody: row.echoRequestBody,
		delay: row.delay,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() || null,
	};
}

export async function callListMocks(args: ListMocksArgs) {
	logger.info({ args }, 'MCP Tool: list_mocks');
	const page = args.page ?? 1;
	const limit = args.limit ?? 10;
	const offset = (page - 1) * limit;

	const folderSlug = args.folderSlug ?? null;
	const folderIdArg = args.folderId ?? null;
	let targetFolderId: string | null = folderIdArg;
	if (!targetFolderId && folderSlug) {
		const [folder] = await db
			.select()
			.from(folders)
			.where(eq(folders.slug, folderSlug))
			.limit(1);
		if (folder) {
			targetFolderId = folder.id;
		}
	}

	let total = 0;
	let rows: (typeof mockResponses.$inferSelect)[] = [];
	const mockFolderClause =
		args.mockFolderId === null
			? isNull(mockResponses.mockFolderId)
			: args.mockFolderId
				? eq(mockResponses.mockFolderId, args.mockFolderId)
				: undefined;
	if (targetFolderId) {
		const whereClause = mockFolderClause
			? and(eq(mockResponses.folderId, targetFolderId), mockFolderClause)
			: eq(mockResponses.folderId, targetFolderId);
		const [countRow] = await db
			.select({ count: sql<number>`count(*)` })
			.from(mockResponses)
			.where(whereClause);
		total = Number(countRow.count);
		rows = await db
			.select()
			.from(mockResponses)
			.where(whereClause)
			.orderBy(mockResponses.createdAt)
			.limit(limit)
			.offset(offset);
	} else {
		const [countRow] = await db
			.select({ count: sql<number>`count(*)` })
			.from(mockResponses);
		total = Number(countRow.count);
		rows = await db
			.select()
			.from(mockResponses)
			.orderBy(mockResponses.createdAt)
			.limit(limit)
			.offset(offset);
	}
	const totalPages = Math.ceil(total / limit);
	const data = rows.map((row) => ({
		id: row.id,
		name: row.name,
		path: row.endpoint,
		method: row.method,
		response: row.response,
		statusCode: row.statusCode,
		folderId: row.folderId,
		mockFolderId: row.mockFolderId,
		matchType: (row.matchType as MatchType) || 'exact',
		bodyType: row.bodyType || 'json',
		enabled: row.enabled,
		queryParams: row.queryParams as Record<string, string> | null,
		variants: row.variants as MockVariant[] | null,
		wildcardRequireMatch: row.wildcardRequireMatch,
		jsonSchema: row.jsonSchema,
		useDynamicResponse: row.useDynamicResponse,
		echoRequestBody: row.echoRequestBody,
		delay: row.delay,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() || null,
	}));
	return { data, meta: { total, page, limit, totalPages } };
}

export async function callGetMock(args: GetMockArgs) {
	logger.info({ args }, 'MCP Tool: get_mock');
	const [row] = await db
		.select()
		.from(mockResponses)
		.where(eq(mockResponses.id, args.id));
	if (!row) return null;
	return {
		id: row.id,
		name: row.name,
		path: row.endpoint,
		method: row.method,
		response: row.response,
		statusCode: row.statusCode,
		folderId: row.folderId,
		mockFolderId: row.mockFolderId,
		matchType: (row.matchType as MatchType) || 'exact',
		bodyType: row.bodyType || 'json',
		enabled: row.enabled,
		queryParams: row.queryParams as Record<string, string> | null,
		variants: row.variants as MockVariant[] | null,
		wildcardRequireMatch: row.wildcardRequireMatch,
		jsonSchema: row.jsonSchema,
		useDynamicResponse: row.useDynamicResponse,
		echoRequestBody: row.echoRequestBody,
		delay: row.delay,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() || null,
	};
}

export async function callUpdateMock(args: UpdateMockArgs) {
	logger.info({ args }, 'MCP Tool: update_mock');
	const [row] = await db
		.update(mockResponses)
		.set({
			name: args.name,
			endpoint: args.path,
			method: args.method,
			statusCode: args.statusCode,
			response: args.response,
			mockFolderId: args.mockFolderId ?? undefined,
			matchType: args.matchType || 'exact',
			bodyType: args.bodyType || 'json',
			enabled: args.enabled ?? true,
			queryParams: args.queryParams || null,
			variants: args.variants || null,
			wildcardRequireMatch: args.wildcardRequireMatch ?? false,
			jsonSchema: args.jsonSchema ?? null,
			useDynamicResponse: args.useDynamicResponse ?? false,
			echoRequestBody: args.echoRequestBody ?? false,
			delay: args.delay ?? 0,
			updatedAt: new Date(),
		})
		.where(eq(mockResponses.id, args.id))
		.returning();
	if (!row) return null;
	return {
		id: row.id,
		name: row.name,
		path: row.endpoint,
		method: row.method,
		response: row.response,
		statusCode: row.statusCode,
		folderId: row.folderId,
		mockFolderId: row.mockFolderId,
		matchType: (row.matchType as MatchType) || 'exact',
		bodyType: row.bodyType || 'json',
		enabled: row.enabled,
		queryParams: row.queryParams as Record<string, string> | null,
		variants: row.variants as MockVariant[] | null,
		wildcardRequireMatch: row.wildcardRequireMatch,
		jsonSchema: row.jsonSchema,
		useDynamicResponse: row.useDynamicResponse,
		echoRequestBody: row.echoRequestBody,
		delay: row.delay,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() || null,
	};
}

export async function callDeleteMock(args: DeleteMockArgs) {
	logger.info({ args }, 'MCP Tool: delete_mock');
	await db.delete(mockResponses).where(eq(mockResponses.id, args.id));
	return { success: true } as const;
}

export async function callManageMocks(args: ManageMocksArgs) {
	switch (args.action) {
		case 'list':
			return callListMocks(args);
		case 'create':
			if (args.jsonSchema && !args.response) {
				const { generateFromSchemaString } = await import(
					'@/lib/schema-generator'
				);
				const generated = generateFromSchemaString(args.jsonSchema);
				return callCreateMock({
					...args,
					response: generated,
					useDynamicResponse: true,
				} as CreateMockArgs);
			}
			return callCreateMock(args as CreateMockArgs);
		case 'get':
			return callGetMock(args);
		case 'update':
			return callUpdateMock(args as UpdateMockArgs);
		case 'delete':
			return callDeleteMock(args);
		case 'preview':
			return callPreviewMock(args);
		default:
			throw new Error(`Unknown action: ${(args as { action: string }).action}`);
	}
}

export async function callCreateSchemaMock(args: {
	name: string;
	path: string;
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
	statusCode: number;
	folderSlug?: string | null;
	folderId?: string | null;
	mockFolderId?: string | null;
	jsonSchema: string;
	enabled?: boolean;
	matchType?: MatchType;
	queryParams?: Record<string, string> | null;
	variants?: MockVariant[] | null;
	wildcardRequireMatch?: boolean;
	echoRequestBody?: boolean | null;
	delay?: number;
}) {
	logger.info({ args }, 'MCP Tool: create_schema_mock');
	const folderSlug = args.folderSlug ?? null;
	const folderIdArg = args.folderId ?? null;
	let targetFolderId: string | null = folderIdArg;
	if (!targetFolderId && folderSlug) {
		const [folder] = await db
			.select()
			.from(folders)
			.where(eq(folders.slug, folderSlug))
			.limit(1);
		if (!folder) {
			throw new Error('Folder not found for provided slug');
		}
		targetFolderId = folder.id;
	}
	if (!targetFolderId) {
		throw new Error('folderSlug or folderId is required');
	}

	const { validateSchema, generateFromSchemaString } = await import(
		'@/lib/schema-generator'
	);
	const validation = validateSchema(args.jsonSchema);
	if (!validation.valid) {
		throw new Error(validation.error || 'Invalid JSON Schema');
	}
	const generated = generateFromSchemaString(args.jsonSchema);

	const [row] = await db
		.insert(mockResponses)
		.values({
			name: args.name,
			endpoint: args.path,
			method: args.method,
			statusCode: args.statusCode,
			response: generated,
			folderId: targetFolderId,
			mockFolderId: args.mockFolderId ?? null,
			matchType: args.matchType || 'exact',
			bodyType: 'json',
			enabled: args.enabled ?? true,
			queryParams: args.queryParams || null,
			variants: args.variants || null,
			wildcardRequireMatch: args.wildcardRequireMatch ?? false,
			jsonSchema: args.jsonSchema,
			useDynamicResponse: true,
			echoRequestBody: (args.echoRequestBody ?? false) as boolean,
			delay: args.delay ?? 0,
		})
		.returning();

	return {
		id: row.id,
		name: row.name,
		path: row.endpoint,
		method: row.method,
		response: row.response,
		statusCode: row.statusCode,
		folderId: row.folderId,
		mockFolderId: row.mockFolderId,
		matchType: (row.matchType as MatchType) || 'exact',
		bodyType: row.bodyType || 'json',
		enabled: row.enabled,
		queryParams: row.queryParams as Record<string, string> | null,
		variants: row.variants as MockVariant[] | null,
		wildcardRequireMatch: row.wildcardRequireMatch,
		jsonSchema: row.jsonSchema || null,
		useDynamicResponse: row.useDynamicResponse,
		echoRequestBody: row.echoRequestBody,
		delay: row.delay,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() || null,
	};
}

export async function callPreviewMock(args: PreviewMockArgs) {
	logger.info({ args }, 'MCP Tool: preview_mock');
	const folderSlug = args.folderSlug;
	const mockPath = args.path.startsWith('/') ? args.path : `/${args.path}`;
	const method = args.method;
	const urlQueryParams = args.queryParams || {};

	const [folder] = await db
		.select()
		.from(folders)
		.where(eq(folders.slug, folderSlug))
		.limit(1);
	if (!folder)
		return {
			statusCode: 404,
			headers: {},
			isJson: true,
			body: { error: 'Folder not found' },
		};

	// Fetch all mocks for folder+method to find best match (same as live server)
	const allMocks = await db
		.select()
		.from(mockResponses)
		.where(
			and(
				eq(mockResponses.folderId, folder.id),
				eq(mockResponses.method, method),
				eq(mockResponses.enabled, true),
			),
		);
	const subfolders = await db
		.select()
		.from(mockSubfolders)
		.where(eq(mockSubfolders.folderId, folder.id));
	const canonicalSubfolders = withCanonicalSubfolderMainPaths(subfolders);
	const subfoldersById = new Map(
		canonicalSubfolders.map((subfolder) => [subfolder.id, subfolder]),
	);

	const candidates: MockCandidate[] = allMocks.map((m) => ({
		endpoint: getEffectiveMockEndpoint(m, subfoldersById),
		matchType: (m.matchType as MatchType) || 'exact',
		queryParams: (m.queryParams as Record<string, string> | null) ?? null,
		_score: 0,
		_id: m.id,
	}));

	const best = findBestMatch(mockPath, urlQueryParams, candidates);

	if (!best) {
		return {
			statusCode: 404,
			headers: {},
			isJson: true,
			body: {
				error: 'Mock endpoint not found',
				folder: folderSlug,
				path: mockPath,
				method,
				queryParams: urlQueryParams,
			},
		};
	}

	const bestMock = allMocks.find((m) => m.id === best._id);

	if (!bestMock) {
		return {
			statusCode: 404,
			headers: {},
			isJson: true,
			body: { error: 'Mock record not found after matching' },
		};
	}

	let finalResponse = bestMock.response;
	let finalStatusCode = bestMock.statusCode;
	let finalBodyType = bestMock.bodyType || 'json';
	let paramsMap: Record<string, string> = {};
	const effectiveEndpoint = getEffectiveMockEndpoint(bestMock, subfoldersById);

	// Handle Wildcard Variants
	if (bestMock.matchType === 'wildcard') {
		const variants = bestMock.variants as MockVariant[] | null;
		if (variants && variants.length > 0) {
			const variant = selectVariant(variants, mockPath, effectiveEndpoint);
			if (variant) {
				finalResponse = variant.body;
				finalStatusCode = variant.statusCode;
				finalBodyType = variant.bodyType as 'json' | 'text';

				const captures =
					extractCaptureKey(mockPath, effectiveEndpoint)?.split('|') || [];
				for (let i = 0; i < captures.length; i++) {
					paramsMap[String(i)] = captures[i];
				}
			} else if (bestMock.wildcardRequireMatch) {
				return {
					statusCode: 404,
					headers: {},
					isJson: true,
					body: { error: 'No matching variant found for wildcard' },
				};
			}
		}

		if (Object.keys(paramsMap).length === 0) {
			const captures =
				extractCaptureKey(mockPath, effectiveEndpoint)?.split('|') || [];
			for (let i = 0; i < captures.length; i++) {
				paramsMap[String(i)] = captures[i];
			}
		}
	}

	if (bestMock.echoRequestBody) {
		return {
			statusCode: finalStatusCode,
			headers: { 'Content-Type': 'application/json' },
			isJson: true,
			body: args.bodyJson || { message: 'Echo: body would be here' },
		};
	}

	const context = {
		input: {
			query: urlQueryParams,
			params: paramsMap,
			headers: args.headers || {},
			body: args.bodyJson || {},
		},
	};

	if (bestMock.useDynamicResponse && bestMock.jsonSchema) {
		try {
			const { generateFromSchema } = await import('@/lib/schema-generator');
			const { faker } = await import('@faker-js/faker');

			const enrichedContext = {
				...context,
				query: urlQueryParams,
				params: paramsMap,
				headers: args.headers || {},
				body: args.bodyJson || {},
				$: context.input,
				faker,
			};

			const generated = generateFromSchema(
				JSON.parse(bestMock.jsonSchema),
				enrichedContext,
			);
			return {
				statusCode: finalStatusCode,
				headers: { 'Content-Type': 'application/json' },
				isJson: true,
				body: JSON.parse(generated),
			};
		} catch (e) {
			logger.error({ err: e, args }, 'MCP Tool Error: preview_mock');
			return {
				statusCode: 500,
				headers: {},
				isJson: true,
				body: { error: 'Dynamic generation failed', details: String(e) },
			};
		}
	}

	// Template interpolation for static response
	const { replaceTemplates } = await import('@/lib/engine/interpolation');
	const { faker } = await import('@faker-js/faker');

	const enrichedContext = {
		...context,
		// Shortcuts
		query: urlQueryParams,
		params: paramsMap,
		headers: args.headers || {},
		body: args.bodyJson || {},
		// $. alias
		$: context.input,
		faker,
	};

	const interpolated = replaceTemplates(finalResponse, enrichedContext);

	if (finalBodyType === 'json') {
		if (typeof interpolated === 'object' && interpolated !== null) {
			return {
				statusCode: finalStatusCode,
				headers: { 'Content-Type': 'application/json' },
				isJson: true,
				body: interpolated,
			};
		}
		try {
			return {
				statusCode: finalStatusCode,
				headers: { 'Content-Type': 'application/json' },
				isJson: true,
				body: JSON.parse(String(interpolated)),
			};
		} catch {
			return {
				statusCode: finalStatusCode,
				headers: { 'Content-Type': 'text/plain' },
				isJson: false,
				body: String(interpolated),
			};
		}
	}

	return {
		statusCode: finalStatusCode,
		headers: { 'Content-Type': 'text/plain' },
		isJson: false,
		body: String(interpolated),
	};
}

// WORKFLOW HANDLERS
export async function callCreateWorkflowTransition(
	args: CreateWorkflowTransitionArgs,
) {
	logger.info({ args }, 'MCP Tool: create_workflow_transition');
	// Ensure scenario exists (auto-create if not)
	const [existingScenario] = await db
		.select()
		.from(scenarios)
		.where(eq(scenarios.id, args.scenarioId));

	if (!existingScenario) {
		// Auto-create scenario with scenarioId as both id and name
		await db
			.insert(scenarios)
			.values({
				id: args.scenarioId,
				name: args.scenarioId,
				description: `Auto-created scenario for ${args.scenarioId}`,
			})
			.onConflictDoNothing();
	}

	const [row] = await db
		.insert(transitions)
		.values({
			scenarioId: args.scenarioId,
			name: args.name,
			description: args.description ?? null,
			path: args.path,
			method: args.method,
			conditions: args.conditions ?? {},
			effects: args.effects ?? [],
			response: args.response,
			meta: args.meta ?? {},
		})
		.returning();

	return row;
}

export async function callResetWorkflowState(args: ResetWorkflowStateArgs) {
	logger.info({ args }, 'MCP Tool: reset_workflow_state');
	await db
		.delete(scenarioState)
		.where(eq(scenarioState.scenarioId, args.scenarioId));
	return { success: true };
}

export async function callInspectWorkflowState(args: InspectWorkflowStateArgs) {
	logger.info({ args }, 'MCP Tool: inspect_workflow_state');
	const [row] = await db
		.select()
		.from(scenarioState)
		.where(eq(scenarioState.scenarioId, args.scenarioId));
	return row ? row.data : { tables: {}, state: {} };
}

export async function callUpdateWorkflowTransition(
	args: UpdateWorkflowTransitionArgs,
) {
	logger.info({ args }, 'MCP Tool: update_workflow_transition');
	const updateData: Record<string, unknown> = { updatedAt: new Date() };
	if (args.name !== undefined) updateData.name = args.name;
	if (args.description !== undefined) updateData.description = args.description;
	if (args.path !== undefined) updateData.path = args.path;
	if (args.method !== undefined) updateData.method = args.method;
	if (args.conditions !== undefined) updateData.conditions = args.conditions;
	if (args.effects !== undefined) updateData.effects = args.effects;
	if (args.response !== undefined) updateData.response = args.response;
	if (args.meta !== undefined) updateData.meta = args.meta;

	const [row] = await db
		.update(transitions)
		.set(updateData)
		.where(eq(transitions.id, args.id))
		.returning();

	if (!row) return { error: 'Transition not found' };
	return row;
}

export async function callDeleteWorkflowTransition(
	args: DeleteWorkflowTransitionArgs,
) {
	logger.info({ args }, 'MCP Tool: delete_workflow_transition');
	await db.delete(transitions).where(eq(transitions.id, args.id));
	return { success: true } as const;
}

export async function callManageScenarios(args: ManageScenariosArgs) {
	switch (args.action) {
		case 'list':
			return callListWorkflowScenarios(args);
		case 'create':
			return callCreateWorkflowScenario(args);
		case 'delete':
			return callDeleteWorkflowScenario(args);
		case 'export':
			return callExportWorkflow(args);
		case 'import':
			return callImportWorkflow(args);
		default:
			throw new Error(`Unknown action: ${(args as { action: string }).action}`);
	}
}

export async function callManageTransitions(args: ManageTransitionsArgs) {
	switch (args.action) {
		case 'list':
			return callListWorkflowTransitions(args);
		case 'create':
			return callCreateWorkflowTransition(args);
		case 'update':
			return callUpdateWorkflowTransition(args);
		case 'delete':
			return callDeleteWorkflowTransition(args);
		case 'create_full':
			return callCreateFullWorkflow(args);
		default:
			throw new Error(`Unknown action: ${(args as { action: string }).action}`);
	}
}

export async function callWorkflowControl(args: WorkflowControlArgs) {
	switch (args.action) {
		case 'reset':
			return callResetWorkflowState(args);
		case 'inspect':
			return callInspectWorkflowState(args);
		case 'seed':
			return callSeedWorkflowState(args);
		case 'test':
			return callTestWorkflow(args);
		case 'evaluate_template':
			return callEvaluateTemplate(args);
		default:
			throw new Error(`Unknown action: ${(args as { action: string }).action}`);
	}
}

export async function callListWorkflowTransitions(
	args: ListWorkflowTransitionsArgs,
) {
	logger.info({ args }, 'MCP Tool: list_workflow_transitions');
	const rows = await db
		.select()
		.from(transitions)
		.where(eq(transitions.scenarioId, args.scenarioId))
		.orderBy(transitions.createdAt);
	return rows;
}

export async function callCreateWorkflowScenario(
	args: CreateWorkflowScenarioArgs,
) {
	logger.info({ args }, 'MCP Tool: create_workflow_scenario');
	const id = generateSlug(args.name);
	const [row] = await db
		.insert(scenarios)
		.values({
			id,
			name: args.name,
			description: args.description ?? null,
		})
		.returning();
	return row;
}

export async function callListWorkflowScenarios(
	args: ListWorkflowScenariosArgs,
) {
	logger.info({ args }, 'MCP Tool: list_workflow_scenarios');
	const page = args.page ?? 1;
	const limit = args.limit ?? 10;
	const offset = (page - 1) * limit;

	const [totalResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(scenarios);
	const total = Number(totalResult.count);
	const totalPages = Math.ceil(total / limit);

	const rows = await db
		.select()
		.from(scenarios)
		.orderBy(scenarios.createdAt)
		.limit(limit)
		.offset(offset);

	return { data: rows, meta: { total, page, limit, totalPages } };
}

export async function callDeleteWorkflowScenario(
	args: DeleteWorkflowScenarioArgs,
) {
	logger.info({ args }, 'MCP Tool: delete_workflow_scenario');
	await db.transaction(async (tx) => {
		await tx.delete(scenarios).where(eq(scenarios.id, args.id));
		await tx.delete(scenarioState).where(eq(scenarioState.scenarioId, args.id));
		await tx.delete(transitions).where(eq(transitions.scenarioId, args.id));
	});
	return { success: true };
}

export async function callTestWorkflow(args: TestWorkflowArgs) {
	logger.info({ args }, 'MCP Tool: test_workflow');
	const { processWorkflowRequest } = await import('@/lib/engine/processor');
	const { matches } = await import('@/lib/engine/match');
	const fullPath = args.path.startsWith('/') ? args.path : `/${args.path}`;
	const body = args.body || {};
	const query = args.query || {};
	const headers = args.headers || {};

	const [stateRow] = await db
		.select()
		.from(scenarioState)
		.where(eq(scenarioState.scenarioId, args.scenarioId));

	const baseState = stateRow
		? (stateRow.data as {
				state: Record<string, unknown>;
				tables: Record<string, unknown[]>;
			})
		: { state: {}, tables: {} };

	const exactCandidates = await db
		.select()
		.from(transitions)
		.where(
			and(
				eq(transitions.scenarioId, args.scenarioId),
				eq(transitions.path, fullPath),
				eq(transitions.method, args.method),
			),
		)
		.orderBy(transitions.createdAt);

	const executionTrace: unknown[] = [];

	for (const t of exactCandidates) {
		const ctx = {
			state: baseState.state || {},
			tables: baseState.tables || {},
			input: { body, query, params: {}, headers },
		};
		const currentTrace: ConditionTrace[] = [];
		const isMatch = matches(
			(t.conditions as Record<string, unknown> | Condition[]) || {},
			ctx,
			currentTrace,
		);

		executionTrace.push({
			transitionId: t.id,
			transitionName: t.name,
			matched: isMatch,
			trace: currentTrace,
		});

		if (isMatch) {
			const result = await processWorkflowRequest(
				t as unknown as Transition,
				{},
				body,
				query,
				headers,
				[],
				logger,
			);

			// Fetch updated state to return to AI
			const updatedState = await callInspectWorkflowState({
				scenarioId: args.scenarioId,
			});

			return {
				success: true,
				transitionId: t.id,
				transitionName: t.name,
				response: result,
				current_state: updatedState,
				executionTrace,
			};
		}
	}

	const allCandidates = await db
		.select()
		.from(transitions)
		.where(
			and(
				eq(transitions.scenarioId, args.scenarioId),
				eq(transitions.method, args.method),
			),
		)
		.orderBy(transitions.createdAt);

	const matchRoute = (
		pattern: string,
		actual: string,
	): Record<string, string> | null => {
		const patternParts = pattern.split('/');
		const actualParts = actual.split('/');
		if (patternParts.length !== actualParts.length) return null;
		const params: Record<string, string> = {};
		for (let i = 0; i < patternParts.length; i++) {
			if (patternParts[i].startsWith(':')) {
				params[patternParts[i].slice(1)] = actualParts[i];
			} else if (patternParts[i] !== actualParts[i]) {
				return null;
			}
		}
		return params;
	};

	for (const t of allCandidates) {
		const params = matchRoute(t.path, fullPath);
		if (!params) continue;
		const ctx = {
			state: baseState.state || {},
			tables: baseState.tables || {},
			input: { body, query, params, headers },
		};
		const currentTrace: ConditionTrace[] = [];
		const isMatch = matches(
			(t.conditions as Record<string, unknown> | Condition[]) || {},
			ctx,
			currentTrace,
		);

		executionTrace.push({
			transitionId: t.id,
			transitionName: t.name,
			matched: isMatch,
			trace: currentTrace,
		});

		if (isMatch) {
			const result = await processWorkflowRequest(
				t as unknown as Transition,
				params,
				body,
				query,
				headers,
				[],
				logger,
			);

			// Fetch updated state to return to AI
			const updatedState = await callInspectWorkflowState({
				scenarioId: args.scenarioId,
			});

			return {
				success: true,
				transitionId: t.id,
				transitionName: t.name,
				response: result,
				current_state: updatedState,
				executionTrace,
			};
		}
	}

	return {
		success: false,
		message: 'No matching transition found',
		executionTrace,
	};
}

export async function callExportWorkflow(args: ExportWorkflowArgs) {
	logger.info({ args }, 'MCP Tool: export_workflow');
	const { scenarioId } = args;
	let scenariosList: Scenario[] = [];
	let transitionsList: Transition[] = [];

	if (scenarioId) {
		const [scenario] = await db
			.select()
			.from(scenarios)
			.where(eq(scenarios.id, scenarioId));

		if (!scenario) throw new Error('Scenario not found');

		scenariosList = [
			{
				...scenario,
				createdAt: scenario.createdAt.toISOString(),
				updatedAt: scenario.updatedAt?.toISOString(),
			},
		];

		const transitionsData = await db
			.select()
			.from(transitions)
			.where(eq(transitions.scenarioId, scenarioId));

		transitionsList = transitionsData.map((t) => ({
			...t,
			conditions: t.conditions as unknown,
			effects: t.effects as unknown,
			response: t.response as unknown,
			createdAt: t.createdAt.toISOString(),
			updatedAt: t.updatedAt?.toISOString(),
		})) as Transition[];
	} else {
		const scenariosData = await db.select().from(scenarios);
		scenariosList = scenariosData.map((s) => ({
			...s,
			createdAt: s.createdAt.toISOString(),
			updatedAt: s.updatedAt?.toISOString(),
		}));

		const transitionsData = await db.select().from(transitions);
		transitionsList = transitionsData.map((t) => ({
			...t,
			conditions: t.conditions as unknown,
			effects: t.effects as unknown,
			response: t.response as unknown,
			createdAt: t.createdAt.toISOString(),
			updatedAt: t.updatedAt?.toISOString(),
		})) as Transition[];
	}

	return {
		version: 1,
		exportedAt: new Date().toISOString(),
		scenarios: scenariosList,
		transitions: transitionsList,
		description:
			'This export contains full workflow data including scenarios and transitions, suitable for LLM analysis and re-import.',
	};
}

export async function callImportWorkflow(args: ImportWorkflowArgs) {
	logger.info({ args }, 'MCP Tool: import_workflow');
	const data = args.data;
	// Validate structure before processing
	if (!data.scenarios || !Array.isArray(data.scenarios)) {
		throw new Error(
			'Invalid format: scenarios array missing. Please ensure you are importing a valid Mockzilla workflow export.',
		);
	}

	const importedScenarios = [];
	for (const scenario of data.scenarios) {
		const [existing] = await db
			.select()
			.from(scenarios)
			.where(eq(scenarios.id, scenario.id));

		if (existing) {
			const [updated] = await db
				.update(scenarios)
				.set({
					name: scenario.name,
					description: scenario.description,
					updatedAt: new Date(),
				})
				.where(eq(scenarios.id, scenario.id))
				.returning();
			importedScenarios.push(updated);
		} else {
			const [inserted] = await db
				.insert(scenarios)
				.values({
					id: scenario.id,
					name: scenario.name,
					description: scenario.description,
				})
				.returning();
			importedScenarios.push(inserted);
		}
	}

	const scenarioIds = data.scenarios.map((s) => s.id);
	if (scenarioIds.length > 0) {
		await db
			.delete(transitions)
			.where(inArray(transitions.scenarioId, scenarioIds));

		if (
			data.transitions &&
			Array.isArray(data.transitions) &&
			data.transitions.length > 0
		) {
			const transitionsToInsert = data.transitions.map((t) => ({
				scenarioId: t.scenarioId,
				name: t.name,
				description: t.description,
				path: t.path,
				method: t.method,
				conditions: t.conditions,
				effects: t.effects,
				response: t.response,
				meta: t.meta,
			}));
			await db.insert(transitions).values(transitionsToInsert);
		}
	}

	return {
		success: true,
		importedScenarios: importedScenarios.length,
		importedTransitions: data.transitions?.length || 0,
		message:
			'Workflow imported successfully. The LLM can now use these scenarios for testing and simulation.',
	};
}

export async function callCreateFullWorkflow(args: CreateFullWorkflowArgs) {
	logger.info({ args }, 'MCP Tool: create_full_workflow');
	const scenarioId = generateSlug(args.name);

	await db.transaction(async (tx) => {
		// 1. Create scenario
		await tx
			.insert(scenarios)
			.values({
				id: scenarioId,
				name: args.name,
				description: args.description,
			})
			.onConflictDoUpdate({
				target: scenarios.id,
				set: {
					name: args.name,
					description: args.description,
					updatedAt: new Date(),
				},
			});

		// 2. Clear existing transitions if updating
		await tx.delete(transitions).where(eq(transitions.scenarioId, scenarioId));

		// 3. Insert new transitions
		if (args.transitions.length > 0) {
			await tx.insert(transitions).values(
				args.transitions.map((t) => ({
					scenarioId,
					name: t.name,
					description: t.description,
					path: t.path,
					method: t.method,
					conditions: t.conditions || {},
					effects: t.effects || [],
					response: t.response,
					meta: t.meta || {},
				})),
			);
		}
	});

	return {
		success: true,
		scenarioId,
		transitionCount: args.transitions.length,
	};
}

export async function callEvaluateTemplate(args: EvaluateTemplateArgs) {
	logger.info({ args }, 'MCP Tool: evaluate_template');
	const { replaceTemplates } = await import('@/lib/engine/interpolation');
	const { faker } = await import('@faker-js/faker');

	const baseContext = {
		state: args.context?.state || {},
		tables: args.context?.tables || {},
		input: args.context?.input || {
			body: {},
			query: {},
			params: {},
			headers: {},
		},
	};

	const context = {
		...baseContext,
		// Shortcuts
		query: baseContext.input.query,
		params: baseContext.input.params,
		headers: baseContext.input.headers,
		body: baseContext.input.body,
		db: baseContext.tables,
		// $. alias
		$: baseContext.input,
		faker,
	};

	const result = replaceTemplates(args.template, context);

	return {
		template: args.template,
		result,
		context_used: {
			...baseContext,
			shortcuts: {
				query: baseContext.input.query,
				params: baseContext.input.params,
				headers: baseContext.input.headers,
				body: baseContext.input.body,
			},
		},
	};
}

export async function callSeedWorkflowState(args: SeedWorkflowStateArgs) {
	logger.info({ args }, 'MCP Tool: seed_workflow_state');
	await db
		.insert(scenarioState)
		.values({
			scenarioId: args.scenarioId,
			data: { state: args.state || {}, tables: args.tables || {} },
		})
		.onConflictDoUpdate({
			target: scenarioState.scenarioId,
			set: {
				data: { state: args.state || {}, tables: args.tables || {} },
				updatedAt: new Date(),
			},
		});

	return {
		success: true,
		scenarioId: args.scenarioId,
		message: 'Workflow state seeded successfully',
	};
}

// LOG HANDLERS
export async function callGetLogs(args: GetLogsArgs) {
	const { getLogs } = await import('../logger');
	let logs = getLogs(args.limit ?? 100, args.type);

	if (args.level) {
		const levels: Record<string, number> = {
			trace: 10,
			debug: 20,
			info: 30,
			warn: 40,
			error: 50,
			fatal: 60,
		};
		const levelVal =
			typeof args.level === 'string'
				? levels[args.level.toLowerCase()]
				: args.level;
		if (levelVal) {
			logs = logs.filter((l) => (l.level as number) >= levelVal);
		}
	}

	if (args.search) {
		const s = args.search.toLowerCase();
		logs = logs.filter(
			(l) =>
				(l.msg && String(l.msg).toLowerCase().includes(s)) ||
				JSON.stringify(l).toLowerCase().includes(s),
		);
	}

	return logs;
}

export async function callGetRequestTrace(args: GetRequestTraceArgs) {
	const { getRequestTrace } = await import('../logger');
	return getRequestTrace(args.reqId);
}

export async function callClearLogs() {
	const { clearLogs } = await import('../logger');
	clearLogs();
	return { success: true };
}

export async function callManageLogs(args: ManageLogsArgs) {
	switch (args.action) {
		case 'get':
			return callGetLogs(args);
		case 'trace':
			return callGetRequestTrace(args);
		case 'clear':
			return callClearLogs();
		default:
			throw new Error(`Unknown action: ${(args as { action: string }).action}`);
	}
}
