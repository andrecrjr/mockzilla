import { describe, expect, test } from 'bun:test';
import { applyEffects } from '../../lib/engine/effects';
import type { MatchContext } from '../../lib/engine/match';

describe('Engine Effects', () => {
	test('state.set: should set simple values', () => {
		const context = {
			state: {},
			tables: {},
			input: {}
		} as MatchContext;

		applyEffects([
			{ type: 'state.set', key: 'count', value: 10 },
			{ type: 'state.set', key: 'name', value: 'Alice' }
		], context);

		expect(context.state.count).toBe(10);
		expect(context.state.name).toBe('Alice');
	});

	test('state.set: should support raw object', () => {
		const context = {
			state: {},
			tables: {},
			input: {}
		} as MatchContext;

		applyEffects([
			{ type: 'state.set', raw: { a: 1, b: '{{state.a + 1}}' } }
		], context);

		expect(context.state.a).toBe(1);
		// Note: interpolation happens sequentially or we need to be careful.
		// In applyEffects, it iterates raw entries.
	});

	test('db.push: should add items to table', () => {
		const context = {
			state: {},
			tables: {
				users: []
			},
			input: {}
		} as MatchContext;

		applyEffects([
			{ type: 'db.push', table: 'users', value: { id: 1, name: 'Alice' } }
		], context);

		expect(context.tables.users).toHaveLength(1);
		expect(context.tables.users[0]).toEqual({ id: 1, name: 'Alice' });
	});

	test('db.update: should update matched items', () => {
		const context = {
			state: {},
			tables: {
				users: [
					{ id: 1, name: 'Alice', status: 'pending' },
					{ id: 2, name: 'Bob', status: 'pending' }
				]
			},
			input: {}
		} as MatchContext;

		applyEffects([
			{ 
				type: 'db.update', 
				table: 'users', 
				match: { id: 1 }, 
				set: { status: 'active' } 
			}
		], context);

		expect(context.tables.users[0].status).toBe('active');
		expect(context.tables.users[1].status).toBe('pending');
	});

	test('db.remove: should remove matched items', () => {
		const context = {
			state: {},
			tables: {
				users: [
					{ id: 1, name: 'Alice' },
					{ id: 2, name: 'Bob' }
				]
			},
			input: {}
		} as MatchContext;

		applyEffects([
			{ type: 'db.remove', table: 'users', match: { id: 1 } }
		], context);

		expect(context.tables.users).toHaveLength(1);
		expect(context.tables.users[0].id).toBe(2);
	});

	test('Legacy format: should support $ prefixed keys', () => {
		const context = {
			state: {},
			tables: {},
			input: { body: { val: 42 } }
		} as MatchContext;

		const legacyEffects = {
			'$state.set': { score: '{{input.body.val}}' },
			'$db.users.push': { id: 1 }
		};

		applyEffects(legacyEffects, context);

		expect(context.state.score).toBe(42);
		expect(context.tables.users).toHaveLength(1);
	});

	test('Legacy format: should support db.update and db.remove', () => {
		const context = {
			state: {},
			tables: {
				items: [{ id: 1, name: 'test' }]
			},
			input: {}
		} as MatchContext;

		applyEffects({
			'$db.items.update': { match: { id: 1 }, set: { name: 'updated' } }
		}, context);
		expect(context.tables.items[0].name).toBe('updated');

		applyEffects({
			'$db.items.remove': { id: 1 }
		}, context);
		expect(context.tables.items).toHaveLength(0);
	});

	test('db.push: should initialize table if missing', () => {
		const context = { state: {}, tables: {}, input: {} } as MatchContext;
		applyEffects([{ type: 'db.push', table: 'new_table', value: 1 }], context);
		expect(context.tables.new_table).toEqual([1]);
	});

	test('db.update: should handle missing table', () => {
		const context = { state: {}, tables: {}, input: {} } as MatchContext;
		applyEffects([{ type: 'db.update', table: 'missing', match: {}, set: {} }], context);
		expect(context.tables.missing).toEqual([]);
	});

	test('db.remove: should handle missing table', () => {
		const context = { state: {}, tables: {}, input: {} } as MatchContext;
		applyEffects([{ type: 'db.remove', table: 'missing', match: {} }], context);
		expect(context.tables.missing).toEqual([]);
	});

	test('Legacy format: unknown key', () => {
		const context = { state: {}, tables: {}, input: {} } as MatchContext;
		// This should hit the 'unknown' case
		applyEffects({ 'something.else': 'value' }, context);
		// It doesn't do anything but should be hit
	});
});
