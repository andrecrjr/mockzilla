import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { transitions } from '../db/schema';

/**
 * find transition by path and method.
 * In production this might cache transitions or perform complex regex matching.
 * For now we use the database 'path' column.
 * We need to support ":param" style matching if we want true "custom URLs" but
 * for "Workflow Mode" usually the path IS the key.
 */

// Simple route matcher: /cart/items/:id -> /cart/items/123
export function matchRoute(
	pattern: string,
	actual: string,
): Record<string, string> | null {
	const patternParts = pattern.split('/');
	const actualParts = actual.split('/');
	if (patternParts.length !== actualParts.length) return null;

	const params: Record<string, string> = {};
	for (let i = 0; i < patternParts.length; i++) {
		if (patternParts[i].startsWith(':')) {
			const paramName = patternParts[i].slice(1);
			params[paramName] = actualParts[i];
		} else if (patternParts[i] !== actualParts[i]) {
			return null;
		}
	}
	return params;
}

export async function findTransition(
	path: string,
	method: string,
	scenarioId?: string,
) {
	const baseFilter = and(
		eq(transitions.path, path),
		eq(transitions.method, method),
		scenarioId ? eq(transitions.scenarioId, scenarioId) : undefined,
	);

	// First try exact matches
	const exactMatches = await db.select().from(transitions).where(baseFilter);

	if (exactMatches.length > 0) {
		return exactMatches.map((t) => ({ transition: t, params: {} }));
	}

	// Fallback to pattern matching
	const patternFilter = and(
		eq(transitions.method, method),
		scenarioId ? eq(transitions.scenarioId, scenarioId) : undefined,
	);

	const allTransitions = await db
		.select()
		.from(transitions)
		.where(patternFilter);

	const matches: {
		transition: typeof transitions.$inferSelect;
		params: Record<string, string>;
	}[] = [];
	for (const t of allTransitions) {
		const params = matchRoute(t.path, path);
		if (params) {
			matches.push({ transition: t, params });
		}
	}

	return matches.length > 0 ? matches : null;
}
