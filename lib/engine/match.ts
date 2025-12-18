
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

export type Effect =
  | {
      /** Set state variables explicitly. */
      type: 'state.set';
      /** Key to set in scenario state. */
      key: string;
      /** Value to set (interplation supported). */
      value: unknown
    }
  | {
      /** Append a row to a mini-db table. */
      type: 'db.push';
      /** Table name. */
      table: string;
      /** Row object to append. */
      value: unknown
    }
  | {
      /** Update existing rows in a mini-db table. */
      type: 'db.update';
      /** Table name. */
      table: string;
      /** Fields to match against (e.g. { id: "{{input.body.id}}" }). */
      match: Record<string, unknown>;
      /** Fields to update. */
      set: Record<string, unknown>
    }
  | {
      /** Remove rows from a mini-db table. */
      type: 'db.remove';
      /** Table name. */
      table: string;
      /** Fields to match for removal. */
      match: Record<string, unknown>
    };

export type MatchContext = {
	input: {
		body: unknown;
		query: unknown;
		params: Record<string, string>;
		headers: Record<string, string>;
	};
	state: Record<string, unknown>;
	db: Record<string, unknown[]>; // Mini-DB tables
};

/**
 * Resolves a field path (e.g. "input.body.id" or "state.authorized") to a value.
 */
/**
 * Resolves a field path (e.g. "input.body.id" or "state.authorized") to a value.
 * Falls back to input.body for convenience if not found in root.
 */
function resolveOp(path: string, context: MatchContext): unknown {
    const direct = getPath(context, path);
    if (direct !== undefined) return direct;

    // Fallback: try looking in input.body
    if (context.input?.body) {
        return getPath(context.input.body, path);
    }
    
    return undefined;
}

function getPath(obj: unknown, path: string): unknown {
	const parts = path.split('.');
	let current = obj as any;
	for (const part of parts) {
		if (current === undefined || current === null) return undefined;
		current = current[part];
	}
	return current;
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
