import { desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { folders } from '@/lib/db/schema';
import type { CreateFolderRequest, UpdateFolderRequest } from '@/lib/types';
import {
	formatStoredFolderPath,
	getFolderLookupCandidates,
	hasFolderPathConflict,
	normalizeFolderPath,
	validateFolderPath,
} from '@/lib/utils/folder-paths';

function formatFolderResponse(folder: typeof folders.$inferSelect) {
	const path = formatStoredFolderPath(folder.slug);
	const isExtension = Boolean(
		(folder.meta as Record<string, unknown>)?.extensionSyncData,
	);
	return {
		id: folder.id,
		name: folder.name,
		slug: path,
		description: folder.description || undefined,
		isExtension,
		meta: (folder.meta as Record<string, unknown>) || undefined,
		createdAt: folder.createdAt.toISOString(),
		updatedAt: folder.updatedAt?.toISOString(),
	};
}

async function findFolderByPath(path: string) {
	const candidates = getFolderLookupCandidates(path);
	const rows = await db
		.select()
		.from(folders)
		.where(inArray(folders.slug, candidates));
	return (
		rows.find(
			(row) =>
				formatStoredFolderPath(row.slug) === formatStoredFolderPath(path),
		) ?? null
	);
}

async function validateUniqueFolderPath(nextPath: string, excludeId?: string) {
	const rows = await db.select().from(folders);
	const existingPaths = rows
		.filter((row) => row.id !== excludeId)
		.map((row) => formatStoredFolderPath(row.slug));

	if (hasFolderPathConflict(existingPaths, nextPath)) {
		return false;
	}
	return true;
}

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const all = searchParams.get('all') === 'true';
		const filterType = searchParams.get('type'); // 'extension' | 'standard' | undefined
		const q = searchParams.get('q');

		const slug = searchParams.get('slug') ?? searchParams.get('path');

		if (slug) {
			const folder = await findFolderByPath(slug);

			if (!folder) {
				return NextResponse.json(
					{ error: 'Folder not found' },
					{ status: 404 },
				);
			}

			return NextResponse.json(formatFolderResponse(folder));
		}

		if (all) {
			let query = db.select().from(folders);

			if (q) {
				query = query.where(
					or(ilike(folders.name, `%${q}%`), ilike(folders.slug, `%${q}%`)),
				) as typeof query;
			}

			const allFolders = await query.orderBy(
				desc(sql`COALESCE(${folders.updatedAt}, ${folders.createdAt})`),
			);

			const mappedFolders = allFolders.map(formatFolderResponse);

			// Filter if type param is present
			const filteredFolders = mappedFolders.filter((f) => {
				if (filterType === 'extension') return f.isExtension;
				if (filterType === 'standard') return !f.isExtension;
				return true;
			});

			return NextResponse.json(filteredFolders);
		}

		const page = Number.parseInt(searchParams.get('page') || '1', 10);
		const limit = Number.parseInt(searchParams.get('limit') || '10', 10);
		const offset = (page - 1) * limit;

		// Note: We're doing client-side filtering for 'type' because 'meta' is a JSONB column
		// and simple SQL filtering might be complex or inefficient depending on the query structure.
		// For a small number of folders this is fine, but for scale we should consider a dedicated column.

		let foldersQuery = db.select().from(folders);
		let countQuery = db.select({ count: sql<number>`count(*)` }).from(folders);

		if (q) {
			const whereClause = or(
				ilike(folders.name, `%${q}%`),
				ilike(folders.slug, `%${q}%`),
			);
			foldersQuery = foldersQuery.where(whereClause) as typeof foldersQuery;
			countQuery = countQuery.where(whereClause) as typeof countQuery;
		}

		const paginatedFolders = await foldersQuery
			.orderBy(desc(sql`COALESCE(${folders.updatedAt}, ${folders.createdAt})`))
			.limit(limit)
			.offset(offset);

		const [totalResult] = await countQuery;
		const total = Number(totalResult.count);
		const totalPages = Math.ceil(total / limit);

		// Map database fields to API format
		const formattedFolders = paginatedFolders.map(formatFolderResponse);

		// Apply filter if requested
		const finalFolders = formattedFolders.filter((f) => {
			if (filterType === 'extension') return f.isExtension;
			if (filterType === 'standard') return !f.isExtension;
			return true;
		});

		return NextResponse.json({
			data: finalFolders,
			meta: {
				total, // Note: Total count might be inaccurate if filtering matches only a subset
				page,
				limit,
				totalPages,
			},
		});
	} catch (error: unknown) {
		console.error(
			'[API] Error fetching folders:',
			error instanceof Error ? error.message : String(error),
		);
		return NextResponse.json(
			{ error: 'Failed to fetch folders' },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body: CreateFolderRequest = await request.json();
		if (body.slug && /[?#\s]/.test(body.slug)) {
			return NextResponse.json(
				{ error: 'Folder path cannot contain spaces, "?", or "#"' },
				{ status: 400 },
			);
		}

		const slug = normalizeFolderPath(body.slug ?? body.name);

		const validation = validateFolderPath(slug);
		if (!validation.valid) {
			return NextResponse.json({ error: validation.error }, { status: 400 });
		}

		if (!(await validateUniqueFolderPath(slug))) {
			return NextResponse.json(
				{
					error:
						'A folder with this path already exists or overlaps another folder path',
				},
				{ status: 409 },
			);
		}

		const [newFolder] = await db
			.insert(folders)
			.values({
				name: body.name,
				slug,
				description: body.description || null,
			})
			.returning();

		return NextResponse.json(formatFolderResponse(newFolder), { status: 201 });
	} catch (error: unknown) {
		console.error(
			'[API] Error creating folder:',
			error instanceof Error ? error.message : String(error),
		);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : 'Failed to create folder',
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
				{ error: 'Folder ID is required' },
				{ status: 400 },
			);
		}

		const [existingFolder] = await db
			.select()
			.from(folders)
			.where(eq(folders.id, id));

		if (!existingFolder) {
			return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
		}

		const body: UpdateFolderRequest = await request.json();

		// Determine slug update strategy
		// If slug is explicitly provided, use it (after validation)
		// Otherwise, only regenerate slug if name changed
		let slug: string;
		if (body.slug !== undefined) {
			if (/[?#\s]/.test(body.slug)) {
				return NextResponse.json(
					{ error: 'Folder path cannot contain spaces, "?", or "#"' },
					{ status: 400 },
				);
			}
			slug = normalizeFolderPath(body.slug);

			const validation = validateFolderPath(slug);
			if (!validation.valid) {
				return NextResponse.json({ error: validation.error }, { status: 400 });
			}

			if (!(await validateUniqueFolderPath(slug, id))) {
				return NextResponse.json(
					{
						error:
							'A folder with this path already exists or overlaps another folder path',
					},
					{ status: 409 },
				);
			}
		} else {
			const nameChanged = body.name !== existingFolder.name;
			slug = nameChanged
				? normalizeFolderPath(body.name)
				: formatStoredFolderPath(existingFolder.slug);
			if (nameChanged) {
				const validation = validateFolderPath(slug);
				if (!validation.valid) {
					return NextResponse.json(
						{ error: validation.error },
						{ status: 400 },
					);
				}
				if (!(await validateUniqueFolderPath(slug, id))) {
					return NextResponse.json(
						{
							error:
								'A folder with this path already exists or overlaps another folder path',
						},
						{ status: 409 },
					);
				}
			}
		}

		const [updatedFolder] = await db
			.update(folders)
			.set({
				name: body.name ?? existingFolder.name,
				slug,
				description: body.description ?? existingFolder.description,
				meta: body.meta !== undefined ? body.meta : existingFolder.meta,
				updatedAt: new Date(),
			})
			.where(eq(folders.id, id))
			.returning();

		if (!updatedFolder) {
			return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
		}

		return NextResponse.json(formatFolderResponse(updatedFolder));
	} catch (error: unknown) {
		console.error(
			'[API] Error updating folder:',
			error instanceof Error ? error.message : String(error),
		);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : 'Failed to update folder',
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
				{ error: 'Folder ID is required' },
				{ status: 400 },
			);
		}

		await db.delete(folders).where(eq(folders.id, id));

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		console.error(
			'[API] Error deleting folder:',
			error instanceof Error ? error.message : String(error),
		);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : 'Failed to delete folder',
			},
			{ status: 500 },
		);
	}
}
