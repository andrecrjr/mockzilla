import { db } from '@/lib/db';
import { folders } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { generateSlug, toFolderResponse } from '../helpers';
import type { FindFoldersArgs, ManageFoldersArgs } from '../schemas/folders';
import type { folders as FoldersTable } from '@/lib/db/schema';

export async function handleFindFolders(args: FindFoldersArgs) {
	if (args.action === 'list') {
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

		return {
			data: rows.map(toFolderResponse),
			meta: { total, page, limit, totalPages },
		};
	}

	if (args.action === 'get') {
		let row: typeof FoldersTable.$inferSelect | undefined;
		if (args.id) {
			[row] = await db.select().from(folders).where(eq(folders.id, args.id));
		} else if (args.slug) {
			[row] = await db.select().from(folders).where(eq(folders.slug, args.slug));
		}
		
		if (!row) {
			throw new Error(`Folder not found with id=${args.id} or slug=${args.slug}`);
		}
		
		return toFolderResponse(row);
	}
}

export async function handleManageFolders(args: ManageFoldersArgs) {
	if (args.action === 'create') {
		const slug = generateSlug(args.name);
		const [row] = await db
			.insert(folders)
			.values({
				name: args.name,
				slug,
				description: args.description ?? null,
			})
			.returning();
		return toFolderResponse(row);
	}

	if (args.action === 'update') {
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
		
		if (!row) throw new Error(`Folder not found with id=${args.id}`);
		return toFolderResponse(row);
	}

	if (args.action === 'delete') {
		const [deleted] = await db
			.delete(folders)
			.where(eq(folders.id, args.id))
			.returning();
		
		if (!deleted) {
		  throw new Error(`Folder not found with id=${args.id}`);
		}
		return { success: true, id: deleted.id };
	}
}
