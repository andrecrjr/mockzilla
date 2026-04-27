import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../utils/path-resolver';
import type { MatchContext } from './match';
import { matches } from './match';

describe('Engine Interpolation', () => {
	const context = {
		state: {
			users: [{ id: 1, name: 'Alice' }],
			deep: { nested: { val: 'ok' } },
		},
		tables: {
			items: [{ id: 100, name: 'Item1' }],
		},
		input: {
			body: {
				tags: ['a', 'b'],
				complex: { id: 99 },
			},
			query: {},
			params: {},
			headers: {},
		},
	} as unknown as MatchContext;

	test('resolvePath: simple state access', () => {
		expect(resolvePath('state.deep.nested.val', context)).toBe('ok');
	});

	test('resolvePath: state array access', () => {
		expect(resolvePath('state.users[0].name', context)).toBe('Alice');
	});

	test('resolvePath: input nested array access', () => {
		expect(resolvePath('input.body.tags[0]', context)).toBe('a');
		expect(resolvePath('input.body.tags[1]', context)).toBe('b');
	});

	test('resolvePath: relational lookup by property', () => {
		expect(resolvePath('state.users[id=1].name', context)).toBe('Alice');
	});

	test('resolvePath: dynamic lookup from context', () => {
		const dynamicContext = {
			...context,
			input: {
				...context.input,
				params: { userId: '1' }
			}
		};
		// Should resolve input.params.userId to '1', then find user with id=1
		expect(resolvePath('state.users[id=input.params.userId].name', dynamicContext)).toBe('Alice');
	});

	test('resolvePath: dots inside brackets should not break splitting', () => {
		const complexContext = {
			tables: {
				data: [{ 'key.with.dots': 'value' }]
			}
		};
		expect(resolvePath('tables.data[key.with.dots=value]', complexContext)).toBeDefined();
	});

	// Test alias logic handled in matches/resolveOp?
	// match.ts handles the db alias. Let's test matches() to verify alias.
	test('matches: db alias and array index in conditions', () => {
		const result = matches({ 'db.items[0].name': 'Item1' }, context);
		expect(result).toBe(true);
	});

	test('matches: deep nested input check', () => {
		const result = matches({ 'input.body.complex.id': 99 }, context);
		expect(result).toBe(true);
	});

	test('matches: array contains with deep path', () => {
		const result = matches(
			[
				{
					type: 'contains',
					field: 'input.body.tags',
					value: 'a',
				},
			],
			context,
		);
		expect(result).toBe(true);
	});

	test('interpolate: recursive object/array', () => {
		const template = {
			msg: 'Hello {{state.deep.nested.val}}',
			list: ['{{input.body.tags[0]}}', 42],
			nested: {
				id: '{{input.body.complex.id}}'
			}
		};
		const resolved = interpolate(template, context) as Record<string, unknown>;
		expect(resolved.msg).toBe('Hello ok');
		expect((resolved.list as unknown[])[0]).toBe('a');
		expect((resolved.nested as Record<string, unknown>).id).toBe(99);
	});

	test('interpolate: arithmetic', () => {
		expect(interpolate('{{ 1 + 2 }}', context)).toBe(3);
		expect(interpolate('{{ input.body.complex.id + 1 }}', context)).toBe(100);
		expect(interpolate('{{ 100 - 1 }}', context)).toBe(99);
	});

	test('interpolate: literals and syntax', () => {
		expect(interpolate('{{state.deep.nested.val}}', context)).toBe('ok');
		expect(interpolate("{{'direct string'}}", context)).toBe('direct string');
		expect(interpolate('{{123}}', context)).toBe(123);
	});

	test('interpolate: faker calls', () => {
		// Mock faker in context
		const fakerContext = {
			...context,
			faker: {
				number: {
					int: (args: Record<string, unknown>) => (args?.max as number) || 42
				}
			}
		};
		expect(interpolate('{{faker.number.int({"max": 100})}}', fakerContext)).toBe(100);
		expect(interpolate('{{faker.number.int}}', fakerContext)).toBeDefined();
	});

	test('interpolate: resolveSinglePath fallbacks', () => {
		const fakerContext = {
			...context,
			faker: {
				echo: (arg: unknown) => arg
			}
		};
		// JSON valid number
		expect(interpolate('{{faker.echo(123)}}', fakerContext)).toBe(123);
		// 01 is not valid JSON (no leading zeros) but matches our number regex
		expect(interpolate('{{faker.echo(01)}}', fakerContext)).toBe(1);
		// String fallback (not JSON)
		expect(interpolate('{{faker.echo(hello)}}', fakerContext)).toBe('hello');
		expect(interpolate("{{faker.echo('quoted')}}", fakerContext)).toBe('quoted');
	});

	test('interpolate: $. prefix normalization', () => {
		expect(interpolate('{{$.state.deep.nested.val}}', context)).toBe('ok');
	});

	test('interpolate: arithmetic edge cases', () => {
		expect(interpolate('{{ state.count + NaN }}', context)).toBe('{{ state.count + NaN }}');
	});

	test('evaluateCondition: all types', () => {
		const ctx = {
			state: { age: 25, name: 'Alice', tags: ['dev', 'admin'] }
		} as unknown as MatchContext;

		expect(evaluateCondition({ type: 'neq', field: 'state.name', value: 'Bob' }, ctx)).toBe(true);
		expect(evaluateCondition({ type: 'exists', field: 'state.age', value: '' }, ctx)).toBe(true);
		expect(evaluateCondition({ type: 'exists', field: 'state.missing', value: '' }, ctx)).toBe(false);
		expect(evaluateCondition({ type: 'gt', field: 'state.age', value: 20 }, ctx)).toBe(true);
		expect(evaluateCondition({ type: 'lt', field: 'state.age', value: 30 }, ctx)).toBe(true);
		expect(evaluateCondition({ type: 'contains', field: 'state.tags', value: 'dev' }, ctx)).toBe(true);
		expect(evaluateCondition({ type: 'contains', field: 'state.name', value: 'Ali' }, ctx)).toBe(true);
	});
});

import { interpolate } from './interpolation';
import { evaluateCondition } from './match';
