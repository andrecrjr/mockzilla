
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scenarioState } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ scenario: string }> }
) {
	try {
		const { scenario } = await params;
		
		const stateRow = await db.select().from(scenarioState).where(eq(scenarioState.scenarioId, scenario));

		if (stateRow.length === 0) {
			return NextResponse.json({
				scenarioId: scenario,
				data: { state: {}, tables: {} }
			});
		}

		return NextResponse.json({
			scenarioId: scenario,
			data: stateRow[0].data
		});
	} catch (error) {
		console.error('Error fetching scenario state:', error);
		return NextResponse.json(
			{ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ scenario: string }> }
) {
	try {
		const { scenario } = await params;
		
		// We can accept initial state from body if needed, but for now default to empty
		let initialState = { state: {}, tables: {} };
		try {
			const body = await request.json();
			if (body && (body.state || body.tables)) {
				initialState = { 
					state: body.state || {}, 
					tables: body.tables || {} 
				};
			}
		} catch(_e) {
			// Ignore JSON parse error, use default
		}

		await db.insert(scenarioState)
			.values({
				scenarioId: scenario,
				data: initialState
			})
			.onConflictDoNothing();

		return NextResponse.json({
			success: true,
			scenarioId: scenario,
			message: 'Scenario state initialized'
		});
	} catch (error) {
		console.error('Error initializing scenario state:', error);
		return NextResponse.json(
			{ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ scenario: string }> }
) {
	try {
		const { scenario } = await params;

		await db.delete(scenarioState).where(eq(scenarioState.scenarioId, scenario));

		return NextResponse.json({
			success: true,
			message: `State for scenario '${scenario}' has been reset.`
		});
	} catch (error) {
		console.error('Error resetting scenario state:', error);
		return NextResponse.json(
			{ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
}
