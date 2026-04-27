import { describe, expect, test } from 'bun:test';
import { interpolate } from '../../lib/engine/interpolation';
import { applyEffects } from '../../lib/engine/effects';
import { matches, evaluateCondition } from '../../lib/engine/match';
import type { MatchContext } from '../../lib/engine/workflow-types';

describe('Engine Edge Cases', () => {
    const createCtx = (overrides = {}): MatchContext => ({
        state: {},
        tables: {},
        input: { body: {}, query: {}, params: {}, headers: {} },
        ...overrides
    });

    describe('Interpolation Edge Cases', () => {
        test('deeply nested object interpolation', () => {
            const ctx = createCtx({ state: { a: 1, b: 2 } });
            const template = {
                level1: {
                    level2: {
                        level3: '{{state.a + state.b}}'
                    },
                    array: ['{{state.a}}', '{{state.b}}']
                }
            };
            expect(interpolate(template, ctx)).toEqual({
                level1: {
                    level2: { level3: 3 },
                    array: [1, 2]
                }
            });
        });

        test('interpolation with non-existent paths', () => {
            const ctx = createCtx();
            expect(interpolate('{{missing.path}}', ctx)).toBe('{{missing.path}}');
            expect(interpolate('Hello {{missing.path}}', ctx)).toBe('Hello {{missing.path}}');
        });

        test('interpolation with null/undefined values in state', () => {
            const ctx = createCtx({ state: { valNull: null, valUndef: undefined } });
            // Exact match returns the raw value
            expect(interpolate('{{state.valNull}}', ctx)).toBe(null);
            // Embedded match converts to string
            expect(interpolate('val: {{state.valNull}}', ctx)).toBe('val: null');
        });

        test('arithmetic with strings that look like numbers', () => {
            const ctx = createCtx({ state: { a: '10', b: '5' } });
            expect(interpolate('{{state.a + state.b}}', ctx)).toBe(15);
            expect(interpolate('{{state.a - state.b}}', ctx)).toBe(5);
        });

        test('arithmetic with invalid numbers should fail gracefully', () => {
            const ctx = createCtx({ state: { a: 'abc', b: '5' } });
            expect(interpolate('{{state.a + state.b}}', ctx)).toBe('{{state.a + state.b}}');
        });

        test('type preservation for different types', () => {
            const ctx = createCtx({ state: { bool: true, num: 42, obj: { x: 1 } } });
            expect(interpolate('{{state.bool}}', ctx)).toBe(true);
            expect(interpolate('{{state.num}}', ctx)).toBe(42);
            expect(interpolate('{{state.obj}}', ctx)).toEqual({ x: 1 });
        });

        test('mixed embedded templates', () => {
            const ctx = createCtx({ state: { name: 'Alice' }, input: { query: { id: 123 } } });
            expect(interpolate('User {{state.name}} has ID {$.input.query.id}', ctx)).toBe('User Alice has ID 123');
        });
    });

    describe('Effects Edge Cases', () => {
        test('multi-step state updates in one applyEffects call', () => {
            const ctx = createCtx({ state: { count: 1 } });
            // Note: Currently applyEffects uses the context passed at the start.
            // If effects rely on previous effects' results, interpolate must see the updated state.
            // Let's see if our implementation supports this.
            applyEffects([
                { type: 'state.set', key: 'a', value: 10 },
                { type: 'state.set', key: 'b', value: '{{state.a + 10}}' }
            ], ctx);
            
            expect(ctx.state.a).toBe(10);
            expect(ctx.state.b).toBe(20); 
        });

        test('db.update with multiple match criteria', () => {
            const ctx = createCtx({
                tables: {
                    users: [
                        { id: 1, role: 'admin', status: 'active' },
                        { id: 2, role: 'user', status: 'active' },
                        { id: 3, role: 'admin', status: 'inactive' }
                    ]
                }
            });
            applyEffects([
                { 
                    type: 'db.update', 
                    table: 'users', 
                    match: { role: 'admin', status: 'active' }, 
                    set: { status: 'suspended' } 
                }
            ], ctx);
            expect(ctx.tables.users[0].status).toBe('suspended');
            expect(ctx.tables.users[1].status).toBe('active');
            expect(ctx.tables.users[2].status).toBe('inactive');
        });

        test('db.remove with non-matching criteria', () => {
            const ctx = createCtx({ tables: { items: [{ id: 1 }] } });
            applyEffects([{ type: 'db.remove', table: 'items', match: { id: 999 } }], ctx);
            expect(ctx.tables.items).toHaveLength(1);
        });

        test('state.set with nested key paths (unsupported currently, should handle gracefully)', () => {
            const ctx = createCtx();
            // Our implementation uses context.state[key] = ...
            // If key is "user.name", it sets a property named "user.name", not a nested object.
            applyEffects([{ type: 'state.set', key: 'user.name', value: 'Bob' }], ctx);
            expect(ctx.state['user.name']).toBe('Bob');
            expect(ctx.state.user).toBeUndefined();
        });
    });

    describe('Match Edge Cases', () => {
        test('contains operator with various types', () => {
            const ctx = createCtx({ state: { tags: [1, 2, 3], title: 'Hello World', empty: null } });
            expect(evaluateCondition({ type: 'contains', field: 'state.tags', value: 2 }, ctx)).toBe(true);
            expect(evaluateCondition({ type: 'contains', field: 'state.tags', value: 4 }, ctx)).toBe(false);
            expect(evaluateCondition({ type: 'contains', field: 'state.title', value: 'Hello' }, ctx)).toBe(true);
            expect(evaluateCondition({ type: 'contains', field: 'state.title', value: 'Alice' }, ctx)).toBe(false);
            expect(evaluateCondition({ type: 'contains', field: 'state.empty', value: 'anything' }, ctx)).toBe(false);
        });

        test('gt/lt operators with non-numeric strings', () => {
            const ctx = createCtx({ state: { a: 'apple', b: 'banana' } });
            // Number('apple') is NaN, so NaN > NaN is false
            expect(evaluateCondition({ type: 'gt', field: 'state.a', value: 'state.b' }, ctx)).toBe(false);
        });

        test('exists operator on nested missing paths', () => {
            const ctx = createCtx({ state: { user: { id: 1 } } });
            expect(evaluateCondition({ type: 'exists', field: 'state.user.id', value: '' }, ctx)).toBe(true);
            expect(evaluateCondition({ type: 'exists', field: 'state.user.name', value: '' }, ctx)).toBe(false);
            expect(evaluateCondition({ type: 'exists', field: 'state.missing.path', value: '' }, ctx)).toBe(false);
        });

        test('matches with empty object/array', () => {
            const ctx = createCtx();
            expect(matches({}, ctx)).toBe(true);
            expect(matches([], ctx)).toBe(true);
            // @ts-expect-error - Testing invalid input
            expect(matches(null as unknown as Record<string, unknown>, ctx)).toBe(true);
        });

        test('resolveOp fallback to input.body', () => {
            const ctx = createCtx({ input: { body: { id: 123 } } });
            // Should find 'id' in input.body if not found at root
            expect(evaluateCondition({ type: 'eq', field: 'id', value: 123 }, ctx)).toBe(true);
        });

        test('interpolation with function calls and arguments', () => {
            const ctx = createCtx({
                faker: {
                    number: {
                        int: (args: Record<string, unknown>) => (args && args.min === 10 ? 10 : 0)
                    },
                    string: {
                        alpha: (args: Record<string, unknown>) => (args && args.count === 5 ? 'aaaaa' : 'x')
                    },
                    echo: (val: unknown) => val
                }
            });
            expect(interpolate('{{faker.number.int({"min": 10})}}', ctx)).toBe(10);
            expect(interpolate('{{faker.string.alpha({"count": 5})}}', ctx)).toBe('aaaaa');
            expect(interpolate('{{faker.echo("hello")}}', ctx)).toBe('hello');
            expect(interpolate("{{faker.echo('single')}}", ctx)).toBe('single');
        });
        test('db.update with multiple matching rows', () => {
            const ctx = createCtx({
                tables: {
                    data: [
                        { id: 1, val: 'old' },
                        { id: 2, val: 'old' },
                        { id: 3, val: 'other' }
                    ]
                }
            });
            applyEffects([{ 
                type: 'db.update', 
                table: 'data', 
                match: { val: 'old' }, 
                set: { val: 'new' } 
            }], ctx);
            expect(ctx.tables.data[0].val).toBe('new');
            expect(ctx.tables.data[1].val).toBe('new');
            expect(ctx.tables.data[2].val).toBe('other');
        });
        test('arithmetic with non-existent path', () => {
            const ctx = createCtx();
            expect(interpolate('{{ missing.path + 1 }}', ctx)).toBe('{{ missing.path + 1 }}');
        });
    });
});
