import { describe, expect, test } from 'bun:test';
import {
	findBestMatch,
	type MockCandidate,
} from '../../lib/utils/mock-matcher';
import {
	applyProxySettings,
	buildProxyRequestHeaders,
	buildProxyTargetUrl,
	buildRecordedMockName,
	getProxyUpstreamConfig,
	isRecordedMock,
	REDACTED_VALUE,
	summarizeProxy,
	validateProxyHeaderName,
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

describe('upstream headers and params', () => {
	test('reads settings from meta and ignores malformed values', () => {
		expect(getProxyUpstreamConfig(null)).toEqual({
			headers: {},
			queryParams: {},
			forwardHeaders: true,
		});
		expect(
			getProxyUpstreamConfig({
				proxyHeaders: { Authorization: 'Bearer x', Bad: { a: 1 }, ' ': 'y' },
				proxyQueryParams: { v: 2 },
				proxyForwardHeaders: false,
			}),
		).toEqual({
			headers: { Authorization: 'Bearer x' },
			queryParams: { v: '2' },
			forwardHeaders: false,
		});
	});

	test('configured headers replace incoming ones case-insensitively', () => {
		const headers = buildProxyRequestHeaders(
			new Headers({ Authorization: 'Bearer caller', cookie: 'sid=1' }),
			{ authorization: 'Bearer stored', 'X-Api-Key': 'k' },
		);
		expect(headers).toEqual({
			authorization: 'Bearer stored',
			cookie: 'sid=1',
			'x-api-key': 'k',
		});
	});

	test('can send only the configured headers', () => {
		const headers = buildProxyRequestHeaders(
			new Headers({ authorization: 'Bearer caller', cookie: 'sid=1' }),
			{ Authorization: 'Bearer stored' },
			false,
		);
		expect(headers).toEqual({ authorization: 'Bearer stored' });
	});

	test('never sends headers the proxy manages or that fetch rejects', () => {
		const headers = buildProxyRequestHeaders(new Headers(), {
			'Content-Length': '1',
			'bad name': 'x',
			Accept: 'text/plain',
		});
		expect(headers).toEqual({ accept: 'text/plain' });
		expect(validateProxyHeaderName('Content-Length')).toContain(
			'automatically',
		);
		expect(validateProxyHeaderName('bad name')).toContain('not a valid');
		expect(validateProxyHeaderName('Authorization')).toBeNull();
	});

	test('configured query params replace incoming ones', () => {
		const result = buildProxyTargetUrl(
			'https://api.example.com/users',
			[],
			new URLSearchParams('page=2&api_key=caller'),
			{ api_key: 'stored', v: '2' },
		);
		expect(result.ok && result.url.search).toBe('?page=2&api_key=stored&v=2');
	});
});

describe('applyProxySettings', () => {
	const base = {
		proxyTargetUrl: 'https://api.example.com/users',
		proxyHeaders: { Authorization: 'Bearer stored' },
		proxyQueryParams: { api_key: 'K1' },
		recordedNote: 'keep me',
	};

	test('is a partial update that preserves other meta keys', () => {
		const result = applyProxySettings(base, { forwardHeaders: false });
		expect(result).toEqual({
			ok: true,
			meta: { ...base, proxyForwardHeaders: false },
		});
	});

	test('replaces the headers map as a whole', () => {
		const result = applyProxySettings(base, { headers: { 'X-Trace': 'on' } });
		expect(result.ok && result.meta.proxyHeaders).toEqual({ 'X-Trace': 'on' });
	});

	test('keeps a stored secret when *** is sent back', () => {
		const result = applyProxySettings(base, {
			headers: { authorization: REDACTED_VALUE, 'X-Trace': 'on' },
		});
		expect(result.ok && result.meta.proxyHeaders).toEqual({
			authorization: 'Bearer stored',
			'X-Trace': 'on',
		});
	});

	test('rejects *** when there is nothing stored to keep', () => {
		const result = applyProxySettings(base, {
			headers: { 'X-New': REDACTED_VALUE },
		});
		expect(result.ok).toBe(false);
	});

	test('a null target turns the proxy off and clears related settings', () => {
		const result = applyProxySettings(base, { targetUrl: null });
		expect(result).toEqual({ ok: true, meta: { recordedNote: 'keep me' } });
	});

	test('rejects bad targets, managed headers, and settings without a target', () => {
		expect(applyProxySettings({}, { targetUrl: 'nope' }).ok).toBe(false);
		expect(applyProxySettings(base, { headers: { Host: 'x' } }).ok).toBe(false);
		expect(applyProxySettings({}, { headers: { 'X-A': '1' } }).ok).toBe(false);
	});

	test('an empty map or forwardHeaders true removes the key', () => {
		const result = applyProxySettings(
			{ ...base, proxyForwardHeaders: false },
			{ queryParams: {}, forwardHeaders: true },
		);
		expect(result.ok && result.meta).toEqual({
			proxyTargetUrl: base.proxyTargetUrl,
			proxyHeaders: base.proxyHeaders,
			recordedNote: 'keep me',
		});
	});
});

describe('summarizeProxy', () => {
	test('masks credential values but not harmless ones', () => {
		const { proxy, recorded } = summarizeProxy(
			{
				proxyTargetUrl: 'https://api.example.com',
				proxyHeaders: { Authorization: 'Bearer x', Accept: 'text/plain' },
				proxyQueryParams: { api_key: 'K', v: '2' },
			},
			'Users',
		);
		expect(recorded).toBe(false);
		expect(proxy?.headers).toEqual({
			Authorization: REDACTED_VALUE,
			Accept: 'text/plain',
		});
		expect(proxy?.queryParams).toEqual({ api_key: REDACTED_VALUE, v: '2' });
	});

	test('returns no proxy for a plain mock and flags recordings', () => {
		expect(summarizeProxy({}, 'Users').proxy).toBeNull();
		expect(summarizeProxy({ recordedFrom: 'm1' }, 'x').recorded).toBe(true);
	});
});
