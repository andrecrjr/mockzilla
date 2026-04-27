import { describe, expect, it } from 'bun:test';
import { matches, type ConditionTrace, evaluateCondition } from '../../lib/engine/match';

describe('match engine', () => {
    const context = {
        state: { role: 'admin' },
        tables: { users: [{ id: 1 }] },
        input: {
            body: { id: 123, tags: ['a', 'b'] },
            query: { q: 'search' },
            params: {},
            headers: {}
        }
    };

    describe('resolveOp', () => {
        it('should resolve db. alias', () => {
            const result = (matches as any)({ 'db.users.length': 1 }, context);
            expect(result).toBe(true);
        });

        it('should fallback to input.body', () => {
            // "id" is not in root, but it is in input.body
            const result = (matches as any)({ 'id': 123 }, context);
            expect(result).toBe(true);
        });
    });

    describe('matches with trace', () => {
        it('should record trace for object-style conditions', () => {
            const trace: ConditionTrace[] = [];
            matches({ 'state.role': 'admin', 'input.body.id': 999 }, context, trace);
            
            expect(trace).toHaveLength(2);
            expect(trace[0].passed).toBe(true);
            expect(trace[1].passed).toBe(false);
            expect(trace[1].actual).toBe(123);
            expect(trace[1].expected).toBe(999);
        });
    });

    describe('evaluateCondition operators', () => {
        it('should handle neq', () => {
            expect(evaluateCondition({ field: 'state.role', type: 'neq', value: 'user' }, context)).toBe(true);
            expect(evaluateCondition({ field: 'state.role', type: 'neq', value: 'admin' }, context)).toBe(false);
        });

        it('should handle exists', () => {
            expect(evaluateCondition({ field: 'input.body.id', type: 'exists', value: '' }, context)).toBe(true);
            expect(evaluateCondition({ field: 'input.body.missing', type: 'exists', value: '' }, context)).toBe(false);
        });

        it('should handle gt/lt', () => {
            expect(evaluateCondition({ field: 'input.body.id', type: 'gt', value: 100 }, context)).toBe(true);
            expect(evaluateCondition({ field: 'input.body.id', type: 'gt', value: 200 }, context)).toBe(false);
            expect(evaluateCondition({ field: 'input.body.id', type: 'lt', value: 200 }, context)).toBe(true);
            expect(evaluateCondition({ field: 'input.body.id', type: 'lt', value: 100 }, context)).toBe(false);
        });

        it('should handle contains (array)', () => {
            expect(evaluateCondition({ field: 'input.body.tags', type: 'contains', value: 'a' }, context)).toBe(true);
            expect(evaluateCondition({ field: 'input.body.tags', type: 'contains', value: 'c' }, context)).toBe(false);
        });

        it('should handle contains (string)', () => {
            expect(evaluateCondition({ field: 'input.query.q', type: 'contains', value: 'ear' }, context)).toBe(true);
            expect(evaluateCondition({ field: 'input.query.q', type: 'contains', value: 'xyz' }, context)).toBe(false);
        });

        it('should handle contains (null/undefined actual)', () => {
            expect(evaluateCondition({ field: 'missing', type: 'contains', value: 'foo' }, context)).toBe(false);
        });

        it('should return false for unknown operator', () => {
            expect(evaluateCondition({ field: 'state.role', type: 'invalid' as any, value: 'admin' }, context)).toBe(false);
        });

        it('should record trace for evaluateCondition', () => {
            const trace: ConditionTrace[] = [];
            evaluateCondition({ field: 'state.role', type: 'eq', value: 'admin' }, context, trace);
            expect(trace).toHaveLength(1);
            expect(trace[0].passed).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should return true for empty conditions', () => {
            expect(matches(null as any, context)).toBe(true);
            expect(matches([], context)).toBe(true);
            expect(matches({}, context)).toBe(true);
        });

        it('should handle array of conditions', () => {
            const conditions = [
                { field: 'state.role', type: 'eq', value: 'admin' },
                { field: 'input.body.id', type: 'eq', value: 123 }
            ];
            expect(matches(conditions, context)).toBe(true);

            const failingConditions = [
                { field: 'state.role', type: 'eq', value: 'admin' },
                { field: 'input.body.id', type: 'eq', value: 999 }
            ];
            expect(matches(failingConditions, context)).toBe(false);
        });
    });
});
