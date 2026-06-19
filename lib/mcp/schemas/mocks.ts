import { z } from 'zod';
import { MockVariantSchema } from './shared';

export const CreateMockArgs = z.object({
	name: z.string().describe('The name of the mock'),
	path: z.string().describe('The endpoint path (e.g. /api/users)'),
	method: z
		.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
		.describe('HTTP method'),
	statusCode: z.number().int().describe('HTTP status code to return'),
	folderId: z
		.string()
		.optional()
		.describe('The ID of the parent folder (required if folderSlug not provided)'),
	folderSlug: z
		.string()
		.optional()
		.describe(
			'The slug of the parent folder (alternative to folderId, e.g. "my-folder")',
		),
	mockFolderId: z
		.string()
		.nullable()
		.optional()
		.describe('Optional mock subfolder ID. Null means root of the parent folder.'),
	response: z.string().describe('The response body (JSON string or text)'),
	matchType: z
		.enum(['exact', 'substring', 'wildcard'])
		.optional()
		.describe('Matching strategy for the path'),
	bodyType: z
		.enum(['json', 'text'])
		.optional()
		.describe('Content type of the response'),
	enabled: z.boolean().optional().describe('Whether the mock is active'),
	queryParams: z
		.record(z.string())
		.nullable()
		.optional()
		.describe('Query parameters to match'),
	variants: z
		.array(MockVariantSchema)
		.nullable()
		.optional()
		.describe('Wildcard capture variants'),
	wildcardRequireMatch: z
		.boolean()
		.optional()
		.describe('If true, 404 if no variant matches'),
	jsonSchema: z
		.string()
		.nullable()
		.optional()
		.describe('JSON Schema for dynamic generation'),
	useDynamicResponse: z
		.boolean()
		.nullable()
		.optional()
		.describe('Enable faker-based dynamic data'),
	echoRequestBody: z
		.boolean()
		.nullable()
		.optional()
		.describe('Echo the request body back to the client'),
	delay: z
		.number()
		.int()
		.optional()
		.describe('Response delay in milliseconds'),
});
export type CreateMockArgs = z.infer<typeof CreateMockArgs>;

export const PreviewMockArgs = z.object({
	folderSlug: z.string(),
	path: z.string(),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
	contentType: z.string().nullable().optional(),
	queryParams: z.record(z.string()).nullable().optional(),
	headers: z.record(z.string()).nullable().optional(),
	bodyText: z.string().nullable().optional(),
	bodyJson: z.record(z.unknown()).nullable().optional(),
});
export type PreviewMockArgs = z.infer<typeof PreviewMockArgs>;

export const ListMocksArgs = z.object({
	folderId: z.string().optional().describe('Filter by folder ID'),
	folderSlug: z
		.string()
		.optional()
		.describe('Filter by folder slug (e.g. "my-folder")'),
	mockFolderId: z
		.string()
		.nullable()
		.optional()
		.describe('Filter by mock subfolder ID. Null means root-level mocks.'),
	page: z.number().int().min(1).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});
export type ListMocksArgs = z.infer<typeof ListMocksArgs>;

export const GetMockArgs = z.object({ id: z.string().describe('The mock ID') });
export type GetMockArgs = z.infer<typeof GetMockArgs>;

export const UpdateMockArgs = z.object({
	id: z.string().describe('The ID of the mock to update'),
	name: z.string().describe('The name of the mock'),
	path: z.string().describe('The endpoint path (e.g. /api/users)'),
	method: z
		.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
		.describe('HTTP method'),
	statusCode: z.number().int().describe('HTTP status code to return'),
	response: z.string().describe('The response body (JSON string or text)'),
	mockFolderId: z.string().nullable().optional(),
	matchType: z
		.enum(['exact', 'substring', 'wildcard'])
		.optional()
		.describe('Matching strategy for the path'),
	bodyType: z
		.enum(['json', 'text'])
		.optional()
		.describe('Content type of the response'),
	enabled: z.boolean().optional().describe('Whether the mock is active'),
	queryParams: z
		.record(z.string())
		.nullable()
		.optional()
		.describe('Query parameters to match'),
	variants: z
		.array(MockVariantSchema)
		.nullable()
		.optional()
		.describe('Wildcard capture variants'),
	wildcardRequireMatch: z
		.boolean()
		.optional()
		.describe('If true, 404 if no variant matches'),
	jsonSchema: z
		.string()
		.nullable()
		.optional()
		.describe('JSON Schema for dynamic generation'),
	useDynamicResponse: z
		.boolean()
		.nullable()
		.optional()
		.describe('Enable faker-based dynamic data'),
	echoRequestBody: z
		.boolean()
		.nullable()
		.optional()
		.describe('Echo the request body back to the client'),
	delay: z
		.number()
		.int()
		.optional()
		.describe('Response delay in milliseconds'),
});
export type UpdateMockArgs = z.infer<typeof UpdateMockArgs>;

