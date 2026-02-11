import { db } from '@/lib/db';
import { folders, mockResponses } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { toMockResponse } from '../helpers';
import type { FindMocksArgs, ManageMocksArgs, PreviewMockArgs } from '../schemas/mocks';

export async function handleFindMocks(args: FindMocksArgs) {
	if (args.action === 'list') {
		const page = args.page ?? 1;
		const limit = args.limit ?? 10;
		const offset = (page - 1) * limit;

		let total = 0;
		let rows = [];

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
		return {
			data: rows.map(toMockResponse),
			meta: { total, page, limit, totalPages },
		};
	}

	if (args.action === 'get') {
		const [row] = await db
			.select()
			.from(mockResponses)
			.where(eq(mockResponses.id, args.id));
		if (!row) throw new Error(`Mock not found with id=${args.id}`);
		return toMockResponse(row);
	}
}

export async function handleManageMocks(args: ManageMocksArgs) {
	if (args.action === 'create') {
		let targetFolderId = args.folderId;
		if (!targetFolderId && args.folderSlug) {
			const [folder] = await db
				.select()
				.from(folders)
				.where(eq(folders.slug, args.folderSlug))
				.limit(1);
			if (!folder) {
				throw new Error('Folder not found for provided slug');
			}
			targetFolderId = folder.id;
		}
		if (!targetFolderId) {
			throw new Error('folderSlug or folderId is required');
		}

		// Handle Schema Mock generation logic if jsonSchema provided
		let response = args.response || '';
		if (args.jsonSchema && !response) {
			const { validateSchema, generateFromSchemaString } = await import(
				'@/lib/schema-generator'
			);
			const validation = validateSchema(args.jsonSchema);
			if (!validation.valid) {
				throw new Error(validation.error || 'Invalid JSON Schema');
			}
			response = generateFromSchemaString(args.jsonSchema);
		}

		const [row] = await db
			.insert(mockResponses)
			.values({
				name: args.name,
				endpoint: args.path,
				method: args.method,
				statusCode: args.statusCode,
				response: response,
				folderId: targetFolderId,
				matchType: args.matchType || 'exact',
				bodyType: args.bodyType || 'json',
				enabled: args.enabled ?? true,
				jsonSchema: args.jsonSchema,
				useDynamicResponse: args.useDynamicResponse ?? !!args.jsonSchema,
				echoRequestBody: args.echoRequestBody ?? false,
			})
			.returning();

		return toMockResponse(row);
	}

	if (args.action === 'update') {
		const [row] = await db
			.update(mockResponses)
			.set({
				name: args.name,
				endpoint: args.path,
				method: args.method,
				statusCode: args.statusCode,
				response: args.response,
				matchType: args.matchType,
				bodyType: args.bodyType,
				enabled: args.enabled,
				jsonSchema: args.jsonSchema,
				useDynamicResponse: args.useDynamicResponse ?? undefined,
				echoRequestBody: args.echoRequestBody ?? undefined,
				updatedAt: new Date(),
			})
			.where(eq(mockResponses.id, args.id))
			.returning();
		
		if (!row) throw new Error(`Mock not found with id=${args.id}`);
		return toMockResponse(row);
	}

	if (args.action === 'delete') {
		const [deleted] = await db
			.delete(mockResponses)
			.where(eq(mockResponses.id, args.id))
			.returning();
			
		if (!deleted) {
		  throw new Error(`Mock not found with id=${args.id}`);
		}
		return { success: true, id: deleted.id };
	}
}

export async function handlePreviewMock(args: PreviewMockArgs) {
	const folderSlug = args.folderSlug;
	const mockPath = args.path;
	const method = args.method;
	
	const [folder] = await db
		.select()
		.from(folders)
		.where(eq(folders.slug, folderSlug))
		.limit(1);
	
	if (!folder) {
		return {
			statusCode: 404,
			headers: {},
			isJson: true,
			body: { error: 'Folder not found' },
		};
	}

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

	if (!mock) {
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
	}

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
			// Fallback if generation fails
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
			// Fallback if JSON parse fails
		}
	}

	return {
		statusCode: mock.statusCode,
		headers: { 'Content-Type': contentType },
		isJson: false,
		body: mock.response,
	};
}
