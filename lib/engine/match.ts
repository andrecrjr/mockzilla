import type { Condition, ConditionTrace, Effect, MatchContext } from '../workflow-types';
import { resolvePath } from '../utils/path-resolver';
import { interpolate } from './interpolation';

/**
 * Resolves a field path (e.g. "input.body.id" or "state.authorized") to a value.
 * Falls back to input.body for convenience if not found in root.
 */
function resolveOp(path: string, context: MatchContext): unknown {
	// Handle "db" -> "tables" alliance for backward compatibility
	let adjustedPath = path;
	if (path.startsWith('db.')) {
		adjustedPath = `tables.${path.substring(3)}`;
	}

	const direct = resolvePath(adjustedPath, context);
	if (direct !== undefined) return direct;

	// Fallback: try looking in input.body
	if (context.input?.body) {
		return resolvePath(path, context.input.body);
	}

	return undefined;
}

export function matches(
	conditions: Record<string, unknown> | Condition[],
	context: MatchContext,
	trace?: ConditionTrace[],
): boolean {
	if (!conditions) return true;

	if (Array.isArray(conditions)) {
		if (conditions.length === 0) return true;
		let allPassed = true;
		for (const condition of conditions) {
			const passed = evaluateCondition(condition, context, trace);
			if (!passed) {
				allPassed = false;
			}
		}
		return allPassed;
	}

	if (Object.keys(conditions).length === 0) return true;

	let allPassed = true;
	for (const [key, expected] of Object.entries(conditions)) {
		const actual = resolveOp(key, context);
		const passed = actual == expected;
		
		if (trace) {
			trace.push({
				field: key,
				type: 'eq',
				expected,
				actual,
				passed,
			});
		}

		if (!passed) {
			allPassed = false;
		}
	}

	return allPassed;
}

/**
 * evaluateCondition allows the more verbose syntax if we store it as a list of rules
 * or strict operator objects.
 */
export function evaluateCondition(
	condition: Condition,
	context: MatchContext,
	trace?: ConditionTrace[],
): boolean {
	const actual = resolveOp(condition.field, context);
	const expected = interpolate(condition.value, context);

	let passed = false;
	switch (condition.type) {
		case 'eq':
			passed = actual == expected;
			break;
		case 'neq':
			passed = actual != expected;
			break;
		case 'exists':
			passed = actual !== undefined && actual !== null;
			break;
		case 'gt':
			passed = Number(actual) > Number(expected);
			break;
		case 'lt':
			passed = Number(actual) < Number(expected);
			break;
		case 'contains':
			if (actual === undefined || actual === null) {
				passed = false;
			} else {
				passed = (Array.isArray(actual) && actual.includes(expected)) ||
					String(actual).includes(String(expected));
			}
			break;
		default:
			passed = false;
	}

	if (trace) {
		trace.push({
			field: condition.field,
			type: condition.type,
			expected,
			actual,
			passed,
		});
	}

	return passed;
}

export type { Condition, Effect, MatchContext, ConditionTrace };
