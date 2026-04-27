import { and, eq, inArray, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { db } from '@/lib/db';
import {
	folders,
	mockResponses,
	scenarioState,
	scenarios,
	transitions,
} from '@/lib/db/schema';
import { matches } from '@/lib/engine/match';
import type {
	Condition,
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
import type * as schemas from './schemas';

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

export async function callListFolders(args: z.infer<typeof schemas.ListFoldersArgs>) {
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

export async function callCreateFolder(args: z.infer<typeof schemas.CreateFolderArgs>) {
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

export async function callGetFolder(args: z.infer<typeof schemas.GetFolderArgs>) {
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

export async function callUpdateFolder(args: z.infer<typeof schemas.UpdateFolderArgs>) {
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

export async function callDeleteFolder(args: z.infer<typeof schemas.DeleteFolderArgs>) {
	logger.info({ args }, 'MCP Tool: delete_folder');
	await db.delete(folders).where(eq(folders.id, args.id));
	return { success: true } as const;
}

// MOCK HANDLERS
export async function callCreateMock(args: z.infer<typeof schemas.CreateMockArgs>) {
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

export async function callListMocks(args: z.infer<typeof schemas.ListMocksArgs>) {
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
	if (targetFolderId) {
		const [countRow] = await db
			.select({ count: sql<number>`count(*)` })
			.from(mockResponses)
			.where(eq(mockResponses.folderId, targetFolderId));
		total = Number(countRow.count);
		rows = await db
			.select()
			.from(mockResponses)
			.where(eq(mockResponses.folderId, targetFolderId))
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

export async function callGetMock(args: z.infer<typeof schemas.GetMockArgs>) {
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

export async function callUpdateMock(args: z.infer<typeof schemas.UpdateMockArgs>) {
	logger.info({ args }, 'MCP Tool: update_mock');
	const [row] = await db
		.update(mockResponses)
		.set({
			name: args.name,
			endpoint: args.path,
			method: args.method,
			statusCode: args.statusCode,
			response: args.response,
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

export async function callDeleteMock(args: z.infer<typeof schemas.DeleteMockArgs>) {
	logger.info({ args }, 'MCP Tool: delete_mock');
	await db.delete(mockResponses).where(eq(mockResponses.id, args.id));
	return { success: true } as const;
}

export async function callCreateSchemaMock(args: {
	name: string;
	path: string;
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
	statusCode: number;
	folderSlug?: string | null;
	folderId?: string | null;
	jsonSchema: string;
	enabled?: boolean;
	matchType?: MatchType;
	queryParams?: Record<string, string> | null;
	variants?: MockVariant[] | null;
	wildcardRequireMatch?: boolean;
	echoRequestBody?: boolean | null;
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

export async function callPreviewMock(args: z.infer<typeof schemas.PreviewMockArgs>) {
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

	const candidates: MockCandidate[] = allMocks.map((m) => ({
		endpoint: m.endpoint,
		matchType: (m.matchType as MatchType) || 'exact',
		queryParams: (m.queryParams as Record<string, string> | null) ?? null,
		_score: 0,
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

	const bestMock = allMocks.find(
		(m) =>
			m.endpoint === best.endpoint &&
			((m.matchType as MatchType) || 'exact') === best.matchType &&
			JSON.stringify(m.queryParams) === JSON.stringify(best.queryParams),
	);

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

	// Handle Wildcard Variants
	if (bestMock.matchType === 'wildcard') {
		const variants = bestMock.variants as MockVariant[] | null;
		if (variants && variants.length > 0) {
			const variant = selectVariant(variants, mockPath, bestMock.endpoint);
			if (variant) {
				finalResponse = variant.body;
				finalStatusCode = variant.statusCode;
				finalBodyType = variant.bodyType as 'json' | 'text';

				const captures =
					extractCaptureKey(mockPath, bestMock.endpoint)?.split('|') || [];
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
				extractCaptureKey(mockPath, bestMock.endpoint)?.split('|') || [];
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
	args: z.infer<typeof schemas.CreateWorkflowTransitionArgs>,
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

export async function callResetWorkflowState(
	args: z.infer<typeof schemas.ResetWorkflowStateArgs>,
) {
	logger.info({ args }, 'MCP Tool: reset_workflow_state');
	await db
		.delete(scenarioState)
		.where(eq(scenarioState.scenarioId, args.scenarioId));
	return { success: true };
}

export async function callInspectWorkflowState(
	args: z.infer<typeof schemas.InspectWorkflowStateArgs>,
) {
	logger.info({ args }, 'MCP Tool: inspect_workflow_state');
	const [row] = await db
		.select()
		.from(scenarioState)
		.where(eq(scenarioState.scenarioId, args.scenarioId));
	return row ? row.data : { tables: {}, state: {} };
}

export async function callUpdateWorkflowTransition(
	args: z.infer<typeof schemas.UpdateWorkflowTransitionArgs>,
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
	args: z.infer<typeof schemas.DeleteWorkflowTransitionArgs>,
) {
	logger.info({ args }, 'MCP Tool: delete_workflow_transition');
	await db.delete(transitions).where(eq(transitions.id, args.id));
	return { success: true };
}

export async function callListWorkflowTransitions(
	args: z.infer<typeof schemas.ListWorkflowTransitionsArgs>,
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
	args: z.infer<typeof schemas.CreateWorkflowScenarioArgs>,
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
	args: z.infer<typeof schemas.ListWorkflowScenariosArgs>,
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
	args: z.infer<typeof schemas.DeleteWorkflowScenarioArgs>,
) {
	logger.info({ args }, 'MCP Tool: delete_workflow_scenario');
	await db.transaction(async (tx) => {
		await tx.delete(scenarios).where(eq(scenarios.id, args.id));
		await tx.delete(scenarioState).where(eq(scenarioState.scenarioId, args.id));
		await tx.delete(transitions).where(eq(transitions.scenarioId, args.id));
	});
	return { success: true };
}

export async function callTestWorkflow(args: z.infer<typeof schemas.TestWorkflowArgs>) {
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

	const executionTrace: any[] = [];

	for (const t of exactCandidates) {
		const ctx = {
			state: baseState.state || {},
			tables: baseState.tables || {},
			input: { body, query, params: {}, headers },
		};
		const currentTrace: any[] = [];
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
			const updatedState = await callInspectWorkflowState({ scenarioId: args.scenarioId });

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
		const currentTrace: any[] = [];
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
			const updatedState = await callInspectWorkflowState({ scenarioId: args.scenarioId });

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

export async function callExportWorkflow(args: z.infer<typeof schemas.ExportWorkflowArgs>) {
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

export async function callImportWorkflow(args: z.infer<typeof schemas.ImportWorkflowArgs>) {
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

export async function callCreateFullWorkflow(args: z.infer<typeof schemas.CreateFullWorkflowArgs>) {
	logger.info({ args }, 'MCP Tool: create_full_workflow');
	const scenarioId = generateSlug(args.name);

	await db.transaction(async (tx) => {
		// 1. Create scenario
		await tx.insert(scenarios).values({
			id: scenarioId,
			name: args.name,
			description: args.description,
		}).onConflictDoUpdate({
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
				}))
			);
		}
	});

	return {
		success: true,
		scenarioId,
		transitionCount: args.transitions.length,
	};
}

export async function callEvaluateTemplate(args: z.infer<typeof schemas.EvaluateTemplateArgs>) {
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
			}
		},
	};
}

export async function callSeedWorkflowState(args: z.infer<typeof schemas.SeedWorkflowStateArgs>) {
	logger.info({ args }, 'MCP Tool: seed_workflow_state');
	await db
		.insert(scenarioState as any)
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
export async function callGetLogs(args: z.infer<typeof schemas.GetLogsArgs>) {
	const { getLogs } = await import('../logger');
	let logs = getLogs(args.limit ?? 100, args.type);

	if (args.level) {
		const levelVal = typeof args.level === 'string' ? 
			({ trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 } as any)[args.level.toLowerCase()] 
			: args.level;
		if (levelVal) {
			logs = logs.filter(l => l.level >= levelVal);
		}
	}

	if (args.search) {
		const s = args.search.toLowerCase();
		logs = logs.filter(l => (l.msg && String(l.msg).toLowerCase().includes(s)) || JSON.stringify(l).toLowerCase().includes(s));
	}

	return logs;
}

export async function callGetRequestTrace(args: z.infer<typeof schemas.GetRequestTraceArgs>) {
    const { getRequestTrace } = await import('../logger');
    return getRequestTrace(args.reqId);
}

export async function callClearLogs() {
	const { clearLogs } = await import('../logger');
	clearLogs();
	return { success: true };
}
