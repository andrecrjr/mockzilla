import { desc, eq, ilike, or, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mockResponses } from '@/lib/db/schema';
import type { CreateMockRequest, UpdateMockRequest } from '@/lib/types';

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const folderId = searchParams.get('folderId');
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

			return NextResponse.json({
				id: mock.id,
				name: mock.name,
				path: mock.endpoint,
				method: mock.method,
				response: mock.response,
				statusCode: mock.statusCode,
				folderId: mock.folderId,
				matchType: mock.matchType || 'exact',
				bodyType: mock.bodyType || 'json',
				enabled: mock.enabled,
				jsonSchema: mock.jsonSchema,
				useDynamicResponse: mock.useDynamicResponse,
				echoRequestBody: mock.echoRequestBody,
				delay: mock.delay,
				queryParams: mock.queryParams,
				variants: mock.variants,
				wildcardRequireMatch: mock.wildcardRequireMatch,
				createdAt: mock.createdAt.toISOString(),
				updatedAt: mock.updatedAt?.toISOString(),
			});
		}

		let mocks: (typeof mockResponses.$inferSelect)[];
		let total: number;

		let mocksQuery = db.select().from(mockResponses);
		let countQuery = db
			.select({ count: sql<number>`count(*)` })
			.from(mockResponses);

		const conditions = [];
		if (folderId) {
			conditions.push(eq(mockResponses.folderId, folderId));
		}
		if (q) {
			conditions.push(
				or(
					ilike(mockResponses.name, `%${q}%`),
					ilike(mockResponses.endpoint, `%${q}%`),
				),
			);
		}

		if (conditions.length > 0) {
			const whereClause = sql.join(conditions, sql` AND `);
			// Using sql construction for complex dynamic where
			// Drizzle supports .where(and(...)) but dynamic construction is easier with sql helper or array
		}

		// Re-writing more idiomatically for Drizzle
		let finalMocksQuery = db.select().from(mockResponses);
		let finalCountQuery = db
			.select({ count: sql<number>`count(*)` })
			.from(mockResponses);

		if (folderId && q) {
			const whereClause = sql`${mockResponses.folderId} = ${folderId} AND (${ilike(mockResponses.name, `%${q}%`)} OR ${ilike(mockResponses.endpoint, `%${q}%`)})`;
			finalMocksQuery = finalMocksQuery.where(whereClause) as typeof finalMocksQuery;
			finalCountQuery = finalCountQuery.where(whereClause) as typeof finalCountQuery;
		} else if (folderId) {
			finalMocksQuery = finalMocksQuery.where(eq(mockResponses.folderId, folderId)) as typeof finalMocksQuery;
			finalCountQuery = finalCountQuery.where(eq(mockResponses.folderId, folderId)) as typeof finalCountQuery;
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

		// Map database fields to API format
		const formattedMocks = mocks.map((mock) => ({
			id: mock.id,
			name: mock.name,
			path: mock.endpoint,
			method: mock.method,
			response: mock.response,
			statusCode: mock.statusCode,
			folderId: mock.folderId,
			matchType: mock.matchType || 'exact',
			bodyType: mock.bodyType || 'json',
			enabled: mock.enabled,
			queryParams: mock.queryParams,
			variants: mock.variants,
			wildcardRequireMatch: mock.wildcardRequireMatch,
			createdAt: mock.createdAt.toISOString(),
			jsonSchema: mock.jsonSchema,
			useDynamicResponse: mock.useDynamicResponse,
			echoRequestBody: mock.echoRequestBody,
			delay: mock.delay,
			updatedAt: mock.updatedAt?.toISOString(),
		}));

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

		const [newMock] = await db
			.insert(mockResponses)
			.values({
				name: body.name,
				endpoint: body.path,
				method: body.method,
				statusCode: body.statusCode,
				response: body.response,
				folderId: body.folderId,
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
			})
			.returning();

		return NextResponse.json(
			{
				id: newMock.id,
				name: newMock.name,
				path: newMock.endpoint,
				method: newMock.method,
				response: newMock.response,
				statusCode: newMock.statusCode,
				folderId: newMock.folderId,
				matchType: newMock.matchType || 'exact',
				bodyType: newMock.bodyType || 'json',
				jsonSchema: newMock.jsonSchema,
				useDynamicResponse: newMock.useDynamicResponse,
				echoRequestBody: newMock.echoRequestBody,
				delay: newMock.delay,
				queryParams: newMock.queryParams,
				variants: newMock.variants,
				wildcardRequireMatch: newMock.wildcardRequireMatch,
				enabled: newMock.enabled,
				createdAt: newMock.createdAt.toISOString(),
				updatedAt: newMock.updatedAt?.toISOString(),
			},
			{ status: 201 },
		);
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

		const [updatedMock] = await db
			.update(mockResponses)
			.set({
				name: body.name,
				endpoint: body.path,
				method: body.method,
				statusCode: body.statusCode,
				response: body.response,
				matchType: body.matchType || 'exact',
				queryParams: body.queryParams,
				variants: body.variants,
				wildcardRequireMatch: body.wildcardRequireMatch,
				jsonSchema: body.jsonSchema,
				useDynamicResponse: body.useDynamicResponse,
				echoRequestBody: body.echoRequestBody,
				delay: body.delay ?? 0,
				bodyType: body.bodyType || 'json',
				enabled: body.enabled ?? true,
				updatedAt: new Date(),
			})
			.where(eq(mockResponses.id, id))
			.returning();

		if (!updatedMock) {
			return NextResponse.json({ error: 'Mock not found' }, { status: 404 });
		}

		return NextResponse.json({
			id: updatedMock.id,
			name: updatedMock.name,
			path: updatedMock.endpoint,
			method: updatedMock.method,
			response: updatedMock.response,
			statusCode: updatedMock.statusCode,
			folderId: updatedMock.folderId,
			matchType: updatedMock.matchType || 'exact',
			jsonSchema: updatedMock.jsonSchema,
			useDynamicResponse: updatedMock.useDynamicResponse,
			echoRequestBody: updatedMock.echoRequestBody,
			delay: updatedMock.delay,
			queryParams: updatedMock.queryParams,
			variants: updatedMock.variants,
			wildcardRequireMatch: updatedMock.wildcardRequireMatch,
			bodyType: updatedMock.bodyType || 'json',
			enabled: updatedMock.enabled,
			createdAt: updatedMock.createdAt.toISOString(),
			updatedAt: updatedMock.updatedAt?.toISOString(),
		});
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
