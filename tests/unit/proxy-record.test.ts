import { describe, expect, test } from 'bun:test';
import {
	findBestMatch,
	type MockCandidate,
} from '../../lib/utils/mock-matcher';
import {
	buildProxyRequestHeaders,
	buildProxyTargetUrl,
	buildRecordedMockName,
	isRecordedMock,
	validateProxyTargetUrl,
} from '../../lib/utils/proxy-record';

describe('validateProxyTargetUrl', () => {
	test('accepts http(s) URLs, including wildcard placeholders', () => {
		expect(validateProxyTargetUrl('')).toBeNull();
		expect(validateProxyTargetUrl('https://api.example.com/users')).toBeNull();
		expect(
			validateProxyTargetUrl('https://api.example.com/users/*'),
		).toBeNull();
	});

	test('rejects URLs without a scheme or with another protocol', () => {
		expect(validateProxyTargetUrl('api.example.com/users')).toContain(
			'http://',
		);
		expect(validateProxyTargetUrl('ftp://files.example.com')).toContain(
			'http://',
		);
	});
});

describe('buildProxyTargetUrl', () => {
	test('substitutes wildcard captures in order and merges the query', () => {
		const result = buildProxyTargetUrl(
			'https://api.example.com/users/*/orders/*?v=1',
			['42', '7'],
			new URLSearchParams('page=2'),
		);
		expect(result.ok && result.url.toString()).toBe(
			'https://api.example.com/users/42/orders/7?v=1&page=2',
		);
	});

	test('returns an error instead of throwing for an invalid target', () => {
		const result = buildProxyTargetUrl(
			'api.example.com',
			[],
			new URLSearchParams(),
		);
		expect(result.ok).toBe(false);
	});
});

describe('buildProxyRequestHeaders', () => {
	test('drops hop-by-hop and length headers', () => {
		const headers = buildProxyRequestHeaders(
			new Headers({
				host: 'localhost:36666',
				connection: 'keep-alive',
				'content-length': '12',
				authorization: 'Bearer test',
				accept: 'application/json',
			}),
		);
		expect(headers).toEqual({
			authorization: 'Bearer test',
			accept: 'application/json',
		});
	});
});

describe('recorded mocks', () => {
	test('names include method, path, and query', () => {
		expect(buildRecordedMockName('GET', '/users', { page: '1' })).toBe(
			'Recorded: GET /users?page=1',
		);
	});

	test('are detected by meta flag or legacy name', () => {
		expect(isRecordedMock({ recordedFrom: 'mock-1' }, 'x')).toBe(true);
		expect(isRecordedMock(null, 'Auto-captured: GET /users')).toBe(true);
		expect(isRecordedMock({}, 'Users')).toBe(false);
	});

	test('a recording without query params does not swallow other queries', () => {
		// Ordered like the serve route: non-proxy mocks first on ties.
		const candidates: MockCandidate[] = [
			{
				endpoint: '/users',
				matchType: 'exact',
				queryParams: {},
				exactQuery: true,
				_score: 0,
				_id: 'recording',
			},
			{
				endpoint: '/users',
				matchType: 'exact',
				queryParams: null,
				_score: 0,
				_id: 'proxy',
			},
		];
		expect(findBestMatch('/users', {}, candidates)?._id).toBe('recording');
		expect(findBestMatch('/users', { page: '3' }, candidates)?._id).toBe(
			'proxy',
		);
	});
});