export const DeleteMockArgs = z.object({ id: z.string() });
export type DeleteMockArgs = z.infer<typeof DeleteMockArgs>;

export const ManageMocksArgs = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('list'),
		folderId: z.string().optional(),
		folderSlug: z.string().optional(),
		page: z.number().int().min(1).optional(),
		limit: z.number().int().min(1).max(100).optional(),
	}),
	z.object({
		action: z.literal('create'),
		name: z.string(),
		path: z.string(),
		method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
		statusCode: z.number().int(),
		folderId: z.string().optional(),
		folderSlug: z.string().optional(),
		mockFolderId: z.string().nullable().optional(),
		response: z.string().optional().describe('Response body (required if jsonSchema not provided)'),
		matchType: z.enum(['exact', 'substring', 'wildcard']).optional(),
		bodyType: z.enum(['json', 'text']).optional(),
		enabled: z.boolean().optional(),
		queryParams: z.record(z.string()).nullable().optional(),
		variants: z.array(MockVariantSchema).nullable().optional(),
		wildcardRequireMatch: z.boolean().optional(),
		jsonSchema: z.string().nullable().optional(),
		useDynamicResponse: z.boolean().nullable().optional(),
		echoRequestBody: z.boolean().nullable().optional(),
		delay: z.number().int().optional(),
	}),
	z.object({
		action: z.literal('get'),
		id: z.string(),
	}),
	z.object({
		action: z.literal('update'),
		id: z.string(),
		name: z.string().optional(),
		path: z.string().optional(),
		method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).optional(),
		statusCode: z.number().int().optional(),
		response: z.string().optional(),
		mockFolderId: z.string().nullable().optional(),
		matchType: z.enum(['exact', 'substring', 'wildcard']).optional(),
		bodyType: z.enum(['json', 'text']).optional(),
		enabled: z.boolean().optional(),
		queryParams: z.record(z.string()).nullable().optional(),
		variants: z.array(MockVariantSchema).nullable().optional(),
		wildcardRequireMatch: z.boolean().optional(),
		jsonSchema: z.string().nullable().optional(),
		useDynamicResponse: z.boolean().nullable().optional(),
		echoRequestBody: z.boolean().nullable().optional(),
		delay: z.number().int().optional(),
	}),
	z.object({
		action: z.literal('delete'),
		id: z.string(),
	}),
	z.object({
		action: z.literal('preview'),
		folderSlug: z.string(),
		path: z.string(),
		method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
		contentType: z.string().nullable().optional(),
		queryParams: z.record(z.string()).nullable().optional(),
		headers: z.record(z.string()).nullable().optional(),
		bodyText: z.string().nullable().optional(),
		bodyJson: z.record(z.unknown()).nullable().optional(),
	}),
]);
export type ManageMocksArgs = z.infer<typeof ManageMocksArgs>;

export const CreateSchemaMockArgs = z.object({
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
	mockFolderId: z.string().nullable().optional(),
	jsonSchema: z.string(),
	enabled: z.boolean().optional(),
	matchType: z.enum(['exact', 'substring', 'wildcard']).optional(),
	queryParams: z.record(z.string()).nullable().optional(),
	variants: z.array(MockVariantSchema).nullable().optional(),
	wildcardRequireMatch: z.boolean().optional(),
	echoRequestBody: z.boolean().nullable().optional(),
});
export type CreateSchemaMockArgs = z.infer<typeof CreateSchemaMockArgs>;
