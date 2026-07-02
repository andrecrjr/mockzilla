import { describe, expect, it } from 'bun:test';
import {
	generateSlug,
	getMockFolderRelativePath,
	getServedMockPath,
	hasConfiguredQueryParams,
	hasSearchParamsInEndpointPath,
	joinMockPaths,
	normalizeAbsolutePath,
	normalizeRelativeMockPath,
	normalizeSubfolderSlugInput,
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

	it('converts served subfolder paths back to subfolder-relative mock paths', () => {
		expect(
			getMockFolderRelativePath(
				'/api/mock/ticket-management/app/ticket-type',
				'/app',
				'ticket-management',
			),
		).toBe('/ticket-type');
		expect(
			getMockFolderRelativePath(
				'/ticket-management/app/ticket-type',
				'/app',
				'ticket-management',
			),
		).toBe('/ticket-type');
		expect(
			getMockFolderRelativePath(
				'/app/ticket-management/ticket-type',
				'/app',
				'ticket-management',
			),
		).toBe('/ticket-management/ticket-type');
		expect(
			getMockFolderRelativePath(
				'/ticket-management/ticket-type',
				'/',
				'ticket-management',
			),
		).toBe('/ticket-management/ticket-type');
		expect(
			getMockFolderRelativePath(
				'/api/mock/ticket-management/ticket-type',
				'/',
				'ticket-management',
			),
		).toBe('/ticket-type');
	});

	it('builds served subfolder paths without duplicating folder or subfolder prefixes', () => {
		expect(getServedMockPath('/app', '/ticket-type', 'ticket-management')).toBe(
			'/app/ticket-type',
		);
		expect(
			getServedMockPath(
				'/app',
				'/ticket-management/app/ticket-type',
				'ticket-management',
			),
		).toBe('/app/ticket-type');
		expect(
			getServedMockPath(
				'/app',
				'/api/mock/ticket-management/app/ticket-type',
				'ticket-management',
			),
		).toBe('/app/ticket-type');
	});

	it('generates stable slugs for subfolder names', () => {
		expect(generateSlug(' User APIs ')).toBe('user-apis');
		expect(generateSlug('Billing / Orders')).toBe('billing-orders');
	});

	it('normalizes subfolder slug inputs from names and pasted paths', () => {
		expect(normalizeSubfolderSlugInput('Ticket Type', '/', 'ticket-management')).toBe(
			'ticket-type',
		);
		expect(
			normalizeSubfolderSlugInput(
				'/api/mock/ticket-management/app/ticket-type',
				'/app',
				'ticket-management',
			),
		).toBe('ticket-type');
		expect(
			normalizeSubfolderSlugInput(
				'/ticket-management/app/ticket-type',
				'/app',
				'ticket-management',
			),
		).toBe('ticket-type');
		expect(
			normalizeSubfolderSlugInput('/app/ticket-type', '/app', 'ticket-management'),
		).toBe('ticket-type');
		expect(
			normalizeSubfolderSlugInput(
				'http://localhost:36666/api/mock/ticket-management/app/ticket-type',
				'/app',
				'ticket-management',
			),
		).toBe('ticket-type');
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
