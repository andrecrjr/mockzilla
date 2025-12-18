import { and, eq, inArray, sql } from 'drizzle-orm';
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
	folders,
	mockResponses,
	scenarioState,
	scenarios,
	transitions,
} from '@/lib/db/schema';
import { matches } from '@/lib/engine/match';
import type { CreateMockRequest, HttpMethod, Scenario, Transition } from '@/lib/types';

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
	type: z
		.enum(['eq', 'neq', 'exists', 'gt', 'lt', 'contains'])
		.describe(
			'Operator type: eq (equals), neq (not equals), exists (not null/undefined), gt (greater than), lt (less than), contains (array includes or string substring)',
		),
	field: z
		.string()
		.describe(
			'Path to field in context (e.g., "input.body.id", "state.status", "db.users")',
		),
	value: z.unknown().optional().describe('Value to compare against'),
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
	description: z.string().optional(),
	path: z
		.string()
		.describe(
			'The URL path (e.g. "/users" or "/users/:id"). Supports :param syntax.',
		),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
	conditions: z
		.preprocess(
			parseJsonOrPassthrough,
			z.union([z.record(z.unknown()), z.array(ConditionSchema)]).optional(),
		)
		.describe(
			'Rules to trigger this transition.\nFormat: Array of rules (RECOMMENDED) or Object (Legacy).\n\nEXAMPLE:\n[\n  { "type": "eq", "field": "input.body.type", "value": "admin" },\n  { "type": "exists", "field": "input.headers.authorization" }\n]\n\nSupported Types:\n- eq: Equals\n- neq: Not Equals\n- exists: Field exists\n- gt: Greater Than\n- lt: Less Than\n- contains: String/Array contains value\n\nAllowed Fields:\n- input.body.*\n- input.query.*\n- input.params.*\n- input.headers.*\n- state.*\n- db.*',
		),
	effects: z
		.preprocess(
			parseJsonOrPassthrough,
			z.union([z.record(z.unknown()), z.array(z.unknown())]).optional(),
		)
		.describe(
			'Side effects to execute.\nFormat: Array of effect objects.\n\nEXAMPLE:\n[\n  { "type": "state.set", "raw": { "isLoggedIn": true } },\n  { "type": "db.push", "table": "users", "value": "{{input.body}}" }\n]\n\nSupported Actions:\n- state.set: Set state variables ({ type: "state.set", raw: { key: value } })\n- db.push: Add row to table ({ type: "db.push", table: "name", value: obj })\n- db.update: Update rows ({ type: "db.update", table: "name", match: { id: "{{input.params.id}}" }, set: { status: "active" } })\n- db.remove: Remove rows ({ type: "db.remove", table: "name", match: { id: 123 } })\n\nNOTE: NO Random/Faker. Use {{input.*}}, {{state.*}} for values.',
		),
	response: z
		.preprocess(parseJsonOrPassthrough, z.record(z.unknown()))
		.describe(
			'Response configuration.\n\nEXAMPLE:\n{\n  "status": 201,\n  "body": { "id": "{{input.body.id}}", "status": "created" }\n}\n\nInterpolation supported for body values: {{input.*}}, {{state.*}}, {{db.*}}',
		),
	meta: z.preprocess(parseJsonOrPassthrough, z.record(z.unknown()).optional()),
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
	description: z.string().optional(),
	path: z.string().optional(),
	method: z
		.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
		.optional(),
	conditions: z
		.preprocess(
			parseJsonOrPassthrough,
			z.union([z.record(z.unknown()), z.array(ConditionSchema)]).optional(),
		)
		.describe(
			'Update conditions. See CreateWorkflowTransitionArgs for allowed formats and rules.',
		),
	effects: z
		.preprocess(
			parseJsonOrPassthrough,
			z.union([z.record(z.unknown()), z.array(z.unknown())]).optional(),
		)
		.describe(
			'Update effects. See CreateWorkflowTransitionArgs for allowed formats and rules.',
		),
	response: z
		.preprocess(parseJsonOrPassthrough, z.record(z.unknown()).optional())
		.describe(
			'Update response configuration. See CreateWorkflowTransitionArgs for rules.',
		),
	meta: z.preprocess(parseJsonOrPassthrough, z.record(z.unknown()).optional()),
});

const CreateWorkflowScenarioArgs = z.object({
	name: z
		.string()
		.describe(
			'Name of the scenario (e.g. "auth-flow"). Slug will be generated automatically if ID not provided.',
		),
	description: z.string().optional(),
});

const ListWorkflowScenariosArgs = z.object({
	page: z.number().int().min(1).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});

