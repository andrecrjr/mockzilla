import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { transitions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
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
				name: name || '', // Default to empty string if not provided
				description: description || null,
				path,
				method,
				conditions: conditions || {},
				effects: effects || [],
				response,
				meta: meta || {},
			})
			.returning();

		return NextResponse.json(result[0], { status: 201 });
	} catch (error) {
		console.error('Error creating transition:', error);
		return NextResponse.json(
			{ error: 'Internal Server Error', details: String(error) },
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const scenarioId = searchParams.get('scenarioId');

	if (!scenarioId) {
		return NextResponse.json(
			{ error: 'scenarioId is required' },
			{ status: 400 }
		);
	}

	try {
		const result = await db
			.select()
			.from(transitions)
			.where(eq(transitions.scenarioId, scenarioId));

		return NextResponse.json(result);
	} catch (error) {
		console.error('Error fetching transitions:', error);
		return NextResponse.json(
			{ error: 'Internal Server Error', details: String(error) },
			{ status: 500 }
		);
	}
}
