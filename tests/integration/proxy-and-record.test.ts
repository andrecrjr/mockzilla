import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { NextRequest } from 'next/server';

type QueryBuilder<T> = {
	from: () => QueryBuilder<T>;
	where: () => QueryBuilder<T>;
	limit: () => QueryBuilder<T>;
	innerJoin: () => QueryBuilder<T>;
	leftJoin: () => QueryBuilder<T>;
	orderBy: () => QueryBuilder<T>;
	then: (resolve: (value: T) => void) => void;
};

type InsertBuilder = {
	values: (value: Record<string, unknown>) => {
		returning: () => QueryBuilder<unknown[]>;
		then: (resolve: (value: unknown[]) => void) => void;
	};
};

const folderWithProxyMeta = {
	id: 'folder-proxy-1',
	name: 'Proxy Folder',
	slug: 'proxy-api',
	meta: { proxyTargetUrl: 'https://api.target.com' },
};

const folderWithoutProxyMeta = {
	id: 'folder-1',
	name: 'Proxy Folder',
	slug: 'proxy-api',
	meta: {},
};

const createMockBuilder = <T>(resolvedValue: T): QueryBuilder<T> => {
	const builder = {
		from: mock(() => builder),
		where: mock(() => builder),
		limit: mock(() => builder),
		innerJoin: mock(() => builder),
		leftJoin: mock(() => builder),
		orderBy: mock(() => builder),
		then: (resolve: (value: T) => void) => resolve(resolvedValue),
	};

	return builder;
};

const insertValuesSpy = mock((_: Record<string, unknown>) => undefined);
const mockDb = {
	select: mock(() => createMockBuilder<unknown[]>([])),
	insert: mock(
		(): InsertBuilder => ({
			values: (value: Record<string, unknown>) => {
				insertValuesSpy(value);
				return {
					returning: () => createMockBuilder<unknown[]>([]),
					then: (resolve: (value: unknown[]) => void) => resolve([]),
				};
			},
		}),
	),
};

mock.module('@/lib/db', () => ({ db: mockDb }));

