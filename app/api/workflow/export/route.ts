import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scenarios, transitions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { WorkflowExportData, Scenario, Transition } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const scenarioId = searchParams.get('scenarioId');

	let scenariosList: Scenario[] = [];
	let transitionsList: Transition[] = [];

	if (scenarioId) {
		const [scenario] = await db
			.select()
			.from(scenarios)
			.where(eq(scenarios.id, scenarioId));

		if (!scenario) {
			return NextResponse.json(
				{ error: 'Scenario not found' },
				{ status: 404 },
			);
		}

		scenariosList = [
			{
				...scenario,
				createdAt: scenario.createdAt.toISOString(),
				updatedAt: scenario.updatedAt?.toISOString(),
			},
		];

		const transitionsData = await db
			.select()
			.from(transitions)
			.where(eq(transitions.scenarioId, scenarioId));

		transitionsList = transitionsData.map((t) => ({
			...t,
			createdAt: t.createdAt.toISOString(),
			updatedAt: t.updatedAt?.toISOString(),
		}));
	} else {
		const scenariosData = await db.select().from(scenarios);
		scenariosList = scenariosData.map((s) => ({
			...s,
			createdAt: s.createdAt.toISOString(),
			updatedAt: s.updatedAt?.toISOString(),
		}));

		const transitionsData = await db.select().from(transitions);
		transitionsList = transitionsData.map((t) => ({
			...t,
			createdAt: t.createdAt.toISOString(),
			updatedAt: t.updatedAt?.toISOString(),
		}));
	}

	const exportData: WorkflowExportData = {
		version: 1,
		exportedAt: new Date().toISOString(),
		scenarios: scenariosList,
		transitions: transitionsList,
	};

	return new NextResponse(JSON.stringify(exportData, null, 2), {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': `attachment; filename="workflows_export_${
				new Date().toISOString().split('T')[0]
			}.json"`,
		},
	});
}
