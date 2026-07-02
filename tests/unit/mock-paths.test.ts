import { describe, expect, it } from 'bun:test';
import {
	generateSlug,
	hasConfiguredQueryParams,
	hasSearchParamsInEndpointPath,
	joinMockPaths,
	normalizeAbsolutePath,
	normalizeRelativeMockPath,
	splitPathSearchParams,
	validateEndpointPathSearchParams,
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

	it('detects search params embedded in endpoint paths', () => {
		expect(hasSearchParamsInEndpointPath('/users?status=active')).toBe(true);
		expect(hasSearchParamsInEndpointPath('/users')).toBe(false);
	});

	it('splits request path and search params without mixing them', () => {
		expect(splitPathSearchParams('/users/123?status=active&page=1')).toEqual({
			path: '/users/123',
			queryParams: { status: 'active', page: '1' },
		});
		expect(splitPathSearchParams('users/123?status=active#details')).toEqual({
			path: '/users/123',
			queryParams: { status: 'active' },
		});
	});

	it('detects configured query params by non-empty keys', () => {
		expect(hasConfiguredQueryParams({ status: 'active' })).toBe(true);
		expect(hasConfiguredQueryParams({ '': 'active' })).toBe(false);
		expect(hasConfiguredQueryParams(null)).toBe(false);
	});

	it('rejects endpoint paths that include search params', () => {
		expect(
			validateEndpointPathSearchParams('/users?status=active', null).valid,
		).toBe(false);
		expect(
			validateEndpointPathSearchParams('/users?status=active', {
				status: 'active',
			}).valid,
		).toBe(false);
		expect(
			validateEndpointPathSearchParams('/users', { status: 'active' }).valid,
		).toBe(true);
	});
});
