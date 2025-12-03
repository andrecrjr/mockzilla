import { and, eq, sql } from 'drizzle-orm';
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { db } from '@/lib/db';
import { folders, mockResponses } from '@/lib/db/schema';
import type { CreateMockRequest, HttpMethod } from '@/lib/types';

const listFoldersInput = {
	title: 'List Folders',
	description:
		'Paginate through folders. Defaults are designed for UI listings.',
	type: 'object',
	properties: {
		page: {
			type: 'integer',
			minimum: 1,
			default: 1,
			description: 'Page number starting at 1',
		},
		limit: {
			type: 'integer',
			minimum: 1,
			maximum: 100,
			default: 10,
			description: 'Items per page (1–100)',
		},
	},
	examples: [{ page: 1, limit: 10 }],
	additionalProperties: false,
	'x-tags': ['folders', 'pagination'],
	'x-intent': 'browse-folders',
};

const listFoldersOutput = {
	title: 'Folders Result',
	description: 'Paginated folders with metadata for UI presentation.',
	type: 'object',
	properties: {
		data: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Unique folder ID' },
					name: { type: 'string', description: 'Human-friendly name' },
					slug: { type: 'string', description: 'URL-safe identifier' },
					description: {
						type: ['string', 'null'],
						description: 'Optional text',
					},
					createdAt: { type: 'string', description: 'ISO timestamp' },
					updatedAt: {
						type: ['string', 'null'],
						description: 'ISO timestamp when updated',
					},
				},
				required: ['id', 'name', 'slug', 'createdAt'],
			},
		},
		meta: {
			type: 'object',
			properties: {
				total: { type: 'integer', description: 'Total number of folders' },
				page: { type: 'integer', description: 'Current page number' },
				limit: { type: 'integer', description: 'Items per page' },
				totalPages: {
					type: 'integer',
					description: 'Derived total page count',
				},
			},
			required: ['total', 'page', 'limit', 'totalPages'],
		},
	},
	required: ['data', 'meta'],
	examples: [
		{
			data: [
				{
					id: 'b5a5c9e0-7b67-4a6c-8f9c-111111111111',
					name: 'Support',
					slug: 'support',
					description: 'Customer support endpoints',
					createdAt: '2025-01-01T12:00:00.000Z',
					updatedAt: null,
				},
			],
			meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
		},
	],
};

const createMockInput = {
	title: 'Create Mock',
	description:
		'Create a mock endpoint within a folder. Supports JSON/text, echo, and schema-driven responses.',
	type: 'object',
	properties: {
		name: { type: 'string', description: 'Display name of the mock' },
		path: {
			type: 'string',
			description: 'Endpoint path that starts with / (e.g., /users)',
		},
		method: {
			type: 'string',
			enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
			description: 'HTTP method',
		},
		statusCode: {
			type: 'integer',
			description: 'HTTP status code (e.g., 200)',
		},
		folderId: { type: 'string', description: 'Target folder ID' },
		response: {
			type: 'string',
			description: 'Static response as JSON string or text',
		},
		matchType: {
			type: 'string',
			enum: ['exact', 'substring'],
			default: 'exact',
			description: 'Path match strategy',
		},
		bodyType: {
			type: 'string',
			enum: ['json', 'text'],
			default: 'json',
			description: 'Interprets response body as JSON or text',
		},
		enabled: {
			type: 'boolean',
			default: true,
			description: 'Enable/disable mock',
		},
		jsonSchema: {
			type: ['string', 'null'],
			description: 'JSON Schema string used for dynamic responses',
		},
		useDynamicResponse: {
			type: ['boolean', 'null'],
			description: 'Generate dynamic response using jsonSchema',
		},
		echoRequestBody: {
			type: ['boolean', 'null'],
			description: 'Echo back request body for write methods',
		},
	},
	examples: [
		{
			name: 'Users Index',
			path: '/users',
			method: 'GET',
			statusCode: 200,
			folderId: 'b5a5c9e0-7b67-4a6c-8f9c-111111111111',
			response: '{"data":[]}',
			bodyType: 'json',
		},
	],
	required: ['name', 'path', 'method', 'statusCode', 'folderId', 'response'],
	additionalProperties: false,
	'x-tags': ['mocks', 'create'],
	'x-intent': 'create-mock',
};

