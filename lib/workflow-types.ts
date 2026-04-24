export type ConditionOperator = 'eq' | 'neq' | 'exists' | 'gt' | 'lt' | 'contains';

export interface Condition {
	type: ConditionOperator;
	field: string;
	value?: unknown;
}

export type EffectType =
	| 'state.set'
	| 'state.patch'
	| 'db.push'
	| 'db.update'
	| 'db.remove'
	| 'db.clear';

export interface Effect {
	type: EffectType;
	table?: string;
	key?: string;
	value?: unknown;
	raw?: Record<string, unknown>;
	id?: string;
}

export interface MatchContext {
	state: Record<string, unknown>;
	tables: Record<string, unknown[]>;
	input: {
		body?: unknown;
		query?: unknown;
		params?: Record<string, string>;
		headers?: Record<string, string>;
	};
}
