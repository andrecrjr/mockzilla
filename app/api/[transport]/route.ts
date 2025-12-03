import { and, eq, sql } from 'drizzle-orm';
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { db } from '@/lib/db';
import { folders, mockResponses } from '@/lib/db/schema';
import type { CreateMockRequest, HttpMethod } from '@/lib/types';

const ListFoldersArgs = z.object({
	page: z.number().int().min(1).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});

const CreateFolderArgs = z.object({
	name: z.string(),
	description: z.string().optional(),
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
				return { content: [], structuredContent: result };
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
	},
	{
		serverInfo: {
			name: 'Mockzilla',
			version: '1.0.0',
		},
	},
	{
		basePath: '/api',
		verboseLogs: true,
	},
);
export { handler as GET, handler as POST, handler as DELETE };
