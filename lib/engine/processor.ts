import { db } from '../db';
import { scenarioState } from '../db/schema';
import { eq } from 'drizzle-orm';
import { matches } from './match';
import { applyEffects } from './effects';
import type { MatchContext } from './match';



export async function processWorkflowRequest(
	transition: any,
	params: Record<string, string>,
	body: any,
	query: any,
	headers: Record<string, string> = {}
): Promise<{ status: number; headers: any; body: any }> {
	const scenarioId = transition.scenarioId;

	// 1. Load State
	const stateRow = await db.select().from(scenarioState).where(eq(scenarioState.scenarioId, scenarioId));
	
	let scenarioData: MatchContext = {
		state: {},
		db: {},
		input: { body, query, params, headers }
	};

	if (stateRow.length > 0) {
		const savedData = stateRow[0].data as any;
		scenarioData.state = savedData.state || {};
		scenarioData.db = savedData.tables || {}; // map "tables" in storage to "db" in context
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
			data: { state: scenarioData.state, tables: scenarioData.db }
		})
		.onConflictDoUpdate({
			target: scenarioState.scenarioId,
			set: { 
				data: { state: scenarioData.state, tables: scenarioData.db },
				updatedAt: new Date()
			}
		});

	// 5. Return Response
	const responseConfig = transition.response || {};
	
	// Interpolate response body if it's dynamic
	// We might want `applyEffects` to also handle response interpolation or do it here.
	// For now, let's assume valid JSON in response.

	return {
		status: responseConfig.status || 200,
		headers: responseConfig.headers || { 'Content-Type': 'application/json' },
		body: interpolate(responseConfig.body, scenarioData) || {}
	};
}

function interpolate(template: any, context: MatchContext): any {
	if (typeof template === 'string') {
        const trimmed = template.trim();
        // Check for exact variable match to preserve type (Array/Object)
        // e.g. "{{ db.items }}" -> returns Array, not stringified array
        const exactMatch = trimmed.match(/^\{\{\s*([^}]+)\s*\}\}$/);
        if (exactMatch) {
            const val = get(context, exactMatch[1].trim());
            return val !== undefined ? val : template;
        }

		// Replace {{ path.to.val }} with actual value stringified for embedded interpolation
		return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, path) => {
			const val = get(context, path.trim());
			return val !== undefined ? String(val) : '';
		});
	} else if (Array.isArray(template)) {
		return template.map(item => interpolate(item, context));
	} else if (typeof template === 'object' && template !== null) {
		const result: any = {};
		for (const key in template) {
			result[key] = interpolate(template[key], context);
		}
		return result;
	}
	return template;
}

// Simple get helper
function get(obj: any, path: string) {
    const parts = path.split('.');
    let current = obj;
    
    // Special handling for "db.tableName" - default to [] if not found
    if (parts[0] === 'db' && parts.length === 2) {
        if (current.db && current.db[parts[1]] === undefined) {
            return [];
        }
    }

    return parts.reduce((acc: any, part: string) => acc && acc[part], obj);
}
