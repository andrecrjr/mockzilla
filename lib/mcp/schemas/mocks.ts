import { z } from 'zod';

const FindMocksListSchema = z.object({
	action: z.literal('list'),
	folderId: z.string().optional(),
	page: z.number().int().min(1).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});

const FindMocksGetSchema = z.object({
	action: z.literal('get'),
	id: z.string(),
});

export const FindMocksSchema = z.union([FindMocksListSchema, FindMocksGetSchema]);

const ManageMocksCreateSchema = z.object({
	action: z.literal('create'),
	name: z.string(),
	path: z.string(),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
	statusCode: z.number().int(),
	folderId: z.string().optional(),
	folderSlug: z.string().optional(),

	// Standard mock fields
	response: z.string().optional(),
	matchType: z.enum(['exact', 'substring']).optional(),
	bodyType: z.enum(['json', 'text']).optional(),

	// Schema mock fields
	jsonSchema: z.string().optional(),

	// Common fields
	enabled: z.boolean().optional(),
	useDynamicResponse: z.boolean().optional(),
	echoRequestBody: z.boolean().optional(),
}).refine((data) => !!data.folderId || !!data.folderSlug, {
	message: 'Either folderId or folderSlug is required'
}).refine((data) => !!data.response || !!data.jsonSchema || !!data.echoRequestBody, {
	message: 'Must provide either response, jsonSchema, or enable echoRequestBody'
});

const ManageMocksUpdateSchema = z.object({
	action: z.literal('update'),
	id: z.string(),
	name: z.string().optional(),
	path: z.string().optional(),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).optional(),
	statusCode: z.number().int().optional(),
	response: z.string().optional(),
	matchType: z.enum(['exact', 'substring']).optional(),
	bodyType: z.enum(['json', 'text']).optional(),
	enabled: z.boolean().optional(),
	jsonSchema: z.string().nullable().optional(),
	useDynamicResponse: z.boolean().nullable().optional(),
	echoRequestBody: z.boolean().nullable().optional(),
});

const ManageMocksDeleteSchema = z.object({
	action: z.literal('delete'),
	id: z.string(),
});

export const ManageMocksSchema = z.union([
	ManageMocksCreateSchema,
	ManageMocksUpdateSchema,
	ManageMocksDeleteSchema,
]);

export const PreviewMockSchema = z.object({
	folderSlug: z.string(),
	path: z.string(),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
	contentType: z.string().nullable().optional(),
	bodyText: z.string().nullable().optional(),
	bodyJson: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type FindMocksArgs = z.infer<typeof FindMocksSchema>;
export type ManageMocksArgs = z.infer<typeof ManageMocksSchema>;
export type PreviewMockArgs = z.infer<typeof PreviewMockSchema>;
