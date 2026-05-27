import { z } from 'zod';

export const ListFoldersArgs = z.object({
	page: z.number().int().min(1).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});
export type ListFoldersArgs = z.infer<typeof ListFoldersArgs>;

export const CreateFolderArgs = z.object({
	name: z.string(),
	description: z.string().optional(),
});
export type CreateFolderArgs = z.infer<typeof CreateFolderArgs>;

export const GetFolderArgs = z
	.object({ id: z.string().optional(), slug: z.string().optional() })
	.refine((v) => !!v.id || !!v.slug, { message: 'id or slug is required' });
export type GetFolderArgs = z.infer<typeof GetFolderArgs>;

export const UpdateFolderArgs = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
});
export type UpdateFolderArgs = z.infer<typeof UpdateFolderArgs>;

export const DeleteFolderArgs = z.object({ id: z.string() });
export type DeleteFolderArgs = z.infer<typeof DeleteFolderArgs>;

export const ManageFoldersArgs = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('list'),
		page: z.number().int().min(1).optional(),
		limit: z.number().int().min(1).max(100).optional(),
	}),
	z.object({
		action: z.literal('create'),
		name: z.string(),
		description: z.string().optional(),
	}),
	z.object({
		action: z.literal('get'),
		id: z.string().optional(),
		slug: z.string().optional(),
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
export type ManageFoldersArgs = z.infer<typeof ManageFoldersArgs>;
