export type ConditionOperator = 'eq' | 'neq' | 'exists' | 'gt' | 'lt' | 'contains';

export interface Condition {
	type: ConditionOperator;
	field: string;
	value?: unknown;
}

export interface ConditionTrace {
	field: string;
	type: string;
	expected: unknown;
	actual: unknown;
	passed: boolean;
}

export type EffectType =
	| 'state.set'
	| 'state.patch'
	| 'db.push'
	| 'db.update'
	| 'db.remove'
	| 'db.clear'
	| 'unknown';

export interface StateSetEffect {
	type: 'state.set';
	key?: string;
	value?: unknown;
	raw?: Record<string, unknown>;
}

export interface StatePatchEffect {
	type: 'state.patch';
	key: string;
	value: Record<string, unknown>;
}

export interface DbPushEffect {
	type: 'db.push';
	table: string;
	value: unknown;
}

export interface DbUpdateEffect {
	type: 'db.update';
	table: string;
	match: Record<string, unknown>;
	set: Record<string, unknown>;
}

export interface DbRemoveEffect {
	type: 'db.remove';
	table: string;
	match: Record<string, unknown>;
}

export interface DbClearEffect {
	type: 'db.clear';
	table: string;
}

export interface UnknownEffect {
	type: 'unknown';
	raw?: unknown;
	[key: string]: unknown;
}

export type Effect =
	| StateSetEffect
	| StatePatchEffect
	| DbPushEffect
	| DbUpdateEffect
	| DbRemoveEffect
	| DbClearEffect
	| UnknownEffect;

export interface MatchContext {
	state: Record<string, unknown>;
	tables: Record<string, unknown[]>;
	input: {
		body?: unknown;
		query?: unknown;
		params?: Record<string, string>;
		headers?: Record<string, string>;
	};
	[key: string]: unknown;
}
