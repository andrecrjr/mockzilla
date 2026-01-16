import { resolvePath } from '../utils/path-resolver';

export type Condition = {
	/**
	 * Operator type:
	 * - eq: Equals (strict or loose)
	 * - neq: Not Equals
	 * - exists: Field is not undefined/null
	 * - gt: Greater than (numeric)
	 * - lt: Less than (numeric)
	 * - contains: Array includes value OR String includes substring
	 */
	type: 'eq' | 'neq' | 'exists' | 'gt' | 'lt' | 'contains';
	/**
	 * Path to field (e.g., "input.body.id", "state.status", "db.users").
	 */
	field: string;
	/**
	 * Value to compare against.
	 */
	value?: unknown;
};

export type StateSetEffect = {
	type: 'state.set';
	/** Key to set in scenario state. */
	key?: string;
	/** Value to set (interpolation supported). */
	value?: unknown;
	/** Map of multiple keys/values to set. */
	raw?: Record<string, unknown>;
};

export type DbPushEffect = {
	type: 'db.push';
	table: string;
	value: unknown;
};

export type DbUpdateEffect = {
	type: 'db.update';
	table: string;
	match: Record<string, unknown>;
	set: Record<string, unknown>;
};

export type DbRemoveEffect = {
	type: 'db.remove';
	table: string;
	match: Record<string, unknown>;
};

export type UnknownEffect = {
	type: 'unknown';
	raw: unknown;
};

export type Effect =
	| StateSetEffect
	| DbPushEffect
	| DbUpdateEffect
	| DbRemoveEffect
	| UnknownEffect;


export type MatchContext = {
	input: {
		body: unknown;
		query: unknown;
		params: Record<string, string>;
		headers: Record<string, string>;
	};
	state: Record<string, unknown>;
	tables: Record<string, unknown[]>; // Mini-DB tables
};

/**
 * Resolves a field path (e.g. \"input.body.id\" or \"state.authorized\") to a value.
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

export function matches(conditions: Record<string, unknown> | Condition[], context: MatchContext): boolean {
  if (!conditions) return true;
  
  if (Array.isArray(conditions)) {
      if (conditions.length === 0) return true;
      for (const condition of conditions) {
          if (!evaluateCondition(condition, context)) {
              return false;
          }
      }
      return true;
  }

  if (Object.keys(conditions).length === 0) return true;

  for (const [key, expected] of Object.entries(conditions)) {
    const actual = resolveOp(key, context);
    
    // If expected is an object with validation logic
    if (typeof expected === 'object' && expected !== null && !Array.isArray(expected)) {
       // Future expansion
    }

    if (actual != expected) { // Loose equality for "1" == 1 convenience
      return false;
    }
  }

  return true;
}

/**
 * matchesConditionSet allows the more verbose syntax if we store it as a list of rules
 * or strict operator objects.
 */
export function evaluateCondition(condition: Condition, context: MatchContext): boolean {
	const actual = resolveOp(condition.field, context);
	
	switch (condition.type) {
		case 'eq': return actual == condition.value;
		case 'neq': return actual != condition.value;
		case 'exists': return actual !== undefined && actual !== null;
		case 'gt': return Number(actual) > Number(condition.value);
		case 'lt': return Number(actual) < Number(condition.value);
		case 'contains': 
			return (Array.isArray(actual) && actual.includes(condition.value)) || 
				   String(actual).includes(String(condition.value));
		default: return false;
	}
}
