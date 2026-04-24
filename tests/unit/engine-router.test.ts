import { describe, expect, test, mock } from 'bun:test';

// state for the mock
let exactMatches: unknown[] = [];
let patternMatches: unknown[] = [];
let callCount = 0;

mock.module('../../lib/db', () => ({
	db: {
		select: () => ({
			from: () => ({
				where: (filter: unknown) => ({
					then: (resolve: (val: unknown) => void) => {
						callCount++;
						if (callCount % 2 !== 0) {
							return resolve(exactMatches);
						} else {
							return resolve(patternMatches);
						}
					}
				})
			})
		})
	}
}));

import { findTransition } from '../../lib/engine/router';

describe('Engine Router', () => {
	test('should match exact route', async () => {
		callCount = 0;
		exactMatches = [{ id: 1, path: '/users', method: 'GET', scenarioId: 's1' }];
		patternMatches = [];
		const result = await findTransition('/users', 'GET', 's1');
		expect(result).toHaveLength(1);
		expect(result![0].transition.id).toBe(1);
	});

	test('should match parameterized route via fallback', async () => {
		callCount = 0;
		exactMatches = []; // No exact match
		patternMatches = [
			{ id: 1, path: '/users', method: 'GET', scenarioId: 's1' },
			{ id: 2, path: '/users/:id', method: 'GET', scenarioId: 's1' }
		];
		
		const result = await findTransition('/users/123', 'GET', 's1');
		expect(result).toHaveLength(1);
		expect(result![0].transition.path).toBe('/users/:id');
		expect(result![0].params).toEqual({ id: '123' });
	});

	test('should return null for no match', async () => {
		callCount = 0;
		exactMatches = [];
		patternMatches = [
			{ id: 1, path: '/users', method: 'GET', scenarioId: 's1' }
		];
		const result = await findTransition('/unknown/path', 'GET', 's1');
		expect(result).toBeNull();
	});
});
