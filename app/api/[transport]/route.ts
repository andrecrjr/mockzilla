import { and, eq, sql } from 'drizzle-orm';
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { db } from '@/lib/db';
import { folders, mockResponses, scenarioState, transitions, scenarios } from '@/lib/db/schema';
import type { CreateMockRequest, HttpMethod } from '@/lib/types';

const ListFoldersArgs = z.object({
	page: z.number().int().min(1).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});

const CreateFolderArgs = z.object({
	name: z.string(),
	description: z.string().optional(),
});

const GetFolderArgs = z
	.object({ id: z.string().optional(), slug: z.string().optional() })
	.refine((v) => !!v.id || !!v.slug, { message: 'id or slug is required' });

const UpdateFolderArgs = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
});

const DeleteFolderArgs = z.object({ id: z.string() });

const CreateMockArgs = z.object({
	name: z.string(),
	path: z.string(),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
	statusCode: z.number().int(),
	folderId: z.string(),
	response: z.string(),
	matchType: z.enum(['exact', 'substring']).optional(),
	bodyType: z.enum(['json', 'text']).optional(),
	enabled: z.boolean().optional(),
	jsonSchema: z.string().nullable().optional(),
	useDynamicResponse: z.boolean().nullable().optional(),
	echoRequestBody: z.boolean().nullable().optional(),
});

const PreviewMockArgs = z.object({
	folderSlug: z.string(),
	path: z.string(),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
	contentType: z.string().nullable().optional(),
	bodyText: z.string().nullable().optional(),
	bodyJson: z.record(z.unknown()).nullable().optional(),
});

const ListMocksArgs = z.object({
	folderId: z.string().optional(),
	page: z.number().int().min(1).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});

const GetMockArgs = z.object({ id: z.string() });

const UpdateMockArgs = z.object({
	id: z.string(),
	name: z.string(),
	path: z.string(),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
	statusCode: z.number().int(),
	response: z.string(),
	matchType: z.enum(['exact', 'substring']).optional(),
	bodyType: z.enum(['json', 'text']).optional(),
	enabled: z.boolean().optional(),
	jsonSchema: z.string().nullable().optional(),
	useDynamicResponse: z.boolean().nullable().optional(),
	echoRequestBody: z.boolean().nullable().optional(),
});

const DeleteMockArgs = z.object({ id: z.string() });

const ConditionSchema = z.object({
	type: z.enum(['eq', 'neq', 'exists', 'gt', 'lt', 'contains']),
	field: z.string(),
	value: z.any().optional(),
});

// Helper to parse JSON strings or pass through objects
const parseJsonOrPassthrough = (val: unknown) => {
	if (typeof val === 'string') {
		try {
			return JSON.parse(val);
		} catch {
			return val;
		}
	}
	return val;
};

const CreateWorkflowTransitionArgs = z.object({
	scenarioId: z.string(),
	name: z.string(),
	title: z.string().optional(),
	description: z.string().optional(),
	path: z.string(),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
	conditions: z.preprocess(
		parseJsonOrPassthrough,
		z.union([z.record(z.any()), z.array(ConditionSchema)]).optional()
	),
	effects: z.preprocess(
		parseJsonOrPassthrough,
		z.union([z.record(z.any()), z.array(z.any())]).optional()
	),
	response: z.preprocess(
		parseJsonOrPassthrough,
		z.record(z.any())
	),
	meta: z.preprocess(
		parseJsonOrPassthrough,
		z.record(z.any()).optional()
	),
});

const ResetWorkflowStateArgs = z.object({
	scenarioId: z.string(),
});

const InspectWorkflowStateArgs = z.object({
	scenarioId: z.string(),
});

const UpdateWorkflowTransitionArgs = z.object({
	id: z.number().int(),
	name: z.string().optional(),
	title: z.string().optional(),
	description: z.string().optional(),
	path: z.string().optional(),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).optional(),
	conditions: z.preprocess(
		parseJsonOrPassthrough,
		z.union([z.record(z.any()), z.array(ConditionSchema)]).optional()
	),
	effects: z.preprocess(
		parseJsonOrPassthrough,
		z.union([z.record(z.any()), z.array(z.any())]).optional()
	),
	response: z.preprocess(
		parseJsonOrPassthrough,
		z.record(z.any()).optional()
	),
	meta: z.preprocess(
		parseJsonOrPassthrough,
		z.record(z.any()).optional()
	),
});