const mockFetch = mock(
	(_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
		Promise.resolve(new Response()),
);
global.fetch = Object.assign(mockFetch, {
	preconnect: mock((_url: string | URL) => undefined),
}) as typeof fetch;

import { GET, POST } from '../../app/api/mock/[...path]/route';

describe('Proxy and Record Integration', () => {
	beforeEach(() => {
		mockDb.select.mockClear();
		mockDb.insert.mockClear();
		insertValuesSpy.mockClear();
		mockFetch.mockClear();
		delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
	});

	it('returns 404 when no mock matches even if folder metadata has proxyTargetUrl', async () => {
		let callCount = 0;
		mockDb.select.mockImplementation(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([folderWithProxyMeta]);
			return createMockBuilder([]);
		});

		const req = new NextRequest(
			'http://localhost:3000/api/mock/proxy-api/data?q=test',
			{ method: 'GET' },
		);

		const res = await GET(req, {
			params: Promise.resolve({ path: ['proxy-api', 'data'] }),
		});

		expect(res.status).toBe(404);
		expect(mockFetch).not.toHaveBeenCalled();
		expect(insertValuesSpy).not.toHaveBeenCalled();
	});

	it('proxies GET request and records mock when matched mock has proxyTargetUrl', async () => {
		const proxyMock = {
			id: 'mock-proxy-1',
			name: 'Mock with Proxy',
			endpoint: '/specific-proxy',
			method: 'GET' as const,
			statusCode: 200,
			response: '{}',
			folderId: folderWithoutProxyMeta.id,
			enabled: true,
			matchType: 'exact' as const,
			queryParams: null,
			delay: 0,
			meta: { proxyTargetUrl: 'https://mock-target.com/base' },
		};

		let callCount = 0;
		mockDb.select.mockImplementation(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([folderWithoutProxyMeta]);
			return createMockBuilder([proxyMock]);
		});

		mockFetch.mockResolvedValue(
			new Response(JSON.stringify({ proxy: 'success' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}),
		);

		const req = new NextRequest(
			'http://localhost:3000/api/mock/proxy-api/specific-proxy?via=test',
			{
				method: 'GET',
				headers: { 'X-Custom-Header': 'hello' },
			},
		);

		const res = await GET(req, {
			params: Promise.resolve({ path: ['proxy-api', 'specific-proxy'] }),
		});
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body).toEqual({ proxy: 'success' });

		const fetchUrl = new URL(String(mockFetch.mock.calls[0]?.[0]));
		expect(fetchUrl.href).toBe(
			'https://mock-target.com/base?via=test',
		);

		const fetchOptions = mockFetch.mock.calls[0]?.[1] as
			| RequestInit
			| undefined;
		expect(fetchOptions?.method).toBe('GET');
		const headers = fetchOptions?.headers as Record<string, string>;
		expect(headers['x-custom-header'] ?? headers['X-Custom-Header']).toBe(
			'hello',
		);
		expect(headers.host).toBeUndefined();

		expect(insertValuesSpy).toHaveBeenCalled();
		const recorded = insertValuesSpy.mock.calls[0]?.[0] as
			| Record<string, unknown>
			| undefined;
		expect(recorded?.endpoint).toBe('/specific-proxy');
		expect(recorded?.folderId).toBe(folderWithoutProxyMeta.id);
		expect(recorded?.queryParams).toEqual({ via: 'test' });
	});

	it('proxies POST request body from a matched proxy mock', async () => {
		const proxyMock = {
			id: 'mock-proxy-post',
			name: 'Post Proxy',
			endpoint: '/posts',
			method: 'POST' as const,
			statusCode: 200,
			response: '{}',
			folderId: folderWithoutProxyMeta.id,
			enabled: true,
			matchType: 'exact' as const,
			queryParams: null,
			delay: 0,
			meta: { proxyTargetUrl: 'https://mock-target.com' },
		};

		let callCount = 0;
		mockDb.select.mockImplementation(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([folderWithoutProxyMeta]);
			return createMockBuilder([proxyMock]);
		});

		mockFetch.mockResolvedValue(
			new Response(JSON.stringify({ id: 123 }), {
				status: 201,
				headers: { 'Content-Type': 'application/json' },
			}),
		);

		const body = JSON.stringify({ title: 'test' });
		const req = new NextRequest('http://localhost:3000/api/mock/proxy-api/posts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body,
		});

		const res = await POST(req, {
			params: Promise.resolve({ path: ['proxy-api', 'posts'] }),
		});

		expect(res.status).toBe(201);
		const fetchOptions = mockFetch.mock.calls[0]?.[1] as
			| RequestInit
			| undefined;
		expect(fetchOptions?.method).toBe('POST');
		expect(fetchOptions?.body).toBe(body);
	});

	it('returns 502 when a matched proxy mock target fails', async () => {
		const proxyMock = {
			id: 'mock-proxy-fail',
			name: 'Fail Proxy',
			endpoint: '/fail',
			method: 'GET' as const,
			statusCode: 200,
			response: '{}',
			folderId: folderWithoutProxyMeta.id,
			enabled: true,
			matchType: 'exact' as const,
			queryParams: null,
			delay: 0,
			meta: { proxyTargetUrl: 'https://mock-target.com' },
		};

		let callCount = 0;
		mockDb.select.mockImplementation(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([folderWithoutProxyMeta]);
			return createMockBuilder([proxyMock]);
		});
		mockFetch.mockRejectedValue(new Error('DNS failure'));

		const req = new NextRequest('http://localhost:3000/api/mock/proxy-api/fail', {
			method: 'GET',
		});
		const res = await GET(req, {
			params: Promise.resolve({ path: ['proxy-api', 'fail'] }),
		});

		expect(res.status).toBe(502);
	});
});
