import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { journeyActions, journeyFields, journeyLifecycles, journeyRuntimeStates, journeys } from '@/lib/db/schema';
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
export async function deleteJourney(id: string) { const [journey] = await db.delete(journeys).where(eq(journeys.id, id)).returning(); return journey ?? null; }

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
	const existing = await db.select().from(journeyActions).where(eq(journeyActions.journeyId, journeyId)).orderBy(asc(journeyActions.position));
	const signature = actionSignature(parsed.data);
	if (existing.some((action) => action.method === parsed.data.method && action.path === parsed.data.path && action.matchSignature === signature)) return { success: false as const, error: 'Duplicate Journey Action method, path, and requires map' };
	const [action] = await db.insert(journeyActions).values({ journeyId, ...parsed.data, matchSignature: signature, position: existing.length }).returning();
	return { success: true as const, data: action };
}
