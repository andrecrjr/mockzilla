import { and, eq, isNull, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { mockResponses, mockSubfolders } from '@/lib/db/schema';
import { generateSlug, normalizeAbsolutePath } from '@/lib/utils/mock-paths';

const CreateMockSubfolderSchema = z.object({
	folderId: z.string().uuid(),
	parentId: z.string().uuid().nullable().optional(),
	name: z.string().min(1),
	mainPath: z.string().min(1),
});
type CreateMockSubfolderInput = z.infer<typeof CreateMockSubfolderSchema>;

const UpdateMockSubfolderSchema = z.object({
	name: z.string().min(1).optional(),
	mainPath: z.string().min(1).optional(),
	parentId: z.string().uuid().nullable().optional(),
});
type UpdateMockSubfolderInput = z.infer<typeof UpdateMockSubfolderSchema>;

type MockSubfolderRow = typeof mockSubfolders.$inferSelect;

function formatMockSubfolder(row: MockSubfolderRow) {
	return {
		id: row.id,
		folderId: row.folderId,
		parentId: row.parentId,
		name: row.name,
		slug: row.slug,
		mainPath: row.mainPath,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString(),
	};
}

function getParentClause(folderId: string, parentId: string | null) {
	return parentId
		? and(eq(mockSubfolders.folderId, folderId), eq(mockSubfolders.parentId, parentId))
		: and(eq(mockSubfolders.folderId, folderId), isNull(mockSubfolders.parentId));
}

async function hasSiblingSlug(
	folderId: string,
	parentId: string | null,
	slug: string,
	excludeId?: string,
): Promise<boolean> {
	const rows = await db
		.select()
		.from(mockSubfolders)
		.where(and(getParentClause(folderId, parentId), eq(mockSubfolders.slug, slug)));
	return rows.some((row) => row.id !== excludeId);
}

async function hasMainPath(
	folderId: string,
	mainPath: string,
	excludeId?: string,
): Promise<boolean> {
	const rows = await db
		.select()
		.from(mockSubfolders)
		.where(
			and(
				eq(mockSubfolders.folderId, folderId),
				eq(mockSubfolders.mainPath, mainPath),
			),
		);
	return rows.some((row) => row.id !== excludeId);
}

async function parentBelongsToFolder(
	folderId: string,
	parentId: string | null,
): Promise<boolean> {
	if (!parentId) return true;
	const [parent] = await db
		.select()
		.from(mockSubfolders)
		.where(and(eq(mockSubfolders.id, parentId), eq(mockSubfolders.folderId, folderId)))
		.limit(1);
	return Boolean(parent);
}

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const id = searchParams.get('id');
		const folderId = searchParams.get('folderId');
		const all = searchParams.get('all') === 'true';
		const parentIdParam = searchParams.get('parentId');
		const parentId = parentIdParam === 'root' ? null : parentIdParam;

		if (id) {
			const [row] = await db
				.select()
				.from(mockSubfolders)
				.where(eq(mockSubfolders.id, id))
				.limit(1);
			if (!row) {
				return NextResponse.json({ error: 'Subfolder not found' }, { status: 404 });
			}
			return NextResponse.json(formatMockSubfolder(row));
		}

		if (!folderId) {
			return NextResponse.json(
				{ error: 'folderId is required' },
				{ status: 400 },
			);
		}

		const rows = all
			? await db
					.select()
					.from(mockSubfolders)
					.where(eq(mockSubfolders.folderId, folderId))
					.orderBy(mockSubfolders.mainPath)
			: await db
					.select()
					.from(mockSubfolders)
					.where(getParentClause(folderId, parentId))
					.orderBy(mockSubfolders.name);

		return NextResponse.json(rows.map(formatMockSubfolder));
	} catch (error: unknown) {
		console.error('[API] Error fetching mock subfolders:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Failed to fetch mock subfolders',
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body: CreateMockSubfolderInput = CreateMockSubfolderSchema.parse(
			await request.json(),
		);
		const parentId = body.parentId ?? null;
		const slug = generateSlug(body.name);
		const mainPath = normalizeAbsolutePath(body.mainPath);

		if (!slug) {
			return NextResponse.json({ error: 'Subfolder name is invalid' }, { status: 400 });
		}
		if (!(await parentBelongsToFolder(body.folderId, parentId))) {
			return NextResponse.json({ error: 'Parent subfolder not found' }, { status: 404 });
		}
		if (await hasSiblingSlug(body.folderId, parentId, slug)) {
			return NextResponse.json(
				{ error: 'A subfolder with this name already exists here' },
				{ status: 409 },
			);
		}
		if (await hasMainPath(body.folderId, mainPath)) {
			return NextResponse.json(
				{ error: 'A subfolder with this main path already exists' },
				{ status: 409 },
			);
		}

		const [row] = await db
			.insert(mockSubfolders)
			.values({
				folderId: body.folderId,
				parentId,
				name: body.name.trim(),
				slug,
				mainPath,
			})
			.returning();

		return NextResponse.json(formatMockSubfolder(row), { status: 201 });
	} catch (error: unknown) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}
		console.error('[API] Error creating mock subfolder:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Failed to create mock subfolder',
			},
			{ status: 500 },
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const id = request.nextUrl.searchParams.get('id');
		if (!id) {
			return NextResponse.json(
				{ error: 'Subfolder ID is required' },
				{ status: 400 },
			);
		}

		const [existing] = await db
			.select()
			.from(mockSubfolders)
			.where(eq(mockSubfolders.id, id))
			.limit(1);
		if (!existing) {
			return NextResponse.json({ error: 'Subfolder not found' }, { status: 404 });
		}

		const body: UpdateMockSubfolderInput = UpdateMockSubfolderSchema.parse(
			await request.json(),
		);
		const nextParentId = body.parentId === undefined ? existing.parentId : body.parentId;
		const nextName = body.name?.trim() ?? existing.name;
		const nextSlug = body.name === undefined ? existing.slug : generateSlug(nextName);
		const nextMainPath =
			body.mainPath === undefined
				? existing.mainPath
				: normalizeAbsolutePath(body.mainPath);

		if (!nextSlug) {
			return NextResponse.json({ error: 'Subfolder name is invalid' }, { status: 400 });
		}
		if (nextParentId === id) {
			return NextResponse.json({ error: 'Subfolder cannot be its own parent' }, { status: 400 });
		}
		if (!(await parentBelongsToFolder(existing.folderId, nextParentId))) {
			return NextResponse.json({ error: 'Parent subfolder not found' }, { status: 404 });
		}
		if (await hasSiblingSlug(existing.folderId, nextParentId, nextSlug, id)) {
			return NextResponse.json(
				{ error: 'A subfolder with this name already exists here' },
				{ status: 409 },
			);
		}
		if (await hasMainPath(existing.folderId, nextMainPath, id)) {
			return NextResponse.json(
				{ error: 'A subfolder with this main path already exists' },
				{ status: 409 },
			);
		}

		const [row] = await db
			.update(mockSubfolders)
			.set({
				parentId: nextParentId,
				name: nextName,
				slug: nextSlug,
				mainPath: nextMainPath,
				updatedAt: new Date(),
			})
			.where(eq(mockSubfolders.id, id))
			.returning();

		return NextResponse.json(formatMockSubfolder(row));
	} catch (error: unknown) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}
		console.error('[API] Error updating mock subfolder:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Failed to update mock subfolder',
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const id = request.nextUrl.searchParams.get('id');
		if (!id) {
			return NextResponse.json(
				{ error: 'Subfolder ID is required' },
				{ status: 400 },
			);
		}

		const [childCount] = await db
			.select({ count: sql<number>`count(*)` })
			.from(mockSubfolders)
			.where(eq(mockSubfolders.parentId, id));
		const [mockCount] = await db
			.select({ count: sql<number>`count(*)` })
			.from(mockResponses)
			.where(eq(mockResponses.mockFolderId, id));

		if (Number(childCount.count) > 0 || Number(mockCount.count) > 0) {
			return NextResponse.json(
				{ error: 'Subfolder must be empty before it can be deleted' },
				{ status: 409 },
			);
		}

		await db.delete(mockSubfolders).where(eq(mockSubfolders.id, id));
		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		console.error('[API] Error deleting mock subfolder:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Failed to delete mock subfolder',
			},
			{ status: 500 },
		);
	}
}
