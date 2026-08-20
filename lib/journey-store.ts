import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { journeyActions, journeyFields, journeyLifecycles, journeyRuntimeStates, journeys } from '@/lib/db/schema';
import { executeJourneyAction, type JourneyExecutionResult, type JourneyRequest } from './journey-execution';
import { createInitialJourneyRuntime, type JourneyAction, type JourneyDefinition, validateJourneyAction, validateJourneyDefinition } from './journeys';

function actionSignature(action: JourneyAction): string {
	return JSON.stringify(Object.entries(action.requires).sort(([left], [right]) => left.localeCompare(right)));
}

export async function createJourney(input: unknown) {
	const parsed = validateJourneyDefinition(input);
	if (!parsed.success) return parsed;
	const runtime = createInitialJourneyRuntime(parsed.data);
	const [journey] = await db.insert(journeys).values({ name: parsed.data.name, slug: parsed.data.slug, description: parsed.data.description }).returning();
	await db.insert(journeyLifecycles).values(parsed.data.lifecycles.map((lifecycle, position) => ({ journeyId: journey.id, key: lifecycle.key, name: lifecycle.name, states: lifecycle.states, initialState: lifecycle.initialState, position })));
	if (parsed.data.fields.length > 0) await db.insert(journeyFields).values(parsed.data.fields.map((field, position) => ({ journeyId: journey.id, key: field.key, type: field.type, initialValue: field.initialValue, position })));
	await db.insert(journeyRuntimeStates).values({ journeyId: journey.id, state: runtime.state, fields: runtime.fields });
	return { success: true as const, data: journey };
}

export async function listJourneys() { return db.select().from(journeys).orderBy(asc(journeys.name)); }
export async function getJourneyBySlug(slug: string) { const [journey] = await db.select().from(journeys).where(eq(journeys.slug, slug)).limit(1); return journey ?? null; }
export async function updateJourneyMetadata(id: string, input: Pick<JourneyDefinition, 'name' | 'description'>) { const [journey] = await db.update(journeys).set({ ...input, updatedAt: new Date() }).where(eq(journeys.id, id)).returning(); return journey ?? null; }
export async function updateJourneyDefinition(id: string, input: unknown) {
	const parsed = validateJourneyDefinition(input);
	if (!parsed.success) return parsed;
	const actions = await listJourneyActions(id);
	for (const action of actions) {
		const validation = validateJourneyAction(parsed.data, toJourneyAction(action));
		if (!validation.success) return validation;
	}
	const runtime = createInitialJourneyRuntime(parsed.data);
	const result = await db.transaction(async (tx) => {
		const [journey] = await tx.update(journeys).set({ name: parsed.data.name, description: parsed.data.description, updatedAt: new Date() }).where(eq(journeys.id, id)).returning();
		await tx.delete(journeyLifecycles).where(eq(journeyLifecycles.journeyId, id));
		await tx.delete(journeyFields).where(eq(journeyFields.journeyId, id));
		await tx.insert(journeyLifecycles).values(parsed.data.lifecycles.map((lifecycle, position) => ({ journeyId: id, key: lifecycle.key, name: lifecycle.name, states: lifecycle.states, initialState: lifecycle.initialState, position })));
		if (parsed.data.fields.length) await tx.insert(journeyFields).values(parsed.data.fields.map((field, position) => ({ journeyId: id, key: field.key, type: field.type, initialValue: field.initialValue, position })));
		await tx.insert(journeyRuntimeStates).values({ journeyId: id, state: runtime.state, fields: runtime.fields, updatedAt: new Date() }).onConflictDoUpdate({ target: journeyRuntimeStates.journeyId, set: { state: runtime.state, fields: runtime.fields, updatedAt: new Date() } });
		return journey;
	});
	return { success: true as const, data: result };
}
export async function deleteJourney(id: string) { const [journey] = await db.delete(journeys).where(eq(journeys.id, id)).returning(); return journey ?? null; }

export async function listJourneyActions(journeyId: string) {
	return db.select().from(journeyActions).where(eq(journeyActions.journeyId, journeyId)).orderBy(asc(journeyActions.position));
}

export async function getJourneyRuntime(journeyId: string) {
	const [runtime] = await db.select().from(journeyRuntimeStates).where(eq(journeyRuntimeStates.journeyId, journeyId)).limit(1);
	return runtime ?? null;
}

export async function resetJourney(id: string) {
	const [lifecycleRows, fieldRows] = await Promise.all([
		db.select().from(journeyLifecycles).where(eq(journeyLifecycles.journeyId, id)).orderBy(asc(journeyLifecycles.position)),
		db.select().from(journeyFields).where(eq(journeyFields.journeyId, id)).orderBy(asc(journeyFields.position)),
	]);
	if (lifecycleRows.length === 0) return null;
	const state = Object.fromEntries(lifecycleRows.map((lifecycle) => [lifecycle.key, lifecycle.initialState]));
	const fields = Object.fromEntries(fieldRows.map((field) => [field.key, field.initialValue]));
	const [runtime] = await db.insert(journeyRuntimeStates).values({ journeyId: id, state, fields, updatedAt: new Date() }).onConflictDoUpdate({ target: journeyRuntimeStates.journeyId, set: { state, fields, updatedAt: new Date() } }).returning();
	return runtime;
}

