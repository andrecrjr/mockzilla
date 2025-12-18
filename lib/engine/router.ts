
import { db } from '../db';
import { transitions } from '../db/schema';
import { and, eq, or } from 'drizzle-orm';

/**
 * find transition by path and method.
 * In production this might cache transitions or perform complex regex matching.
 * For now we use the database 'path' column.
 * We need to support ":param" style matching if we want true "custom URLs" but 
 * for "Workflow Mode" usually the path IS the key.
 */

// Simple route matcher: /cart/items/:id -> /cart/items/123
function matchRoute(pattern: string, actual: string): Record<string, string> | null {
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

export async function findTransition(path: string, method: string) {
	// First try exact match
	const exactMatches = await db.select().from(transitions).where(
		and(
			eq(transitions.path, path),
			eq(transitions.method, method)
		)
	);

	if (exactMatches.length > 0) {
		return { transition: exactMatches[0], params: {} };
	}

	// If no exact match, fetch ALL transitions for this method (inefficient but works for MVP)
	// Optimization: Filter by prefix or smart segments later.
	const allTransitions = await db.select().from(transitions).where(
		eq(transitions.method, method)
	);

	for (const t of allTransitions) {
		const params = matchRoute(t.path, path);
		if (params) {
			return { transition: t, params };
		}
	}

	return null;
}
