import { eq, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mockResponses } from '@/lib/db/schema';
import type { CreateMockRequest, UpdateMockRequest } from '@/lib/types';

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const folderId = searchParams.get('folderId');
		const id = searchParams.get('id');
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
				createdAt: mock.createdAt.toISOString(),
				updatedAt: mock.updatedAt?.toISOString(),
			});
		}

		let mocks: (typeof mockResponses.$inferSelect)[];
		let total: number;

		if (folderId) {
			const [totalResult] = await db
				.select({ count: sql<number>`count(*)` })
				.from(mockResponses)
				.where(eq(mockResponses.folderId, folderId));

			total = Number(totalResult.count);

			mocks = await db
				.select()
				.from(mockResponses)
				.where(eq(mockResponses.folderId, folderId))
				.orderBy(mockResponses.createdAt)
				.limit(limit)
				.offset(offset);
		} else {
			const [totalResult] = await db
				.select({ count: sql<number>`count(*)` })
				.from(mockResponses);
			total = Number(totalResult.count);

			mocks = await db
				.select()
				.from(mockResponses)
				.orderBy(mockResponses.createdAt)
				.limit(limit)
				.offset(offset);
		}

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
			createdAt: mock.createdAt.toISOString(),
			jsonSchema: mock.jsonSchema,
			useDynamicResponse: mock.useDynamicResponse,
			echoRequestBody: mock.echoRequestBody,
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
		console.error('[API] Error fetching mocks:', error instanceof Error ? error.message : String(error));
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Failed to fetch mocks' },
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
				jsonSchema: body.jsonSchema,
				useDynamicResponse: body.useDynamicResponse,
				echoRequestBody: body.echoRequestBody,
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
				enabled: newMock.enabled,
				createdAt: newMock.createdAt.toISOString(),
				updatedAt: newMock.updatedAt?.toISOString(),
			},
			{ status: 201 },
		);
	} catch (error: unknown) {
		console.error('[API] Error creating mock:', error instanceof Error ? error.message : String(error));
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Failed to create mock' },
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
				jsonSchema: body.jsonSchema,
				useDynamicResponse: body.useDynamicResponse,
				echoRequestBody: body.echoRequestBody,

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
			bodyType: updatedMock.bodyType || 'json',
			enabled: updatedMock.enabled,
			createdAt: updatedMock.createdAt.toISOString(),
			updatedAt: updatedMock.updatedAt?.toISOString(),
		});
	} catch (error: unknown) {
		console.error('[API] Error updating mock:', error instanceof Error ? error.message : String(error));
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Failed to update mock' },
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
		console.error('[API] Error deleting mock:', error instanceof Error ? error.message : String(error));
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Failed to delete mock' },
			{ status: 500 },
		);
	}
}