const DeleteWorkflowTransitionArgs = z.object({
	id: z.number().int(),
});

const ListWorkflowTransitionsArgs = z.object({
	scenarioId: z.string(),
});

const TestWorkflowArgs = z.object({
	scenarioId: z.string(),
	path: z.string(),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
	body: z.preprocess(parseJsonOrPassthrough, z.record(z.any()).optional()),
	query: z.record(z.string()).optional(),
	headers: z.preprocess(parseJsonOrPassthrough, z.record(z.string()).optional()),
});

async function callListFolders(args: z.infer<typeof ListFoldersArgs>) {
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
		createdAt: folder.createdAt.toISOString(),
		updatedAt: folder.updatedAt?.toISOString() || null,
	}));
	return { data, meta: { total, page, limit, totalPages } };
}

function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');
}

async function callCreateFolder(args: z.infer<typeof CreateFolderArgs>) {
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
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() ?? null,
	};
}

async function callGetFolder(args: z.infer<typeof GetFolderArgs>) {
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
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() || null,
	};
}

async function callUpdateFolder(args: z.infer<typeof UpdateFolderArgs>) {
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
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() || null,
	};
}

async function callDeleteFolder(args: z.infer<typeof DeleteFolderArgs>) {
	await db.delete(folders).where(eq(folders.id, args.id));
	return { success: true } as const;
}

async function callCreateMock(args: z.infer<typeof CreateMockArgs>) {
	const body: CreateMockRequest = {
		name: args.name,
		path: args.path,
		method: args.method as HttpMethod,
		statusCode: args.statusCode,
		folderId: args.folderId,
		response: args.response,
		matchType: args.matchType,
		bodyType: args.bodyType,
		enabled: args.enabled,
		jsonSchema: args.jsonSchema ?? undefined,
		useDynamicResponse: args.useDynamicResponse ?? undefined,
		echoRequestBody: args.echoRequestBody ?? undefined,
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
			jsonSchema: body.jsonSchema,
			useDynamicResponse: body.useDynamicResponse ?? false,
			echoRequestBody: body.echoRequestBody ?? false,
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
		matchType: row.matchType || 'exact',
		bodyType: row.bodyType || 'json',
		enabled: row.enabled,
		jsonSchema: row.jsonSchema || null,
		useDynamicResponse: row.useDynamicResponse,
		echoRequestBody: row.echoRequestBody,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() || null,
	};
}

async function callListMocks(args: z.infer<typeof ListMocksArgs>) {
	const page = args.page ?? 1;
	const limit = args.limit ?? 10;
	const offset = (page - 1) * limit;
	let total = 0;
	let rows: (typeof mockResponses.$inferSelect)[] = [];
	if (args.folderId) {
		const [countRow] = await db
			.select({ count: sql<number>`count(*)` })
			.from(mockResponses)
			.where(eq(mockResponses.folderId, args.folderId));
		total = Number(countRow.count);
		rows = await db
			.select()
			.from(mockResponses)
			.where(eq(mockResponses.folderId, args.folderId))
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
		matchType: row.matchType || 'exact',
		bodyType: row.bodyType || 'json',
		enabled: row.enabled,
		jsonSchema: row.jsonSchema,
		useDynamicResponse: row.useDynamicResponse,
		echoRequestBody: row.echoRequestBody,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() || null,
	}));
	return { data, meta: { total, page, limit, totalPages } };
}

async function callGetMock(args: z.infer<typeof GetMockArgs>) {
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
		matchType: row.matchType || 'exact',
		bodyType: row.bodyType || 'json',
		enabled: row.enabled,
		jsonSchema: row.jsonSchema,
		useDynamicResponse: row.useDynamicResponse,
		echoRequestBody: row.echoRequestBody,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() || null,
	};
}

async function callUpdateMock(args: z.infer<typeof UpdateMockArgs>) {
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
			jsonSchema: args.jsonSchema ?? null,
			useDynamicResponse: args.useDynamicResponse ?? false,
			echoRequestBody: args.echoRequestBody ?? false,
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
		matchType: row.matchType || 'exact',
		bodyType: row.bodyType || 'json',
		enabled: row.enabled,
		jsonSchema: row.jsonSchema,
		useDynamicResponse: row.useDynamicResponse,
		echoRequestBody: row.echoRequestBody,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() || null,
	};
}

