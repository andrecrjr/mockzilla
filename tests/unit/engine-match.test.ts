import { describe, expect, test } from 'bun:test';
import { matches, evaluateCondition } from '../../lib/engine/match';
import type { MatchContext, ConditionTrace } from '../../lib/engine/match';

describe('Engine Match', () => {
	const context = {
		state: { age: 25 },
		tables: { users: [{ id: 1 }] },
		input: { body: { name: 'Alice' } }
	} as unknown as MatchContext;

	test('matches: should return true for null/undefined conditions', () => {
		expect(matches(null as unknown as Record<string, unknown>, context)).toBe(true);
	});

	test('matches: should return true for empty array', () => {
		expect(matches([], context)).toBe(true);
	});

	test('matches: should support tracing in object format', () => {
		const trace: ConditionTrace[] = [];
		const result = matches({ 'state.age': 25 } as Record<string, unknown>, context, trace);
		expect(result).toBe(true);
		expect(trace).toHaveLength(1);
		expect(trace[0].field).toBe('state.age');
		expect(trace[0].passed).toBe(true);
	});

	test('matches: should set allPassed to false on failure (object format)', () => {
		expect(matches({ 'state.age': 30 } as Record<string, unknown>, context)).toBe(false);
	});

	test('evaluateCondition: should support tracing', () => {
		const trace: ConditionTrace[] = [];
		const condition = { type: 'eq' as const, field: 'input.body.name', value: 'Alice' };
		evaluateCondition(condition, context, trace);
		expect(trace).toHaveLength(1);
		expect(trace[0].actual).toBe('Alice');
	});

	test('evaluateCondition: contains with null/undefined', () => {
		const condition = { type: 'contains' as const, field: 'state.missing', value: 'foo' };
		expect(evaluateCondition(condition, context)).toBe(false);
	});
	
	test('evaluateCondition: default case', () => {
		const condition = { type: 'invalid' as unknown as 'eq', field: 'state.age', value: 25 };
		expect(evaluateCondition(condition, context)).toBe(false);
	});
});
