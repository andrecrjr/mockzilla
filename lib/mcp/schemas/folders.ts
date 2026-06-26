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

export const ListMockSubfoldersArgs = z.object({
	folderId: z.string().optional(),
	folderSlug: z.string().optional(),
	parentId: z.string().nullable().optional(),
	all: z.boolean().optional(),
});
export type ListMockSubfoldersArgs = z.infer<typeof ListMockSubfoldersArgs>;

export const CreateMockSubfolderArgs = z.object({
	folderId: z.string().optional(),
	folderSlug: z.string().optional(),
	parentId: z.string().nullable().optional(),
	name: z.string().min(1),
	slug: z.string().min(1).optional(),
});
export type CreateMockSubfolderArgs = z.infer<typeof CreateMockSubfolderArgs>;

export const GetMockSubfolderArgs = z.object({ id: z.string() });
export type GetMockSubfolderArgs = z.infer<typeof GetMockSubfolderArgs>;

export const UpdateMockSubfolderArgs = z.object({
	id: z.string(),
	name: z.string().min(1).optional(),
	slug: z.string().min(1).optional(),
	parentId: z.string().nullable().optional(),
});
export type UpdateMockSubfolderArgs = z.infer<typeof UpdateMockSubfolderArgs>;

export const DeleteMockSubfolderArgs = z.object({ id: z.string() });
export type DeleteMockSubfolderArgs = z.infer<typeof DeleteMockSubfolderArgs>;

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

export const ManageMockSubfoldersArgs = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('list'),
		folderId: z.string().optional(),
		folderSlug: z.string().optional(),
		parentId: z.string().nullable().optional(),
		all: z.boolean().optional(),
	}),
	z.object({
		action: z.literal('create'),
		folderId: z.string().optional(),
		folderSlug: z.string().optional(),
		parentId: z.string().nullable().optional(),
		name: z.string().min(1),
		slug: z.string().min(1).optional(),
	}),
	z.object({
		action: z.literal('get'),
		id: z.string(),
	}),
	z.object({
		action: z.literal('update'),
		id: z.string(),
		name: z.string().min(1).optional(),
		slug: z.string().min(1).optional(),
		parentId: z.string().nullable().optional(),
	}),
	z.object({
		action: z.literal('delete'),
		id: z.string(),
	}),
]);
export type ManageMockSubfoldersArgs = z.infer<typeof ManageMockSubfoldersArgs>;
