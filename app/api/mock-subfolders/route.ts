import { eq, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { mockResponses, mockSubfolders } from '@/lib/db/schema';
import {
	collectDescendantSubfolders,
	computeCanonicalSubfolderMainPaths,
	computeSubtreeMainPaths,
	deriveSubfolderMainPath,
	findMainPathConflict,
	withCanonicalSubfolderMainPaths,
} from '@/lib/mock-subfolders';
import { generateSlug } from '@/lib/utils/mock-paths';

const CreateMockSubfolderSchema = z.object({
	folderId: z.string().uuid(),
	parentId: z.string().uuid().nullable().optional(),
	name: z.string().min(1),
	mainPath: z.string().min(1).optional(),
});
type CreateMockSubfolderInput = z.infer<typeof CreateMockSubfolderSchema>;

const UpdateMockSubfolderSchema = z.object({
	name: z.string().min(1).optional(),
	mainPath: z.string().min(1).optional(),
	parentId: z.string().uuid().nullable().optional(),
});
type UpdateMockSubfolderInput = z.infer<typeof UpdateMockSubfolderSchema>;

type MockSubfolderRow = typeof mockSubfolders.$inferSelect;

function formatMockSubfolder(row: MockSubfolderRow, canonicalMainPath?: string) {
	return {
		id: row.id,
		folderId: row.folderId,
		parentId: row.parentId,
		name: row.name,
		slug: row.slug,
		mainPath: canonicalMainPath ?? row.mainPath,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt?.toISOString(),
	};
}

function hasSiblingSlugInRows(
	rows: MockSubfolderRow[],
	parentId: string | null,
	slug: string,
	excludeId?: string,
): boolean {
	return rows.some(
		(row) =>
			row.parentId === parentId &&
			row.slug === slug &&
			row.id !== excludeId,
	);
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
			const folderSubfolders = await db
				.select()
				.from(mockSubfolders)
				.where(eq(mockSubfolders.folderId, row.folderId));
			const canonicalPaths = computeCanonicalSubfolderMainPaths(folderSubfolders);
			return NextResponse.json(formatMockSubfolder(row, canonicalPaths.get(row.id)));
		}

		if (!folderId) {
			return NextResponse.json(
				{ error: 'folderId is required' },
				{ status: 400 },
			);
		}

		const folderSubfolders = await db
			.select()
			.from(mockSubfolders)
			.where(eq(mockSubfolders.folderId, folderId));
		const canonicalPaths = computeCanonicalSubfolderMainPaths(folderSubfolders);
		const rows = all
			? [...folderSubfolders].sort((a, b) =>
					(canonicalPaths.get(a.id) ?? a.mainPath).localeCompare(
						canonicalPaths.get(b.id) ?? b.mainPath,
					),
				)
			: folderSubfolders
					.filter((row) =>
						parentId ? row.parentId === parentId : row.parentId === null,
					)
					.sort((a, b) => a.name.localeCompare(b.name));

		return NextResponse.json(
			rows.map((row) => formatMockSubfolder(row, canonicalPaths.get(row.id))),
		);
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

		if (!slug) {
			return NextResponse.json({ error: 'Subfolder name is invalid' }, { status: 400 });
		}
		const folderSubfolders = await db
			.select()
			.from(mockSubfolders)
			.where(eq(mockSubfolders.folderId, body.folderId));
		const canonicalPaths = computeCanonicalSubfolderMainPaths(folderSubfolders);
		const parent = parentId
			? folderSubfolders.find((row) => row.id === parentId) ?? null
			: null;
		if (parentId && !parent) {
			return NextResponse.json({ error: 'Parent subfolder not found' }, { status: 404 });
		}
		if (hasSiblingSlugInRows(folderSubfolders, parentId, slug)) {
			return NextResponse.json(
				{ error: 'A subfolder with this name already exists here' },
				{ status: 409 },
			);
		}

		const parentMainPath = parent
			? canonicalPaths.get(parent.id) ?? parent.mainPath
			: null;
		const mainPath = deriveSubfolderMainPath(parentMainPath, slug);

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

		if (!nextSlug) {
			return NextResponse.json({ error: 'Subfolder name is invalid' }, { status: 400 });
		}
		if (nextParentId === id) {
			return NextResponse.json({ error: 'Subfolder cannot be its own parent' }, { status: 400 });
		}

		const storedFolderSubfolders = await db
			.select()
			.from(mockSubfolders)
			.where(eq(mockSubfolders.folderId, existing.folderId));
		const folderSubfolders = withCanonicalSubfolderMainPaths(storedFolderSubfolders);
		const descendants = collectDescendantSubfolders(folderSubfolders, id);
		const descendantIds = new Set(descendants.map((row) => row.id));
		if (nextParentId && descendantIds.has(nextParentId)) {
			return NextResponse.json(
				{ error: 'Subfolder cannot be moved under its descendant' },
				{ status: 400 },
			);
		}

		const parent = nextParentId
			? folderSubfolders.find((row) => row.id === nextParentId) ?? null
			: null;
		if (nextParentId && !parent) {
			return NextResponse.json({ error: 'Parent subfolder not found' }, { status: 404 });
		}
		if (hasSiblingSlugInRows(folderSubfolders, nextParentId, nextSlug, id)) {
			return NextResponse.json(
				{ error: 'A subfolder with this name already exists here' },
				{ status: 409 },
			);
		}

		const nextMainPath = deriveSubfolderMainPath(parent?.mainPath, nextSlug);
		const rootUpdate: MockSubfolderRow = {
			...existing,
			parentId: nextParentId,
			name: nextName,
			slug: nextSlug,
			mainPath: nextMainPath,
		};
		const rowsForPathComputation = folderSubfolders.map((row) =>
			row.id === id ? rootUpdate : row,
		);
		const nextPaths = computeSubtreeMainPaths(rowsForPathComputation, rootUpdate);
		const conflictingPath = findMainPathConflict(folderSubfolders, nextPaths);
		if (conflictingPath) {
			return NextResponse.json(
				{ error: 'A subfolder with this main path already exists' },
				{ status: 409 },
			);
		}

		const row = await db.transaction(async (tx) => {
			const [updatedRoot] = await tx
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

			for (const descendant of descendants) {
				const descendantMainPath = nextPaths.get(descendant.id);
				if (!descendantMainPath || descendantMainPath === descendant.mainPath) continue;
				await tx
					.update(mockSubfolders)
					.set({
						mainPath: descendantMainPath,
						updatedAt: new Date(),
					})
					.where(eq(mockSubfolders.id, descendant.id));
			}

			return updatedRoot;
		});

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
