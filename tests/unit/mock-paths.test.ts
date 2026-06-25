import { describe, expect, it } from 'bun:test';
import {
	generateSlug,
	joinMockPaths,
	normalizeAbsolutePath,
	normalizeRelativeMockPath,
} from '../../lib/utils/mock-paths';

describe('mock path helpers', () => {
	it('normalizes absolute paths', () => {
		expect(normalizeAbsolutePath('v1/users/')).toBe('/v1/users');
		expect(normalizeAbsolutePath('/v1//users//')).toBe('/v1/users');
		expect(normalizeAbsolutePath('/')).toBe('/');
		expect(normalizeAbsolutePath('')).toBe('/');
	});

	it('normalizes relative mock paths as slash-prefixed values', () => {
		expect(normalizeRelativeMockPath('123')).toBe('/123');
		expect(normalizeRelativeMockPath('/123/')).toBe('/123');
		expect(normalizeRelativeMockPath('/')).toBe('/');
	});

	it('joins subfolder base paths and mock paths into served effective paths', () => {
		expect(joinMockPaths('/v1/users', '/123')).toBe('/v1/users/123');
		expect(joinMockPaths('/v1/users/', '123/')).toBe('/v1/users/123');
		expect(joinMockPaths('/', '/users')).toBe('/users');
		expect(joinMockPaths('/v1/users', '/')).toBe('/v1/users');
	});

	it('generates stable slugs for subfolder names', () => {
		expect(generateSlug(' User APIs ')).toBe('user-apis');
		expect(generateSlug('Billing / Orders')).toBe('billing-orders');
	});
});
