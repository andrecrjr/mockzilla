import { db } from '@/lib/db';
import { scenarios, transitions, scenarioState } from '@/lib/db/schema';
import { eq, sql, and, inArray } from 'drizzle-orm';
import { generateSlug } from '../helpers';
import type { FindWorkflowArgs, ManageWorkflowArgs, TestWorkflowArgs, ImportExportArgs } from '../schemas/workflows';
import type { Condition, Effect, Transition, Scenario } from '@/lib/types';
import { matches } from '@/lib/engine/match';

interface WorkflowExport {
	version: number;
	exportedAt: string;
	scenarios: Scenario[];
	transitions: Transition[];
	description: string;
}

// Helpers
function dbTransitionToTransition(dbTransition: typeof transitions.$inferSelect): Transition {
	return {
		id: dbTransition.id,
		scenarioId: dbTransition.scenarioId,
		name: dbTransition.name,
		description: dbTransition.description ?? undefined,
		path: dbTransition.path,
		method: dbTransition.method,
		conditions: (dbTransition.conditions ?? {}) as Condition[] | Record<string, unknown>,
		effects: (dbTransition.effects ?? []) as Effect[],
		response: dbTransition.response as { status: number; body: unknown },
		meta: (dbTransition.meta ?? {}) as Record<string, unknown>,
		createdAt: dbTransition.createdAt.toISOString(),
		updatedAt: dbTransition.updatedAt?.toISOString(),
	};
}

function normalizeHeaders(headers: Record<string, unknown>): Record<string, string> {
	const normalized: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers)) {
		normalized[key] = String(value ?? '');
	}
	return normalized;
}

// Handlers
export async function handleFindWorkflow(args: FindWorkflowArgs) {
	if (args.action === 'list_scenarios') {
		const page = args.page ?? 1;
		const limit = args.limit ?? 10;
		const offset = (page - 1) * limit;

		const [totalResult] = await db
			.select({ count: sql<number>`count(*)` })
			.from(scenarios);
		const total = Number(totalResult.count);
		const totalPages = Math.ceil(total / limit);

		const rows = await db
			.select()
			.from(scenarios)
			.orderBy(scenarios.createdAt)
			.limit(limit)
			.offset(offset);

		return { data: rows, meta: { total, page, limit, totalPages } };
	}

	if (args.action === 'list_transitions') {
		const rows = await db
			.select()
			.from(transitions)
			.where(eq(transitions.scenarioId, args.scenarioId))
			.orderBy(transitions.createdAt);
		return rows;
	}

	if (args.action === 'inspect_state') {
		const [row] = await db
			.select()
			.from(scenarioState)
			.where(eq(scenarioState.scenarioId, args.scenarioId));
		return row ? row.data : { tables: {}, state: {} };
	}
}

export async function handleManageWorkflow(args: ManageWorkflowArgs) {
	// Scenarios
	if (args.action === 'create_scenario') {
		const id = generateSlug(args.name);
		const [row] = await db
			.insert(scenarios)
			.values({
				id,
				name: args.name,
				description: args.description ?? null,
			})
			.returning();
		return row;
	}

	if (args.action === 'delete_scenario') {
		await db.delete(scenarios).where(eq(scenarios.id, args.id));
		return { success: true, id: args.id };
	}

	// Transitions
	if (args.action === 'create_transition') {
		// Ensure scenario exists
		const [existingScenario] = await db
			.select()
			.from(scenarios)
			.where(eq(scenarios.id, args.scenarioId));

		if (!existingScenario) {
			await db
				.insert(scenarios)
				.values({
					id: args.scenarioId,
					name: args.scenarioId,
					description: `Auto-created scenario for ${args.scenarioId}`,
				})
				.onConflictDoNothing();
		}

		const [row] = await db
			.insert(transitions)
			.values({
				scenarioId: args.scenarioId,
				name: args.name,
				description: args.description ?? null,
				path: args.path,
				method: args.method,
				conditions: args.conditions ?? {},
				effects: args.effects ?? [],
				response: args.response,
				meta: args.meta ?? {},
			})
			.returning();
		return row;
	}

	if (args.action === 'update_transition') {
		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (args.name !== undefined) updateData.name = args.name;
		if (args.description !== undefined) updateData.description = args.description;
		if (args.path !== undefined) updateData.path = args.path;
		if (args.method !== undefined) updateData.method = args.method;
		if (args.conditions !== undefined) updateData.conditions = args.conditions;
		if (args.effects !== undefined) updateData.effects = args.effects;
		if (args.response !== undefined) updateData.response = args.response;
		if (args.meta !== undefined) updateData.meta = args.meta;

		const [row] = await db
			.update(transitions)
			.set(updateData)
			.where(eq(transitions.id, args.id))
			.returning();

		if (!row) throw new Error('Transition not found');
		return row;
	}

	if (args.action === 'delete_transition') {
		await db.delete(transitions).where(eq(transitions.id, args.id));
		return { success: true, id: args.id };
	}

	if (args.action === 'reset_state') {
		await db
			.delete(scenarioState)
			.where(eq(scenarioState.scenarioId, args.scenarioId));
		return { success: true, scenarioId: args.scenarioId };
	}
}

