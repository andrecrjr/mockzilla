import { eq, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { folders } from '@/lib/db/schema';
import type { CreateFolderRequest, UpdateFolderRequest } from '@/lib/types';

function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');
}

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const all = searchParams.get('all') === 'true';
		const filterType = searchParams.get('type'); // 'extension' | 'standard' | undefined

		const slug = searchParams.get('slug');

		if (slug) {
			const [folder] = await db
				.select()
				.from(folders)
				.where(eq(folders.slug, slug));

			if (!folder) {
				return NextResponse.json(
					{ error: 'Folder not found' },
					{ status: 404 },
				);
			}

			const isExtension = Boolean(
				(folder.meta as Record<string, unknown>)?.extensionSyncData
			);

			return NextResponse.json({
				id: folder.id,
				name: folder.name,
				slug: folder.slug,
				description: folder.description || undefined,
				isExtension,
				meta: (folder.meta as Record<string, unknown>) || undefined,
				createdAt: folder.createdAt.toISOString(),
				updatedAt: folder.updatedAt?.toISOString(),
			});
		}

		if (all) {
			const allFolders = await db
				.select()
				.from(folders)
				.orderBy(folders.createdAt);
			
			const mappedFolders = allFolders.map((folder) => {
				const isExtension = Boolean(
					(folder.meta as Record<string, unknown>)?.extensionSyncData
				);
				return {
					id: folder.id,
					name: folder.name,
					slug: folder.slug,
					description: folder.description || undefined,
					isExtension,
					createdAt: folder.createdAt.toISOString(),
					updatedAt: folder.updatedAt?.toISOString(),
				};
			});

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
		
		const paginatedFolders = await db
			.select()
			.from(folders)
			.orderBy(folders.createdAt)
			.limit(limit)
			.offset(offset);

		const [totalResult] = await db
			.select({ count: sql<number>`count(*)` })
			.from(folders);
		const total = Number(totalResult.count);
		const totalPages = Math.ceil(total / limit);

		// Map database fields to API format
		const formattedFolders = paginatedFolders.map((folder) => {
			const isExtension = Boolean(
				(folder.meta as Record<string, unknown>)?.extensionSyncData
			);
			return {
				id: folder.id,
				name: folder.name,
				slug: folder.slug,
				description: folder.description || undefined,
				isExtension,
				meta: (folder.meta as Record<string, unknown>) || undefined,
				createdAt: folder.createdAt.toISOString(),
				updatedAt: folder.updatedAt?.toISOString(),
			};
		});

		// Apply filter if requested
		const finalFolders = formattedFolders.filter(f => {
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
		console.error('[API] Error fetching folders:', error instanceof Error ? error.message : String(error));
		return NextResponse.json(
			{ error: 'Failed to fetch folders' },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body: CreateFolderRequest = await request.json();

		const slug = generateSlug(body.name);

		const [newFolder] = await db
			.insert(folders)
			.values({
				name: body.name,
				slug,
				description: body.description || null,
			})
			.returning();

		return NextResponse.json(
			{
				id: newFolder.id,
				name: newFolder.name,
				slug: newFolder.slug,
				description: newFolder.description || undefined,
				createdAt: newFolder.createdAt.toISOString(),
				updatedAt: newFolder.updatedAt?.toISOString(),
			},
			{ status: 201 },
		);
	} catch (error: unknown) {
		console.error('[API] Error creating folder:', error instanceof Error ? error.message : String(error));
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Failed to create folder' },
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

		const body: UpdateFolderRequest = await request.json();
		const slug = generateSlug(body.name);

		const [updatedFolder] = await db
			.update(folders)
			.set({
				name: body.name,
				slug,
				description: body.description || null,
				updatedAt: new Date(),
			})
			.where(eq(folders.id, id))
			.returning();

		if (!updatedFolder) {
			return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
		}

		return NextResponse.json({
			id: updatedFolder.id,
			name: updatedFolder.name,
			slug: updatedFolder.slug,
			description: updatedFolder.description || undefined,
			createdAt: updatedFolder.createdAt.toISOString(),
			updatedAt: updatedFolder.updatedAt?.toISOString(),
		});
	} catch (error: unknown) {
		console.error('[API] Error updating folder:', error instanceof Error ? error.message : String(error));
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Failed to update folder' },
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
		console.error('[API] Error deleting folder:', error instanceof Error ? error.message : String(error));
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Failed to delete folder' },
			{ status: 500 },
		);
	}
}