async function callDeleteMock(args: z.infer<typeof DeleteMockArgs>) {
	await db.delete(mockResponses).where(eq(mockResponses.id, args.id));
	return { success: true } as const;
}

async function callCreateSchemaMock(args: {
	name: string;
	path: string;
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
	statusCode: number;
	folderSlug?: string | null;
	folderId?: string | null;
	jsonSchema: string;
	enabled?: boolean;
	matchType?: 'exact' | 'substring';
	echoRequestBody?: boolean | null;
}) {
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
			jsonSchema: args.jsonSchema,
			useDynamicResponse: true,
			echoRequestBody: (args.echoRequestBody ?? false) as boolean,
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
		matchType: row.matchType || 'exact',
		bodyType: row.bodyType || 'json',
		enabled: row.enabled,
		jsonSchema: row.jsonSchema || null,
		useDynamicResponse: row.useDynamicResponse,
		echoRequestBody: row.echoRequestBody,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() || null,
	};
}

async function callPreviewMock(args: z.infer<typeof PreviewMockArgs>) {
	const folderSlug = args.folderSlug;
	const mockPath = args.path;
	const method = args.method;
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
	const [mock] = await db
		.select()
		.from(mockResponses)
		.where(
			and(
				eq(mockResponses.folderId, folder.id),
				eq(mockResponses.endpoint, mockPath),
				eq(mockResponses.method, method),
			),
		)
		.limit(1);
	if (!mock)
		return {
			statusCode: 404,
			headers: {},
			isJson: true,
			body: {
				error: 'Mock endpoint not found',
				folder: folderSlug,
				path: mockPath,
				method,
			},
		};
	if (mock.echoRequestBody) {
		const contentType = args.contentType || 'text/plain';
		if (contentType.includes('application/json')) {
			const body = args.bodyJson ?? null;
			return {
				statusCode: mock.statusCode,
				headers: { 'Content-Type': 'application/json' },
				isJson: true,
				body: body ?? {},
			};
		} else {
			const body = args.bodyText ?? '';
			return {
				statusCode: mock.statusCode,
				headers: { 'Content-Type': contentType },
				isJson: false,
				body,
			};
		}
	}
	if (mock.useDynamicResponse && mock.jsonSchema) {
		try {
			const { generateFromSchema } = await import('@/lib/schema-generator');
			const generated = generateFromSchema(JSON.parse(mock.jsonSchema));
			const json = JSON.parse(generated);
			return {
				statusCode: mock.statusCode,
				headers: { 'Content-Type': 'application/json' },
				isJson: true,
				body: json,
			};
		} catch {
			try {
				const json = JSON.parse(mock.response);
				return {
					statusCode: mock.statusCode,
					headers: { 'Content-Type': 'application/json' },
					isJson: true,
					body: json,
				};
			} catch {
				return {
					statusCode: mock.statusCode,
					headers: { 'Content-Type': 'application/json' },
					isJson: false,
					body: mock.response,
				};
			}
		}
	}
	const contentType =
		mock.bodyType === 'json' ? 'application/json' : 'text/plain';
	if (mock.bodyType === 'json') {
		try {
			const json = JSON.parse(mock.response);
			return {
				statusCode: mock.statusCode,
				headers: { 'Content-Type': 'application/json' },
				isJson: true,
				body: json,
			};
		} catch {
			return {
				statusCode: mock.statusCode,
				headers: { 'Content-Type': contentType },
				isJson: false,
				body: mock.response,
			};
		}
	}
	return {
		statusCode: mock.statusCode,
		headers: { 'Content-Type': contentType },
		isJson: false,
		body: mock.response,
	};
}

