import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scenarios, transitions } from '@/lib/db/schema';

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	try {
		const { slug } = await params;

		if (!slug) {
			return NextResponse.json(
				{ error: 'Scenario ID is required' },
				{ status: 400 },
			);
		}

		const body = await request.json();
		const { name, description } = body;

		if (!name || typeof name !== 'string' || !name.trim()) {
			return NextResponse.json({ error: 'Name is required' }, { status: 400 });
		}

		// Check if scenario exists
		const existingScenario = await db
			.select()
			.from(scenarios)
			.where(eq(scenarios.id, slug));
		if (existingScenario.length === 0) {
			return NextResponse.json(
				{ error: 'Scenario not found' },
				{ status: 404 },
			);
		}

		// Update the scenario - keep the original ID, only update name/description
		const result = await db
			.update(scenarios)
			.set({
				name: name.trim(),
				description: description?.trim() || null,
			})
			.where(eq(scenarios.id, slug))
			.returning();

		return NextResponse.json(result[0]);
	} catch (error) {
		console.error('Error updating scenario:', error);
		return NextResponse.json(
			{ error: 'Internal Server Error', details: String(error) },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	try {
		const { slug } = await params;

		if (!slug) {
			return NextResponse.json(
				{ error: 'Scenario ID is required' },
				{ status: 400 },
			);
		}

		// Check if scenario exists
		const existingScenario = await db
			.select()
			.from(scenarios)
			.where(eq(scenarios.id, slug));
		if (existingScenario.length === 0) {
			return NextResponse.json(
				{ error: 'Scenario not found' },
				{ status: 404 },
			);
		}

		// Delete all transitions for this scenario first
		await db.delete(transitions).where(eq(transitions.scenarioId, slug));

		// Delete the scenario
		await db.delete(scenarios).where(eq(scenarios.id, slug));

		return NextResponse.json({ message: 'Scenario deleted successfully' });
	} catch (error) {
		console.error('Error deleting scenario:', error);
		return NextResponse.json(
			{ error: 'Internal Server Error', details: String(error) },
			{ status: 500 },
		);
	}
}