export async function handleTestWorkflow(args: TestWorkflowArgs) {
	const { processWorkflowRequest } = await import('@/lib/engine/processor');
	const fullPath = args.path.startsWith('/') ? args.path : `/${args.path}`;
	const body = args.body || {};
	const query = args.query || {};
	const headers = args.headers || {};

	const [stateRow] = await db
		.select()
		.from(scenarioState)
		.where(eq(scenarioState.scenarioId, args.scenarioId));

	const baseState = stateRow
		? (stateRow.data as { state: Record<string, unknown>; tables: Record<string, unknown[]> })
		: { state: {}, tables: {} };

	const exactCandidates = await db
		.select()
		.from(transitions)
		.where(
			and(
				eq(transitions.scenarioId, args.scenarioId),
				eq(transitions.path, fullPath),
				eq(transitions.method, args.method),
			),
		)
		.orderBy(transitions.createdAt);

	for (const t of exactCandidates) {
		const normalizedHeaders = normalizeHeaders(headers);
		const ctx = {
			state: baseState.state || {},
			tables: baseState.tables || {},
			input: { body, query, params: {}, headers: normalizedHeaders },
		};
		if (matches((t.conditions as Record<string, unknown> | Condition[]) || {}, ctx)) {
			const transition = dbTransitionToTransition(t);
			const result = await processWorkflowRequest(transition, {}, body, query, normalizedHeaders);
			return {
				success: true,
				transitionId: t.id,
				transitionName: t.name,
				response: result,
			};
		}
	}

	const allCandidates = await db
		.select()
		.from(transitions)
		.where(
			and(
				eq(transitions.scenarioId, args.scenarioId),
				eq(transitions.method, args.method),
			),
		)
		.orderBy(transitions.createdAt);

	const matchRoute = (pattern: string, actual: string): Record<string, string> | null => {
		const patternParts = pattern.split('/');
		const actualParts = actual.split('/');
		if (patternParts.length !== actualParts.length) return null;
		const params: Record<string, string> = {};
		for (let i = 0; i < patternParts.length; i++) {
			if (patternParts[i].startsWith(':')) {
				params[patternParts[i].slice(1)] = actualParts[i];
			} else if (patternParts[i] !== actualParts[i]) {
				return null;
			}
		}
		return params;
	};

	for (const t of allCandidates) {
		const params = matchRoute(t.path, fullPath);
		const normalizedHeaders = normalizeHeaders(headers);
		if (!params) continue;
		const ctx = {
			state: baseState.state || {},
			tables: baseState.tables || {},
			input: { body, query, params, headers: normalizedHeaders },
		};
		if (matches((t.conditions as Record<string, unknown> | Condition[]) || {}, ctx)) {
			const transition = dbTransitionToTransition(t);
			const result = await processWorkflowRequest(
				transition,
				params,
				body,
				query,
				normalizedHeaders,
			);
			return {
				success: true,
				transitionId: t.id,
				transitionName: t.name,
				response: result,
			};
		}
	}

	return {
		success: false,
		message: 'No matching transition found',
	};
}

export async function handleImportExport(args: ImportExportArgs) {
	if (args.action === 'export') {
		const { scenarioId } = args;
		let scenariosList: Scenario[] = [];
		let transitionsList: Transition[] = [];

		if (scenarioId) {
			const [scenario] = await db
				.select()
				.from(scenarios)
				.where(eq(scenarios.id, scenarioId));

			if (!scenario) throw new Error('Scenario not found');

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

			transitionsList = transitionsData.map(dbTransitionToTransition);
		} else {
			const scenariosData = await db.select().from(scenarios);
			scenariosList = scenariosData.map((s) => ({
				...s,
				createdAt: s.createdAt.toISOString(),
				updatedAt: s.updatedAt?.toISOString(),
			}));

			const transitionsData = await db.select().from(transitions);
			transitionsList = transitionsData.map(dbTransitionToTransition);
		}

		return {
			version: 1,
			exportedAt: new Date().toISOString(),
			scenarios: scenariosList,
			transitions: transitionsList,
			description:
				'This export contains full workflow data including scenarios and transitions, suitable for LLM analysis and re-import.',
		};
	}

	if (args.action === 'import') {
		const data = args.data as unknown as WorkflowExport;
		if (!data.scenarios || !Array.isArray(data.scenarios)) {
			throw new Error(
				'Invalid format: scenarios array missing. Please ensure you are importing a valid Mockzilla workflow export.',
			);
		}

		const importedScenarios = [];
		for (const scenario of data.scenarios) {
			const [existing] = await db
				.select()
				.from(scenarios)
				.where(eq(scenarios.id, scenario.id));

			if (existing) {
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

		const scenarioIds = data.scenarios.map((s) => s.id);
		if (scenarioIds.length > 0) {
			await db
				.delete(transitions)
				.where(inArray(transitions.scenarioId, scenarioIds));

			if (
				data.transitions &&
				Array.isArray(data.transitions) &&
				data.transitions.length > 0
			) {
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

		return {
			success: true,
			importedScenarios: importedScenarios.length,
			importedTransitions: data.transitions?.length || 0,
			message:
				'Workflow imported successfully. The LLM can now use these scenarios for testing and simulation.',
		};
	}
}
