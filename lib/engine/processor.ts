import { db } from '../db';
import { scenarioState } from '../db/schema';
import { eq } from 'drizzle-orm';
import { matches } from './match';
import { applyEffects } from './effects';
import type { MatchContext } from './match';
import type { Transition } from '@/lib/types';
import { resolvePath } from '../utils/path-resolver';

// Processor.ts has its own interpolate with slightly different logic (regex replace).



export async function processWorkflowRequest(
	transition: Transition,
	params: Record<string, string>,
	body: unknown,
	query: unknown,
	headers: Record<string, string> = {}
): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
	const scenarioId = transition.scenarioId;

	// 1. Load State
	const stateRow = await db.select().from(scenarioState).where(eq(scenarioState.scenarioId, scenarioId));
	
	const scenarioData: MatchContext = {
		state: {},
		tables: {},
		input: { body, query, params, headers }
	};

	if (stateRow.length > 0) {
		const savedData = stateRow[0].data as { state?: Record<string, unknown>; tables?: Record<string, unknown[]> };
		scenarioData.state = savedData.state || {};
		scenarioData.tables = savedData.tables || {};
	} else {
		// Initialize if not exists
		await db.insert(scenarioState).values({
			scenarioId,
			data: { state: {}, tables: {} }
		});
	}

	// 2. Check Conditions
	if (transition.conditions) {
		const conditions = transition.conditions;
		if (!matches(conditions, scenarioData)) {
			// Conditions failed, logic to return failure or fallthrough?
			// For this MVP, we 404 or specific error if conditions fail?
			// Or maybe we just return a default "condition failed" match?
			return {
				status: 400,
				headers: {},
				body: { error: 'Transition conditions not met', details: conditions }
			};
		}
	}

	// 3. Apply Effects
	if (transition.effects) {
		applyEffects(transition.effects, scenarioData);
	}

	// 4. Save State
	await db.insert(scenarioState)
		.values({
			scenarioId,
			data: { state: scenarioData.state, tables: scenarioData.tables }
		})
		.onConflictDoUpdate({
			target: scenarioState.scenarioId,
			set: { 
				data: { state: scenarioData.state, tables: scenarioData.tables },
				updatedAt: new Date()
			}
		});

	// 5. Return Response
	const responseConfig = transition.response;
	
	return {
		status: responseConfig.status || 200,
		headers: (responseConfig as any).headers || { 'Content-Type': 'application/json' },
		body: interpolateProcessor(responseConfig.body, scenarioData) || {}
	};
}

function interpolateProcessor(template: unknown, context: MatchContext): unknown {
	if (typeof template === 'string') {
        const trimmed = template.trim();
        // Check for exact variable match to preserve type (Array/Object)
        // e.g. "{{ db.items }}" -> returns Array, not stringified array
        const exactMatch = trimmed.match(/^\{\{\s*([^}]+)\s*\}\}$/);
        if (exactMatch) {
            const val = getHelper(context, exactMatch[1].trim());
            return val !== undefined ? val : template;
        }

		// Replace {{ path.to.val }} with actual value stringified for embedded interpolation
		return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, path) => {
			const val = getHelper(context, (path as string).trim());
			return val !== undefined ? String(val) : '';
		});
	} else if (Array.isArray(template)) {
		return template.map(item => interpolateProcessor(item, context));
	} else if (typeof template === 'object' && template !== null) {
		const result: Record<string, unknown> = {};
		for (const key in template) {
			result[key] = interpolateProcessor((template as Record<string, unknown>)[key], context);
		}
		return result;
	}
	return template;
}

// Simple get helper
function getHelper(context: MatchContext, path: string): unknown {
	let lookupPath = path;

	// Support "db" -> "tables" alias
	// e.g. "db.users[0]" -> "tables.users[0]"
	if (lookupPath.startsWith('db.') || lookupPath === 'db') {
		lookupPath = lookupPath.replace(/^db/, 'tables');
	}

	return resolvePath(lookupPath, context);
}
