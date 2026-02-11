import { z } from 'zod';

const FindFoldersListSchema = z.object({
	action: z.literal('list'),
	page: z.number().int().min(1).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});

const FindFoldersGetSchema = z.object({
	action: z.literal('get'),
	id: z.string().optional(),
	slug: z.string().optional(),
}).refine((v) => !!v.id || !!v.slug, { message: 'id or slug is required for action=get' });

export const FindFoldersSchema = z.union([FindFoldersListSchema, FindFoldersGetSchema]);

const ManageFoldersCreateSchema = z.object({
	action: z.literal('create'),
	name: z.string(),
	description: z.string().optional(),
});

const ManageFoldersUpdateSchema = z.object({
	action: z.literal('update'),
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
});

const ManageFoldersDeleteSchema = z.object({
	action: z.literal('delete'),
	id: z.string(),
});

export const ManageFoldersSchema = z.union([
	ManageFoldersCreateSchema,
	ManageFoldersUpdateSchema,
	ManageFoldersDeleteSchema,
]);

export type FindFoldersArgs = z.infer<typeof FindFoldersSchema>;
export type ManageFoldersArgs = z.infer<typeof ManageFoldersSchema>;