async function callCreateWorkflowTransition(args: z.infer<typeof CreateWorkflowTransitionArgs>) {
	// Ensure scenario exists (auto-create if not)
	const [existingScenario] = await db
		.select()
		.from(scenarios)
		.where(eq(scenarios.id, args.scenarioId));
	
	if (!existingScenario) {
		// Auto-create scenario with scenarioId as both id and name
		await db.insert(scenarios).values({
			id: args.scenarioId,
			name: args.scenarioId,
			description: `Auto-created scenario for ${args.scenarioId}`,
		}).onConflictDoNothing();
	}

	const [row] = await db
		.insert(transitions)
		.values({
			scenarioId: args.scenarioId,
			name: args.name,
			title: args.title ?? null,
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

async function callResetWorkflowState(args: z.infer<typeof ResetWorkflowStateArgs>) {
	await db.delete(scenarioState).where(eq(scenarioState.scenarioId, args.scenarioId));
	return { success: true };
}

async function callInspectWorkflowState(args: z.infer<typeof InspectWorkflowStateArgs>) {
	const [row] = await db
		.select()
		.from(scenarioState)
		.where(eq(scenarioState.scenarioId, args.scenarioId));
	return row ? row.data : { tables: {}, state: {} };
}

async function callUpdateWorkflowTransition(args: z.infer<typeof UpdateWorkflowTransitionArgs>) {
	const updateData: Record<string, unknown> = { updatedAt: new Date() };
	if (args.name !== undefined) updateData.name = args.name;
	if (args.title !== undefined) updateData.title = args.title;
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

async function callDeleteWorkflowTransition(args: z.infer<typeof DeleteWorkflowTransitionArgs>) {
	await db.delete(transitions).where(eq(transitions.id, args.id));
	return { success: true };
}

async function callListWorkflowTransitions(args: z.infer<typeof ListWorkflowTransitionsArgs>) {
	const rows = await db
		.select()
		.from(transitions)
		.where(eq(transitions.scenarioId, args.scenarioId))
		.orderBy(transitions.createdAt);
	return rows;
}

async function callTestWorkflow(args: z.infer<typeof TestWorkflowArgs>) {
	const { processWorkflowRequest } = await import('@/lib/engine/processor');
	
	// Build the full path for the workflow
	const fullPath = args.path.startsWith('/') ? args.path : `/${args.path}`;
	
	// Query the database directly for the transition within the scenario
	const matchingTransitions = await db
		.select()
		.from(transitions)
		.where(
			and(
				eq(transitions.scenarioId, args.scenarioId),
				eq(transitions.path, fullPath),
				eq(transitions.method, args.method)
			)
		);
	
	if (matchingTransitions.length === 0) {
		// Try pattern matching for parameterized routes like /users/:id
		const allTransitions = await db
			.select()
			.from(transitions)
			.where(
				and(
					eq(transitions.scenarioId, args.scenarioId),
					eq(transitions.method, args.method)
				)
			);
		
		// Simple pattern matcher for :param style routes
		const matchRoute = (pattern: string, actual: string): Record<string, string> | null => {
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
		
		for (const t of allTransitions) {
			const params = matchRoute(t.path, fullPath);
			if (params) {
				// Found a matching parameterized route
				try {
					const result = await processWorkflowRequest(t, params, args.body || {}, args.query || {}, args.headers || {});
					return {
						success: true,
						transitionId: t.id,
						transitionName: t.name,
						matchedParams: params,
						response: result,
					};
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : 'Unknown error',
					};
				}
			}
		}
		
		return {
			success: false,
			error: 'No matching transition found',
			scenarioId: args.scenarioId,
			path: fullPath,
			method: args.method,
		};
	}
	
	const transition = matchingTransitions[0];
	
	// Process the request
	try {
		const result = await processWorkflowRequest(
			transition,
			{}, // No URL params for exact match
			args.body || {},
			args.query || {},
			args.headers || {}
		);
		
		return {
			success: true,
			transitionId: transition.id,
			transitionName: transition.name,
			response: result,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

const handler = createMcpHandler(
	async (server) => {
		server.registerTool(
			'list_folders',
			{
				title: 'List Folders',
				description: 'List folders with pagination',
				inputSchema: z.object({
					page: z.number().int().min(1).optional(),
					limit: z.number().int().min(1).max(100).optional(),
				}),
			},
			async ({ page, limit }, _extra) => {
				const result = await callListFolders({ page, limit });
				return {
					content: [
						{
							type: 'text',
							text: `${JSON.stringify(result)}`,
						},
					],
					structuredContent: result,
				};
			},
		);

		server.registerTool(
			'create_folder',
			{
				title: 'Create Folder',
				description: 'Create a folder to group mocks',
				inputSchema: CreateFolderArgs,
			},
			async (args: z.infer<typeof CreateFolderArgs>, _extra) => {
				const result = await callCreateFolder(args);
				return {
					content: [
						{
							type: 'text',
							text: `${JSON.stringify(result)}`,
						},
					],
					structuredContent: result,
				};
			},
		);

		server.registerTool(
			'get_folder',
			{
				title: 'Get Folder',
				description: 'Get a folder by id or slug',
				inputSchema: GetFolderArgs,
			},
			async (args: z.infer<typeof GetFolderArgs>, _extra) => {
				const result = await callGetFolder(args);
				return {
					content: [
						{
							type: 'text',
							text: `${JSON.stringify(result)}`,
						},
					],
				};
			},
		);

		server.registerTool(
			'update_folder',
			{
				title: 'Update Folder',
				description: 'Update a folder by id',
				inputSchema: UpdateFolderArgs,
			},
			async (args: z.infer<typeof UpdateFolderArgs>, _extra) => {
				const result = await callUpdateFolder(args);
				return {
					content: [
						{
							type: 'text',
							text: `${JSON.stringify(result)}`,
						},
					],
				};
			},
		);

		server.registerTool(
			'delete_folder',
			{
				title: 'Delete Folder',
				description: 'Delete a folder by id',
				inputSchema: DeleteFolderArgs,
			},
			async (args: z.infer<typeof DeleteFolderArgs>, _extra) => {
				const result = await callDeleteFolder(args);
				return {
					content: [
						{
							type: 'text',
							text: `${JSON.stringify(result)}`,
						},
					],
					structuredContent: result,
				};
			},
		);

		server.registerTool(
			'create_mock',
			{
				title: 'Create Mock',
				description: 'Create a mock response',
				inputSchema: CreateMockArgs,
			},
			async (args: z.infer<typeof CreateMockArgs>, _extra) => {
				const result = await callCreateMock(args);
				return {
					content: [
						{
							type: 'text',
							text: `${JSON.stringify(result)}`,
						},
					],
					structuredContent: result,
				};
			},
		);

		server.registerTool(
			'list_mocks',
			{
				title: 'List Mocks',
				description: 'List mocks with pagination and optional folder filter',
				inputSchema: ListMocksArgs,
			},
			async (args: z.infer<typeof ListMocksArgs>, _extra) => {
				const result = await callListMocks(args);
				return {
					content: [
						{
							type: 'text',
							text: `${JSON.stringify(result)}`,
						},
					],
					structuredContent: result,
				};
			},
		);

		server.registerTool(
			'get_mock',
			{
				title: 'Get Mock',
				description: 'Get a mock by id',
				inputSchema: GetMockArgs,
			},
			async (args: z.infer<typeof GetMockArgs>, _extra) => {
				const result = await callGetMock(args);
				return {
					content: [
						{
							type: 'text',
							text: `${JSON.stringify(result)}`,
						},
					],
				};
			},
		);

		server.registerTool(
			'update_mock',
			{
				title: 'Update Mock',
				description: 'Update a mock by id',
				inputSchema: UpdateMockArgs,
			},
			async (args: z.infer<typeof UpdateMockArgs>, _extra) => {
				const result = await callUpdateMock(args);
				return {
					content: [
						{
							type: 'text',
							text: `${JSON.stringify(result)}`,
						},
					],
				};
			},
		);

		server.registerTool(
			'delete_mock',
			{
				title: 'Delete Mock',
				description: 'Delete a mock by id',
				inputSchema: DeleteMockArgs,
			},
			async (args: z.infer<typeof DeleteMockArgs>, _extra) => {
				const result = await callDeleteMock(args);
				return {
					content: [
						{
							type: 'text',
							text: `${JSON.stringify(result)}`,
						},
					],
					structuredContent: result,
				};
			},
		);

		server.registerTool(
			'create_schema_mock',
			{
				title: 'Create Schema Mock',
				description:
					'Create a mock using a JSON Schema with Faker directives and field interpolation',
				inputSchema: z.object({
					name: z.string(),
					path: z.string(),
					method: z.enum([
						'GET',
						'POST',
						'PUT',
						'PATCH',
						'DELETE',
						'HEAD',
						'OPTIONS',
					]),
					statusCode: z.number().int(),
					folderSlug: z.string().nullable().optional(),
					folderId: z.string().nullable().optional(),
					jsonSchema: z.string(),
					enabled: z.boolean().optional(),
					matchType: z.enum(['exact', 'substring']).optional(),
					echoRequestBody: z.boolean().nullable().optional(),
				}),
			},
			async (args: Parameters<typeof callCreateSchemaMock>[0], _extra) => {
				const result = await callCreateSchemaMock(args);
				return {
					content: [
						{
							type: 'text',
							text: `${JSON.stringify(result)}`,
						},
					],
				};
			},
		);

		server.registerTool(
			'preview_mock',
			{
				title: 'Preview Mock',
				description: 'Preview the response for a mock path',
				inputSchema: PreviewMockArgs,
			},
			async (args: z.infer<typeof PreviewMockArgs>, _extra) => {
				const result = await callPreviewMock(args);
				return {
					content: [
						{
							type: 'text',
							text: `${JSON.stringify(result)}`,
						},
					],
					structuredContent: result,
				};
			},
		);

		server.registerTool(
			'create_workflow_transition',
			{
				title: 'Create Workflow Transition',
				description: 'Create a stateful transition for a workflow scenario',
				inputSchema: CreateWorkflowTransitionArgs,
			},
			async (args: z.infer<typeof CreateWorkflowTransitionArgs>, _extra) => {
				const result = await callCreateWorkflowTransition(args);
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }],
				};
			}
		);

		server.registerTool(
			'reset_workflow_state',
			{
				title: 'Reset Workflow State',
				description: 'Reset the state and DB of a scenario',
				inputSchema: ResetWorkflowStateArgs,
			},
			async (args: z.infer<typeof ResetWorkflowStateArgs>, _extra) => {
				const result = await callResetWorkflowState(args);
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }],
				};
			}
		);

		server.registerTool(
			'inspect_workflow_state',
			{
				title: 'Inspect Workflow State',
				description: 'View the current state and DB of a scenario',
				inputSchema: InspectWorkflowStateArgs,
			},
			async (args: z.infer<typeof InspectWorkflowStateArgs>, _extra) => {
				const result = await callInspectWorkflowState(args);
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }],
				};
			}
		);

		server.registerTool(
			'update_workflow_transition',
			{
				title: 'Update Workflow Transition',
				description: 'Update an existing workflow transition by ID',
				inputSchema: UpdateWorkflowTransitionArgs,
			},
			async (args: z.infer<typeof UpdateWorkflowTransitionArgs>, _extra) => {
				const result = await callUpdateWorkflowTransition(args);
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }],
				};
			}
		);

		server.registerTool(
			'delete_workflow_transition',
			{
				title: 'Delete Workflow Transition',
				description: 'Delete a workflow transition by ID',
				inputSchema: DeleteWorkflowTransitionArgs,
			},
			async (args: z.infer<typeof DeleteWorkflowTransitionArgs>, _extra) => {
				const result = await callDeleteWorkflowTransition(args);
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }],
				};
			}
		);

		server.registerTool(
			'list_workflow_transitions',
			{
				title: 'List Workflow Transitions',
				description: 'List all transitions for a scenario',
				inputSchema: ListWorkflowTransitionsArgs,
			},
			async (args: z.infer<typeof ListWorkflowTransitionsArgs>, _extra) => {
				const result = await callListWorkflowTransitions(args);
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }],
				};
			}
		);

		server.registerTool(
			'test_workflow',
			{
				title: 'Test Workflow',
				description: 'Test a workflow transition by simulating a request to a path',
				inputSchema: TestWorkflowArgs,
			},
			async (args: z.infer<typeof TestWorkflowArgs>, _extra) => {
				const result = await callTestWorkflow(args);
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }],
				};
			}
		);

	},
	{
		serverInfo: { name: 'Mockzilla', version: '1.0.0' },
	},
	{
		basePath: '/api',
		verboseLogs: true,
	},
);
export { handler as GET, handler as POST, handler as DELETE };