const createMockOutput = {
	title: 'Mock Created',
	description: 'Normalized mock object after creation.',
	type: 'object',
	properties: {
		id: { type: 'string', description: 'Mock ID' },
		name: { type: 'string', description: 'Mock name' },
		path: { type: 'string', description: 'Endpoint path' },
		method: { type: 'string', description: 'HTTP method' },
		response: { type: 'string', description: 'Stored response' },
		statusCode: { type: 'integer', description: 'HTTP status code' },
		folderId: { type: 'string', description: 'Parent folder ID' },
		matchType: { type: 'string', description: 'Matching strategy' },
		bodyType: { type: 'string', description: 'JSON or text' },
		enabled: { type: 'boolean', description: 'Enabled flag' },
		jsonSchema: {
			type: ['string', 'null'],
			description: 'Schema string if present',
		},
		useDynamicResponse: {
			type: ['boolean', 'null'],
			description: 'Uses dynamic responses',
		},
		echoRequestBody: {
			type: ['boolean', 'null'],
			description: 'Echo behavior for write methods',
		},
		createdAt: { type: 'string', description: 'ISO timestamp when created' },
		updatedAt: {
			type: ['string', 'null'],
			description: 'ISO timestamp when updated',
		},
	},
	required: [
		'id',
		'name',
		'path',
		'method',
		'response',
		'statusCode',
		'folderId',
		'createdAt',
	],
};

const previewMockInput = {
	title: 'Preview Mock',
	description:
		'Preview the resolved response for a folder slug + path + method.',
	type: 'object',
	properties: {
		folderSlug: { type: 'string', description: 'Folder slug (e.g., support)' },
		path: { type: 'string', description: 'Endpoint path (e.g., /users)' },
		method: {
			type: 'string',
			enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
			default: 'GET',
			description: 'HTTP method',
		},
		contentType: {
			type: ['string', 'null'],
			default: 'application/json',
			description: 'Used when echoing body to choose JSON vs text',
		},
		bodyText: {
			type: ['string', 'null'],
			description: 'Plain text body used for echo when not JSON',
		},
		bodyJson: {
			type: ['object', 'null'],
			description: 'JSON body used for echo when JSON',
		},
	},
	examples: [
		{ folderSlug: 'support', path: '/tickets', method: 'GET' },
		{
			folderSlug: 'support',
			path: '/tickets',
			method: 'POST',
			contentType: 'application/json',
			bodyJson: { subject: 'Hello' },
		},
	],
	required: ['folderSlug', 'path', 'method'],
	additionalProperties: false,
	'x-tags': ['preview', 'mock-serving'],
	'x-intent': 'preview-mock-response',
};

const previewMockOutput = {
	title: 'Preview Result',
	description: 'Simulated response shape for a mock endpoint.',
	type: 'object',
	properties: {
		statusCode: { type: 'integer', description: 'HTTP status for the preview' },
		headers: {
			type: 'object',
			additionalProperties: { type: 'string' },
		},
		isJson: { type: 'boolean', description: 'Whether body is JSON' },
		body: {
			type: ['string', 'object'],
			description: 'Preview body; object when isJson=true',
		},
	},
	required: ['statusCode', 'headers', 'isJson', 'body'],
	examples: [
		{
			statusCode: 200,
			headers: { 'Content-Type': 'application/json' },
			isJson: true,
			body: { ok: true },
		},
	],
};

