import { describe, expect, test } from 'bun:test';
import { matchRoute } from '../../lib/engine/router';

describe('matchRoute internal', () => {
	test('should match simple paths', () => {
		expect(matchRoute('/users', '/users')).toEqual({});
		expect(matchRoute('/users/all', '/users/all')).toEqual({});
	});

	test('should match parameters', () => {
		expect(matchRoute('/users/:id', '/users/123')).toEqual({ id: '123' });
		expect(matchRoute('/org/:orgId/user/:userId', '/org/abc/user/456')).toEqual({ 
			orgId: 'abc', 
			userId: '456' 
		});
	});

	test('should return null for mismatched lengths', () => {
		expect(matchRoute('/users', '/users/123')).toBeNull();
		expect(matchRoute('/users/:id', '/users')).toBeNull();
	});

	test('should return null for mismatched segments', () => {
		expect(matchRoute('/users', '/admin')).toBeNull();
		expect(matchRoute('/users/:id/edit', '/users/123/delete')).toBeNull();
	});
});
