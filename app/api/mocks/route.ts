import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mockResponses, mockSubfolders } from '@/lib/db/schema';
import type { CreateMockRequest, UpdateMockRequest } from '@/lib/types';
import { joinMockPaths } from '@/lib/utils/mock-paths';

type MockResponseRow = typeof mockResponses.$inferSelect;
type MockSubfolderRow = typeof mockSubfolders.$inferSelect;

function formatMock(
	mock: MockResponseRow,
	subfoldersById: Map<string, MockSubfolderRow> = new Map(),
) {
	const subfolder = mock.mockFolderId
		? subfoldersById.get(mock.mockFolderId)
		: undefined;
	const effectivePath = joinMockPaths(subfolder?.mainPath ?? '/', mock.endpoint);
	return {
		id: mock.id,
		name: mock.name,
		path: mock.endpoint,
		relativePath: mock.endpoint,
		effectivePath,
		method: mock.method,
		response: mock.response,
		statusCode: mock.statusCode,
		folderId: mock.folderId,
		mockFolderId: mock.mockFolderId,
		matchType: mock.matchType || 'exact',
		bodyType: mock.bodyType || 'json',
		enabled: mock.enabled,
		jsonSchema: mock.jsonSchema,
		useDynamicResponse: mock.useDynamicResponse,
		echoRequestBody: mock.echoRequestBody,
		delay: mock.delay,
		meta: mock.meta,
		queryParams: mock.queryParams,
		variants: mock.variants,
		wildcardRequireMatch: mock.wildcardRequireMatch,
		createdAt: mock.createdAt.toISOString(),
		updatedAt: mock.updatedAt?.toISOString(),
	};
}

async function getSubfoldersByIdForMocks(
	mocks: MockResponseRow[],
): Promise<Map<string, MockSubfolderRow>> {
	const ids = new Set(
		mocks
			.map((mock) => mock.mockFolderId)
			.filter((id): id is string => Boolean(id)),
	);
	if (ids.size === 0) return new Map();
	const folderId = mocks.find((mock) => mock.folderId)?.folderId;
	if (!folderId) return new Map();
	const rows = await db
		.select()
		.from(mockSubfolders)
		.where(eq(mockSubfolders.folderId, folderId));
	return new Map(rows.map((row) => [row.id, row]));
}