const DeleteWorkflowScenarioArgs = z.object({
	id: z.string().describe('The ID (slug) of the scenario to delete.'),
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
	body: z.preprocess(parseJsonOrPassthrough, z.record(z.unknown()).optional()),
	query: z.record(z.string()).optional(),
	headers: z.preprocess(
		parseJsonOrPassthrough,
		z.record(z.string()).optional(),
	),
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

async function callCreateWorkflowTransition(
	args: z.infer<typeof CreateWorkflowTransitionArgs>,
) {
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

async function callResetWorkflowState(
	args: z.infer<typeof ResetWorkflowStateArgs>,
) {
	await db
		.delete(scenarioState)
		.where(eq(scenarioState.scenarioId, args.scenarioId));
	return { success: true };
}

async function callInspectWorkflowState(
	args: z.infer<typeof InspectWorkflowStateArgs>,
) {
	const [row] = await db
		.select()
		.from(scenarioState)
		.where(eq(scenarioState.scenarioId, args.scenarioId));
	return row ? row.data : { tables: {}, state: {} };
}

async function callUpdateWorkflowTransition(
	args: z.infer<typeof UpdateWorkflowTransitionArgs>,
) {
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

async function callDeleteWorkflowTransition(
	args: z.infer<typeof DeleteWorkflowTransitionArgs>,
) {
	await db.delete(transitions).where(eq(transitions.id, args.id));
	return { success: true };
}

async function callListWorkflowTransitions(
	args: z.infer<typeof ListWorkflowTransitionsArgs>,
) {
	const rows = await db
		.select()
		.from(transitions)
		.where(eq(transitions.scenarioId, args.scenarioId))
		.orderBy(transitions.createdAt);
	return rows;
}

async function callCreateWorkflowScenario(
	args: z.infer<typeof CreateWorkflowScenarioArgs>,
) {
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

async function callListWorkflowScenarios(
	args: z.infer<typeof ListWorkflowScenariosArgs>,
) {
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

async function callDeleteWorkflowScenario(
	args: z.infer<typeof DeleteWorkflowScenarioArgs>,
) {
	await db.delete(scenarios).where(eq(scenarios.id, args.id));
	return { success: true };
}

async function callTestWorkflow(args: z.infer<typeof TestWorkflowArgs>) {
	const { processWorkflowRequest } = await import('@/lib/engine/processor');
	const fullPath = args.path.startsWith('/') ? args.path : `/${args.path}`;
	const body = args.body || {};
	const query = args.query || {};
	const headers = args.headers || {};

	const [stateRow] = await db
		.select()
		.from(scenarioState)
		.where(eq(scenarioState.scenarioId, args.scenarioId));

	const baseState = stateRow
		? (stateRow.data as { state: Record<string, unknown>; tables: Record<string, unknown[]> })
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

	for (const t of exactCandidates) {
		const ctx = {
			state: baseState.state || {},
			db: baseState.tables || {},
			input: { body, query, params: {}, headers },
		};
		if (matches((t.conditions as any) || {}, ctx)) {
			const result = await processWorkflowRequest(t, {}, body, query, headers);
			return {
				success: true,
				transitionId: t.id,
				transitionName: t.name,
				response: result,
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
			db: baseState.tables || {},
			input: { body, query, params, headers },
		};
		if (matches((t.conditions as any) || {}, ctx)) {
			const result = await processWorkflowRequest(
				t,
				params,
				body,
				query,
				headers,
			);
			return {
				success: true,
				transitionId: t.id,
				transitionName: t.name,
				response: result,
			};
		}
	}

	return {
		success: false,
		message: 'No matching transition found',
	};
}

const WorkflowScenarioSchema = z.object({
	id: z.string().describe('Unique identifier for the scenario (slug format)'),
	name: z.string().describe('Display name of the scenario'),
	description: z
		.string()
		.optional()
		.describe('Description of the scenario flow'),
});

const WorkflowTransitionSchema = z.object({
	scenarioId: z
		.string()
		.describe('ID of the scenario this transition belongs to'),
	name: z.string().describe('Name of the transition step'),
	description: z
		.string()
		.optional()
		.describe('Description of what this step does'),
	path: z
		.string()
		.describe(
			'The URL path (e.g. "/users" or "/users/:id"). Supports :param syntax.',
		),
	method: z
		.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
		.describe('HTTP method for this transition'),
	conditions: z
		.preprocess(
			parseJsonOrPassthrough,
			z.union([z.record(z.unknown()), z.array(ConditionSchema)]).optional(),
		)
		.describe(
			'Rules to trigger this transition. Can be an array of Condition objects (preferred) or a key-value object (legacy). Supported operators: eq, neq, exists, gt, lt, contains. Context fields: input.body.*, input.query.*, input.params.*, input.headers.*, state.*, db.*',
		),
	effects: z
		.preprocess(
			parseJsonOrPassthrough,
			z.union([z.record(z.unknown()), z.array(z.unknown())]).optional(),
		)
		.describe(
			'Side effects to execute. Array of effect objects. Supported types: "state.set" (sets state variables), "db.push" (adds to table), "db.update" (updates rows), "db.remove" (removes rows). Examples: { "type": "state.set", "raw": { "isLoggedIn": true } }, { "type": "db.push", "table": "users", "value": "{{input.body}}" }',
		),
	response: z
		.preprocess(parseJsonOrPassthrough, z.record(z.unknown()))
		.describe(
			'Response configuration to return to the client. Can use interpolation like {{input.body.id}} or {{state.token}}.',
		),
	meta: z
		.preprocess(parseJsonOrPassthrough, z.record(z.unknown()).optional())
		.describe('Additional metadata'),
});

const ImportWorkflowArgs = z.object({
	data: z
		.object({
			scenarios: z
				.array(WorkflowScenarioSchema)
				.describe('List of scenarios to import'),
			transitions: z
				.array(WorkflowTransitionSchema)
				.optional()
				.describe('List of transitions associated with the scenarios'),
		})
		.describe(
			'The complete workflow data structure containing scenarios and their transitions. Use this structure to generate valid import data.',
		),
});

const ExportWorkflowArgs = z.object({
	scenarioId: z
		.string()
		.optional()
		.describe('Optional scenario ID to export only one scenario'),
});

async function callExportWorkflow(args: z.infer<typeof ExportWorkflowArgs>) {
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
			conditions: t.conditions as any,
			effects: t.effects as any,
			response: t.response as any,
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
			conditions: t.conditions as any,
			effects: t.effects as any,
			response: t.response as any,
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

async function callImportWorkflow(args: z.infer<typeof ImportWorkflowArgs>) {
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
			},
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
			},
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
			},
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
			},
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
			},
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
			},
		);

		server.registerTool(
			'create_workflow_scenario',
			{
				title: 'Create Workflow Scenario',
				description:
					'Create a new container for a stateful workflow. Use this for Scenarios, NOT for simple Mock Folders. Generates a slug-based ID from the name.',
				inputSchema: CreateWorkflowScenarioArgs,
			},
			async (args: z.infer<typeof CreateWorkflowScenarioArgs>, _extra) => {
				const result = await callCreateWorkflowScenario(args);
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }],
				};
			},
		);

		server.registerTool(
			'list_workflow_scenarios',
			{
				title: 'List Workflow Scenarios',
				description: 'List existing workflow scenarios.',
				inputSchema: ListWorkflowScenariosArgs,
			},
			async (args: z.infer<typeof ListWorkflowScenariosArgs>, _extra) => {
				const result = await callListWorkflowScenarios(args);
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }],
				};
			},
		);

		server.registerTool(
			'delete_workflow_scenario',
			{
				title: 'Delete Workflow Scenario',
				description: 'Delete a workflow scenario by ID.',
				inputSchema: DeleteWorkflowScenarioArgs,
			},
			async (args: z.infer<typeof DeleteWorkflowScenarioArgs>, _extra) => {
				const result = await callDeleteWorkflowScenario(args);
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }],
				};
			},
		);

		server.registerTool(
			'test_workflow',
			{
				title: 'Test Workflow',
				description:
					'Test a workflow transition by simulating a request to a path. This executes the full workflow logic, including checking conditions and applying side effects (updating state, modifying the mini-database).',
				inputSchema: TestWorkflowArgs,
			},
			async (args: z.infer<typeof TestWorkflowArgs>, _extra) => {
				const result = await callTestWorkflow(args);
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }],
				};
			},
		);

		server.registerTool(
			'export_workflow',
			{
				title: 'Export Workflow',
				description: 'Export one or all workflow scenarios to JSON',
				inputSchema: ExportWorkflowArgs,
			},
			async (args: z.infer<typeof ExportWorkflowArgs>, _extra) => {
				const result = await callExportWorkflow(args);
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }],
				};
			},
		);

		server.registerTool(
			'import_workflow',
			{
				title: 'Import Workflow',
				description: 'Import workflow scenarios from JSON',
				inputSchema: ImportWorkflowArgs,
			},
			async (args: z.infer<typeof ImportWorkflowArgs>, _extra) => {
				const result = await callImportWorkflow(args);
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }],
				};
			},
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