const tools = [
	{
		name: 'list_folders',
		description: 'List folders with pagination',
		inputSchema: listFoldersInput,
		outputSchema: listFoldersOutput,
	},
	{
		name: 'create_mock',
		description: 'Create a mock response',
		inputSchema: createMockInput,
		outputSchema: createMockOutput,
	},
	{
		name: 'create_schema_mock',
		description:
			'Create a mock using a JSON Schema with Faker directives and field interpolation',
		inputSchema: {
			title: 'Create Schema Mock',
			description:
				'Create a schema-driven mock. Supports Faker, x-store-as, x-ref, and {$.path} interpolation.',
			type: 'object',
			properties: {
				name: { type: 'string', description: 'Display name of the mock' },
				path: {
					type: 'string',
					description: 'Endpoint path that starts with / (e.g., /users)',
				},
				method: {
					type: 'string',
					enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
					default: 'GET',
					description: 'HTTP method',
				},
				statusCode: { type: 'integer', default: 200, description: 'HTTP code' },
				folderSlug: {
					type: ['string', 'null'],
					description: 'Folder slug alternative to folderId',
				},
				folderId: {
					type: ['string', 'null'],
					description: 'Folder ID alternative to folderSlug',
				},
				jsonSchema: {
					type: 'string',
					description:
						'JSON Schema string with Faker directives and field references',
				},
				enabled: { type: 'boolean', default: true },
				matchType: {
					type: 'string',
					enum: ['exact', 'substring'],
					default: 'exact',
				},
				echoRequestBody: {
					type: ['boolean', 'null'],
					description: 'Echo behavior for write methods',
				},
			},
			required: ['name', 'path', 'method', 'statusCode', 'jsonSchema'],
			additionalProperties: false,
			examples: [
				{
					name: 'Tickets',
					path: '/tickets',
					method: 'GET',
					statusCode: 200,
					folderSlug: 'support',
					jsonSchema:
						'{"type":"object","properties":{"id":{"type":"string","format":"uuid"},"message":{"const":"Your ticket {$.id} has been created"}}}',
				},
			],
			'x-tags': ['mocks', 'schema', 'faker'],
			'x-intent': 'create-schema-mock',
		},
		outputSchema: createMockOutput,
	},
	{
		name: 'preview_mock',
		description: 'Preview the response for a mock path',
		inputSchema: previewMockInput,
		outputSchema: previewMockOutput,
	},
];

const serverInfo = {
	name: 'Mockzilla MCP',
	version: '1.0.0',
	routes: {
		mcp: '/mcp',
		mockServe: '/api/mock/{folderSlug}/{path...}',
		mocksCrud: '/api/mocks',
		foldersCrud: '/api/folders',
	},
	capabilities: {
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
		bodyTypes: ['json', 'text'],
		echoRequestBody: true,
		dynamicSchemaResponses: true,
	},
	tags: ['nextjs', 'drizzle', 'json-schema', 'mock'],
};

const ListFoldersArgs = z.object({
	page: z.number().int().min(1).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});

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
	bodyJson: z.record(z.any()).nullable().optional(),
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
			useDynamicResponse: body.useDynamicResponse,
			echoRequestBody: body.echoRequestBody,
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
		useDynamicResponse: row.useDynamicResponse ?? null,
		echoRequestBody: row.echoRequestBody ?? null,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString() || null,
	};
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
		useDynamicResponse: row.useDynamicResponse ?? null,
		echoRequestBody: row.echoRequestBody ?? null,
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
				eq(mockResponses.method, method as any),
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

const handler = createMcpHandler(
	(server) => {
		server.tool(
			'list_folders',
			'List folders with pagination',
			{
				page: z.number().int().min(1).optional(),
				limit: z.number().int().min(1).max(100).optional(),
			},
			async ({ page, limit }) => {
				const result = await callListFolders({ page, limit });
				return { content: [{ type: 'json', json: result }] };
			},
		);

		server.tool(
			'create_mock',
			'Create a mock response',
			CreateMockArgs.shape,
			async (args) => {
				const result = await callCreateMock(args);
				return { content: [{ type: 'json', json: result }] };
			},
		);

		server.tool(
			'create_schema_mock',
			'Create a mock using a JSON Schema with Faker directives and field interpolation',
			z.object({
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
			async (args) => {
				const result = await callCreateSchemaMock(args as any);
				return { content: [{ type: 'json', json: result }] };
			},
		);

		server.tool(
			'preview_mock',
			'Preview the response for a mock path',
			PreviewMockArgs.shape,
			async (args) => {
				const result = await callPreviewMock(args);
				return { content: [{ type: 'json', json: result }] };
			},
		);
	},
	{
		capabilities: {
			tools: {
				list_folders: { description: 'List folders' },
				create_mock: { description: 'Create mock' },
				create_schema_mock: { description: 'Create schema mock' },
				preview_mock: { description: 'Preview mock' },
			},
		},
	},
	{
		basePath: '/mcp',
		verboseLogs: true,
	},
);

export { handler as GET, handler as POST };