export async function createJourneyAction(journey: JourneyDefinition, journeyId: string, input: unknown) {
	const parsed = validateJourneyAction(journey, input);
	if (!parsed.success) return parsed;
	const existing = await listJourneyActions(journeyId);
	const signature = actionSignature(parsed.data);
	if (existing.some((action) => action.method === parsed.data.method && action.path === parsed.data.path && action.matchSignature === signature)) return { success: false as const, error: 'Duplicate Journey Action method, path, and requires map' };
	const [action] = await db.insert(journeyActions).values({
		journeyId,
		...parsed.data,
		body: parsed.data.body ?? null,
		matchSignature: signature,
		position: existing.length,
	}).returning();
	return { success: true as const, data: action };
}

export async function updateJourneyAction(journey: JourneyDefinition, journeyId: string, actionId: string, input: unknown) {
	const parsed = validateJourneyAction(journey, input);
	if (!parsed.success) return parsed;
	const existing = await listJourneyActions(journeyId);
	const target = existing.find((action) => action.id === actionId);
	if (!target) return null;
	const signature = actionSignature(parsed.data);
	if (existing.some((action) => action.id !== actionId && action.method === parsed.data.method && action.path === parsed.data.path && action.matchSignature === signature)) {
		return { success: false as const, error: 'Duplicate Journey Action method, path, and requires map' };
	}
	const [action] = await db.update(journeyActions).set({
		...parsed.data,
		body: parsed.data.body ?? null,
		matchSignature: signature,
		updatedAt: new Date(),
	}).where(eq(journeyActions.id, actionId)).returning();
	return { success: true as const, data: action };
}

export async function deleteJourneyAction(journeyId: string, actionId: string) {
	const actions = await listJourneyActions(journeyId);
	if (!actions.some((action) => action.id === actionId)) return null;
	const [action] = await db.delete(journeyActions).where(eq(journeyActions.id, actionId)).returning();
	return action ?? null;
}

function toJourneyAction(row: typeof journeyActions.$inferSelect): JourneyAction {
	return {
		name: row.name,
		method: row.method,
		path: row.path,
		requires: row.requires as Record<string, string>,
		transitions: row.transitions as Record<string, string>,
		setFields: row.setFields as Record<string, string>,
		statusCode: row.statusCode,
		headers: row.headers as Record<string, string>,
		body: row.body,
		bodyType: row.bodyType,
	};
}

function toJourneyDefinition(
	journey: typeof journeys.$inferSelect,
	lifecycleRows: Array<typeof journeyLifecycles.$inferSelect>,
	fieldRows: Array<typeof journeyFields.$inferSelect>,
): JourneyDefinition {
	return {
		name: journey.name,
		slug: journey.slug,
		description: journey.description ?? undefined,
		lifecycles: lifecycleRows.map((row) => ({ key: row.key, name: row.name, states: row.states as string[], initialState: row.initialState })),
		fields: fieldRows.map((row) => ({ key: row.key, type: row.type, initialValue: row.initialValue as string | number | boolean | null })),
	};
}

export async function getPersistedJourneyDefinition(slug: string): Promise<{ journey: typeof journeys.$inferSelect; definition: JourneyDefinition } | null> {
	const [journey] = await db.select().from(journeys).where(eq(journeys.slug, slug)).limit(1);
	if (!journey) return null;
	const [lifecycleRows, fieldRows] = await Promise.all([
		db.select().from(journeyLifecycles).where(eq(journeyLifecycles.journeyId, journey.id)).orderBy(asc(journeyLifecycles.position)),
		db.select().from(journeyFields).where(eq(journeyFields.journeyId, journey.id)).orderBy(asc(journeyFields.position)),
	]);
	return { journey, definition: toJourneyDefinition(journey, lifecycleRows, fieldRows) };
}

export async function executePersistedJourney(
	slug: string,
	request: JourneyRequest,
): Promise<JourneyExecutionResult | null> {
	const maxAttempts = 3;
	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		const result = await db.transaction(async (tx) => {
			const [journey] = await tx.select().from(journeys).where(eq(journeys.slug, slug)).limit(1);
			if (!journey) return null;
			const [lifecycleRows, fieldRows, runtimeRows, actionRows] = await Promise.all([
				tx.select().from(journeyLifecycles).where(eq(journeyLifecycles.journeyId, journey.id)).orderBy(asc(journeyLifecycles.position)),
				tx.select().from(journeyFields).where(eq(journeyFields.journeyId, journey.id)).orderBy(asc(journeyFields.position)),
				tx.select().from(journeyRuntimeStates).where(eq(journeyRuntimeStates.journeyId, journey.id)).limit(1),
				tx.select().from(journeyActions).where(eq(journeyActions.journeyId, journey.id)).orderBy(asc(journeyActions.position)),
			]);
			const definition = toJourneyDefinition(journey, lifecycleRows, fieldRows);
			const runtimeRow = runtimeRows[0];
			if (!runtimeRow) throw new Error(`Journey ${slug} has no runtime state`);
			const execution = executeJourneyAction(definition, actionRows.map(toJourneyAction), {
				state: runtimeRow.state as Record<string, string>,
				fields: runtimeRow.fields as Record<string, string | number | boolean | null>,
			}, request);
			if (!execution.success) return execution;

			const [updatedRuntime] = await tx
				.update(journeyRuntimeStates)
				.set({
					state: execution.runtime.state,
					fields: execution.runtime.fields,
					version: sql`${journeyRuntimeStates.version} + 1`,
					updatedAt: new Date(),
				})
				.where(and(eq(journeyRuntimeStates.journeyId, journey.id), eq(journeyRuntimeStates.version, runtimeRow.version)))
				.returning();
			return updatedRuntime ? execution : undefined;
		});
		if (result !== undefined) return result;
	}
	throw new Error(`Journey ${slug} changed too frequently to execute safely; retry the request`);
}
