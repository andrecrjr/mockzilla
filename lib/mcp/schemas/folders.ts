import { z } from 'zod';

export const FindFoldersSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('list'),
		page: z.number().int().min(1).optional(),
		limit: z.number().int().min(1).max(100).optional(),
	}),
	z.object({
		action: z.literal('get'),
		id: z.string().optional(),
		slug: z.string().optional(),
	}).refine((v) => !!v.id || !!v.slug, { message: 'id or slug is required for action=get' }),
]);

export const ManageFoldersSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('create'),
		name: z.string(),
		description: z.string().optional(),
	}),
	z.object({
		action: z.literal('update'),
		id: z.string(),
		name: z.string(),
		description: z.string().optional(),
	}),
	z.object({
		action: z.literal('delete'),
		id: z.string(),
	}),
]);

export type FindFoldersArgs = z.infer<typeof FindFoldersSchema>;
export type ManageFoldersArgs = z.infer<typeof ManageFoldersSchema>;