async function validateMockFolderOwnership(
	folderId: string,
	mockFolderId: string | null | undefined,
): Promise<NextResponse | null> {
	if (!mockFolderId) return null;
	const [subfolder] = await db
		.select()
		.from(mockSubfolders)
		.where(
			and(
				eq(mockSubfolders.id, mockFolderId),
				eq(mockSubfolders.folderId, folderId),
			),
		)
		.limit(1);
	if (subfolder) return null;
	return NextResponse.json(
		{ error: 'Mock subfolder not found for this folder' },
		{ status: 400 },
	);
}

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const folderId = searchParams.get('folderId');
		const mockFolderId = searchParams.get('mockFolderId');
		const id = searchParams.get('id');
		const q = searchParams.get('q');
		const page = Number.parseInt(searchParams.get('page') || '1', 10);
		const limit = Number.parseInt(searchParams.get('limit') || '10', 10);
		const offset = (page - 1) * limit;

		if (id) {
			const [mock] = await db
				.select()
				.from(mockResponses)
				.where(eq(mockResponses.id, id));

			if (!mock) {
				return NextResponse.json({ error: 'Mock not found' }, { status: 404 });
			}

			const subfoldersById = await getSubfoldersByIdForMocks([mock]);
			return NextResponse.json(formatMock(mock, subfoldersById));
		}

		let mocks: (typeof mockResponses.$inferSelect)[];
		let total: number;

		// Re-writing more idiomatically for Drizzle
		let finalMocksQuery = db.select().from(mockResponses);
		let finalCountQuery = db
			.select({ count: sql<number>`count(*)` })
			.from(mockResponses);

		const mockFolderClause =
			mockFolderId === 'root'
				? isNull(mockResponses.mockFolderId)
				: mockFolderId
					? eq(mockResponses.mockFolderId, mockFolderId)
					: undefined;

		if (folderId && q) {
			const searchClause = or(
				ilike(mockResponses.name, `%${q}%`),
				ilike(mockResponses.endpoint, `%${q}%`),
			);
			const whereClause = mockFolderClause
				? and(eq(mockResponses.folderId, folderId), mockFolderClause, searchClause)
				: and(eq(mockResponses.folderId, folderId), searchClause);
			finalMocksQuery = finalMocksQuery.where(whereClause) as typeof finalMocksQuery;
			finalCountQuery = finalCountQuery.where(whereClause) as typeof finalCountQuery;
		} else if (folderId) {
			const whereClause = mockFolderClause
				? and(eq(mockResponses.folderId, folderId), mockFolderClause)
				: eq(mockResponses.folderId, folderId);
			finalMocksQuery = finalMocksQuery.where(whereClause) as typeof finalMocksQuery;
			finalCountQuery = finalCountQuery.where(whereClause) as typeof finalCountQuery;
		} else if (q) {
			const whereClause = or(
				ilike(mockResponses.name, `%${q}%`),
				ilike(mockResponses.endpoint, `%${q}%`),
			);
			finalMocksQuery = finalMocksQuery.where(whereClause) as typeof finalMocksQuery;
			finalCountQuery = finalCountQuery.where(whereClause) as typeof finalCountQuery;
		}

		const [totalResult] = await finalCountQuery;
		total = Number(totalResult.count);

		mocks = await finalMocksQuery
			.orderBy(desc(sql`COALESCE(${mockResponses.updatedAt}, ${mockResponses.createdAt})`))
			.limit(limit)
			.offset(offset);

		const totalPages = Math.ceil(total / limit);

		const subfoldersById = await getSubfoldersByIdForMocks(mocks);
		const formattedMocks = mocks.map((mock) => formatMock(mock, subfoldersById));

		return NextResponse.json({
			data: formattedMocks,
			meta: {
				total,
				page,
				limit,
				totalPages,
			},
		});
	} catch (error: unknown) {
		console.error(
			'[API] Error fetching mocks:',
			error instanceof Error ? error.message : String(error),
		);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Failed to fetch mocks',
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body: CreateMockRequest = await request.json();
		const ownershipError = await validateMockFolderOwnership(
			body.folderId,
			body.mockFolderId,
		);
		if (ownershipError) return ownershipError;

		const [newMock] = await db
			.insert(mockResponses)
			.values({
				name: body.name,
				endpoint: body.path,
				method: body.method,
				statusCode: body.statusCode,
				response: body.response,
				folderId: body.folderId,
				mockFolderId: body.mockFolderId || null,
				matchType: body.matchType || 'exact',
				bodyType: body.bodyType || 'json',
				enabled: body.enabled ?? true,
				queryParams: body.queryParams,
				variants: body.variants,
				wildcardRequireMatch: body.wildcardRequireMatch,
				jsonSchema: body.jsonSchema,
				useDynamicResponse: body.useDynamicResponse,
				echoRequestBody: body.echoRequestBody,
				delay: body.delay ?? 0,
				meta: body.meta ?? {},
			})
			.returning();

		const subfoldersById = await getSubfoldersByIdForMocks([newMock]);
		return NextResponse.json(formatMock(newMock, subfoldersById), { status: 201 });
	} catch (error: unknown) {
		console.error(
			'[API] Error creating mock:',
			error instanceof Error ? error.message : String(error),
		);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Failed to create mock',
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
				{ error: 'Mock ID is required' },
				{ status: 400 },
			);
		}

		const body: UpdateMockRequest = await request.json();

		const [existingMock] = await db
			.select()
			.from(mockResponses)
			.where(eq(mockResponses.id, id))
			.limit(1);
		if (!existingMock) {
			return NextResponse.json({ error: 'Mock not found' }, { status: 404 });
		}

		const ownershipError = await validateMockFolderOwnership(
			existingMock.folderId,
			body.mockFolderId,
		);
		if (ownershipError) return ownershipError;

		const [updatedMock] = await db
			.update(mockResponses)
			.set({
				name: body.name,
				endpoint: body.path,
				method: body.method,
				statusCode: body.statusCode,
				response: body.response,
				mockFolderId: body.mockFolderId || null,
				matchType: body.matchType || 'exact',
				queryParams: body.queryParams,
				variants: body.variants,
				wildcardRequireMatch: body.wildcardRequireMatch,
				jsonSchema: body.jsonSchema,
				useDynamicResponse: body.useDynamicResponse,
				echoRequestBody: body.echoRequestBody,
				delay: body.delay ?? 0,
				meta: body.meta,
				bodyType: body.bodyType || 'json',
				enabled: body.enabled ?? true,
				updatedAt: new Date(),
			})
			.where(eq(mockResponses.id, id))
			.returning();

		if (!updatedMock) {
			return NextResponse.json({ error: 'Mock not found' }, { status: 404 });
		}

		const subfoldersById = await getSubfoldersByIdForMocks([updatedMock]);
		return NextResponse.json(formatMock(updatedMock, subfoldersById));
	} catch (error: unknown) {
		console.error(
			'[API] Error updating mock:',
			error instanceof Error ? error.message : String(error),
		);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Failed to update mock',
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
				{ error: 'Mock ID is required' },
				{ status: 400 },
			);
		}

		await db.delete(mockResponses).where(eq(mockResponses.id, id));

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		console.error(
			'[API] Error deleting mock:',
			error instanceof Error ? error.message : String(error),
		);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Failed to delete mock',
			},
			{ status: 500 },
		);
	}
}
