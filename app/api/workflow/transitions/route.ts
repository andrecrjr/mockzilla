import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { transitions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		const body = await request.json();
		const {
			scenarioId,
			name,
			description,
			path,
			method,
			conditions,
			effects,
			response,
			meta,
		} = body;

		if (!scenarioId || !path || !method || !response) {
			return NextResponse.json(
				{ error: 'Missing required fields: scenarioId, path, method, response' },
				{ status: 400 }
			);
		}

		console.log('Creating transition:', { scenarioId, path, method });

		const result = await db
			.insert(transitions)
			.values({
				scenarioId,
				name: name || '',
				description: description || null,
				path,
				method,
				conditions: conditions || {},
				effects: effects || [],
				response,
				meta: meta || {},
			})
			.returning();

		if (!result || result.length === 0) {
			throw new Error('Failed to create transition: No record returned');
		}

		return NextResponse.json(result[0], { status: 201 });
	} catch (error) {
		console.error('Error creating transition:', error);
		return NextResponse.json(
			{ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest): Promise<NextResponse> {
	try {
		const searchParams = request.nextUrl.searchParams;
		const scenarioId = searchParams.get('scenarioId');

		if (!scenarioId) {
			return NextResponse.json(
				{ error: 'scenarioId is required' },
				{ status: 400 }
			);
		}

		const result = await db
			.select()
			.from(transitions)
			.where(eq(transitions.scenarioId, scenarioId));

		return NextResponse.json(result || []);
	} catch (error) {
		console.error('Error fetching transitions:', error);
		return NextResponse.json(
			{ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
}
