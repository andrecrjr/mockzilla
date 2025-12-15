import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scenarios, transitions } from '@/lib/db/schema';
import type { WorkflowExportData } from '@/lib/types';
import { eq, inArray } from 'drizzle-orm';

export async function POST(request: NextRequest) {
	try {
		const data: WorkflowExportData = await request.json();

		if (!data.scenarios || !Array.isArray(data.scenarios)) {
			return NextResponse.json(
				{ error: 'Invalid format: scenarios array missing' },
				{ status: 400 },
			);
		}

		if (!data.transitions || !Array.isArray(data.transitions)) {
			return NextResponse.json(
				{ error: 'Invalid format: transitions array missing' },
				{ status: 400 },
			);
		}

		// Import Scenarios
		const importedScenarios = [];
		for (const scenario of data.scenarios) {
			const [existing] = await db
				.select()
				.from(scenarios)
				.where(eq(scenarios.id, scenario.id));

			if (existing) {
				// Update existing
				const [updated] = await db
					.update(scenarios)
					.set({
						name: scenario.name,
						description: scenario.description,
						updatedAt: new Date(),
					})
					.where(eq(scenarios.id, scenario.id))
					.returning();
				importedScenarios.push(updated);
			} else {
				// Insert new
				const [inserted] = await db
					.insert(scenarios)
					.values({
						id: scenario.id,
						name: scenario.name,
						description: scenario.description,
					})
					.returning();
				importedScenarios.push(inserted);
			}
		}

		// Import Transitions
		// Strategy: For each imported scenario, delete existing transitions and re-insert imported ones
		// This avoids duplicates and handles updates cleanly
		const scenarioIds = data.scenarios.map((s) => s.id);
		
		if (scenarioIds.length > 0) {
			// Delete existing transitions for these scenarios
			await db.delete(transitions).where(inArray(transitions.scenarioId, scenarioIds));

			// Insert imported transitions
			if (data.transitions.length > 0) {
				// Sanitize transitions to remove IDs (let DB generate them) or keep them?
				// Transitions usually have auto-increment IDs. It's safer to let DB generate new IDs
				// but we need to ensure references are correct.
				// Since we are clearing transitions for the scenario, we can just insert them as new.
				
				const transitionsToInsert = data.transitions.map((t) => ({
					scenarioId: t.scenarioId,
					name: t.name,
					description: t.description,
					path: t.path,
					method: t.method,
					conditions: t.conditions,
					effects: t.effects,
					response: t.response,
					meta: t.meta,
				}));

				await db.insert(transitions).values(transitionsToInsert);
			}
		}

		return NextResponse.json({
			success: true,
			importedScenarios: importedScenarios.length,
			importedTransitions: data.transitions.length,
		});
	} catch (error: any) {
		console.error('Import error:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to import workflow data' },
			{ status: 500 },
		);
	}
}
