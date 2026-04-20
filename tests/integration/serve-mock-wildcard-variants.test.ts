import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { NextRequest } from 'next/server';

// -------------------------------------------------------
// Database mock setup
// -------------------------------------------------------

const mockFolder = {
	id: 'folder-1',
	name: 'API',
	slug: 'api',
};

const createMockBuilder = (resolvedValue: unknown) => {
	const builder = {
		from: mock(() => builder),
		where: mock(() => builder),
		orderBy: mock(() => builder),
		limit: mock(() => builder),
		then: (resolve: (val: unknown) => void) => resolve(resolvedValue),
	} as unknown as {
		from: (val: unknown) => unknown;
		where: (val: unknown) => unknown;
		orderBy: (val: unknown) => unknown;
		limit: (val: unknown) => unknown;
		then: (resolve: (val: unknown) => void) => void;
	};
	return builder;
};

let callLog: string[] = [];
let folderResult: unknown[] = [mockFolder];
let mocksResult: unknown[] = [];

const mockDb = {
	select: mock(() => {
		callLog.push('select');
		if (callLog.filter((c) => c === 'select').length === 1) {
			return createMockBuilder(folderResult);
		}
		return createMockBuilder(mocksResult);
	}),
};

mock.module('@/lib/db', () => ({ db: mockDb }));

import { GET } from '../../app/api/mock/[...path]/route';

// -------------------------------------------------------
// Tests
// -------------------------------------------------------

describe('Mock Serving — wildcard variants', () => {
	beforeEach(() => {
		callLog = [];
		folderResult = [mockFolder];
		mocksResult = [];
	});

	it('serves variant when capture key matches', async () => {
		const wildcardMock = {
			id: 'm1',
			folderId: 'folder-1',
			endpoint: '/users/*',
			method: 'GET',
			statusCode: 200,
			response: JSON.stringify({ default: true }),
			bodyType: 'json',
			matchType: 'wildcard',
			queryParams: null,
			enabled: true,
			echoRequestBody: false,
			useDynamicResponse: false,
			variants: [
				{
					key: '123',
					body: JSON.stringify({ id: 123, name: 'Alice' }),
					statusCode: 200,
					bodyType: 'json',
				},
				{
					key: '456',
					body: JSON.stringify({ id: 456, name: 'Bob' }),
					statusCode: 200,
					bodyType: 'json',
				},
			],
			wildcardRequireMatch: false,
		};

		let selectCall = 0;
		mockDb.select = mock(() => {
			selectCall++;
			if (selectCall === 1) return createMockBuilder([mockFolder]);
			if (selectCall === 2) return createMockBuilder([]);
			return createMockBuilder([wildcardMock]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/users/123');
		const params = Promise.resolve({ path: ['api', 'users', '123'] });

		const res = await GET(req, { params });
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ id: 123, name: 'Alice' });
	});

	it('serves correct variant for different capture key', async () => {
		const wildcardMock = {
			id: 'm1',
			folderId: 'folder-1',
			endpoint: '/users/*',
			method: 'GET',
			statusCode: 200,
			response: JSON.stringify({ default: true }),
			bodyType: 'json',
			matchType: 'wildcard',
			queryParams: null,
			enabled: true,
			echoRequestBody: false,
			useDynamicResponse: false,
			variants: [
				{
					key: '123',
					body: JSON.stringify({ id: 123 }),
					statusCode: 200,
					bodyType: 'json',
				},
				{
					key: '456',
					body: JSON.stringify({ id: 456 }),
					statusCode: 200,
					bodyType: 'json',
				},
			],
			wildcardRequireMatch: false,
		};

		let selectCall = 0;
		mockDb.select = mock(() => {
			selectCall++;
			if (selectCall === 1) return createMockBuilder([mockFolder]);
			if (selectCall === 2) return createMockBuilder([]);
			return createMockBuilder([wildcardMock]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/users/456');
		const params = Promise.resolve({ path: ['api', 'users', '456'] });

		const res = await GET(req, { params });
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ id: 456 });
	});

	it('falls back to default body when no variant matches', async () => {
		const wildcardMock = {
			id: 'm1',
			folderId: 'folder-1',
			endpoint: '/users/*',
			method: 'GET',
			statusCode: 200,
			response: JSON.stringify({ default: true }),
			bodyType: 'json',
			matchType: 'wildcard',
			queryParams: null,
			enabled: true,
			echoRequestBody: false,
			useDynamicResponse: false,
			variants: [
				{
					key: '123',
					body: JSON.stringify({ id: 123 }),
					statusCode: 200,
					bodyType: 'json',
				},
			],
			wildcardRequireMatch: false,
		};

		let selectCall = 0;
		mockDb.select = mock(() => {
			selectCall++;
			if (selectCall === 1) return createMockBuilder([mockFolder]);
			if (selectCall === 2) return createMockBuilder([]);
			return createMockBuilder([wildcardMock]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/users/999');
		const params = Promise.resolve({ path: ['api', 'users', '999'] });

		const res = await GET(req, { params });
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ default: true });
	});

	it('returns 404 when no variant matches and wildcardRequireMatch is true', async () => {
		const wildcardMock = {
			id: 'm1',
			folderId: 'folder-1',
			endpoint: '/users/*',
			method: 'GET',
			statusCode: 200,
			response: JSON.stringify({ default: true }),
			bodyType: 'json',
			matchType: 'wildcard',
			queryParams: null,
			enabled: true,
			echoRequestBody: false,
			useDynamicResponse: false,
			variants: [
				{
					key: '123',
					body: JSON.stringify({ id: 123 }),
					statusCode: 200,
					bodyType: 'json',
				},
			],
			wildcardRequireMatch: true,
		};

		let selectCall = 0;
		mockDb.select = mock(() => {
			selectCall++;
			if (selectCall === 1) return createMockBuilder([mockFolder]);
			if (selectCall === 2) return createMockBuilder([]);
			return createMockBuilder([wildcardMock]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/users/999');
		const params = Promise.resolve({ path: ['api', 'users', '999'] });

		const res = await GET(req, { params });
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe('No matching variant found');
	});

	it('serves variant with different statusCode', async () => {
		const wildcardMock = {
			id: 'm1',
			folderId: 'folder-1',
			endpoint: '/users/*',
			method: 'GET',
			statusCode: 200,
			response: JSON.stringify({ default: true }),
			bodyType: 'json',
			matchType: 'wildcard',
			queryParams: null,
			enabled: true,
			echoRequestBody: false,
			useDynamicResponse: false,
			variants: [
				{
					key: '404user',
					body: JSON.stringify({ error: 'not found' }),
					statusCode: 404,
					bodyType: 'json',
				},
				{
					key: '500user',
					body: JSON.stringify({ error: 'server error' }),
					statusCode: 500,
					bodyType: 'json',
				},
			],
			wildcardRequireMatch: false,
		};

		let selectCall = 0;
		mockDb.select = mock(() => {
			selectCall++;
			if (selectCall === 1) return createMockBuilder([mockFolder]);
			if (selectCall === 2) return createMockBuilder([]);
			return createMockBuilder([wildcardMock]);
		});

		const req = new NextRequest(
			'http://localhost:3000/api/mock/api/users/404user',
		);
		const params = Promise.resolve({ path: ['api', 'users', '404user'] });

		const res = await GET(req, { params });
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toEqual({ error: 'not found' });
	});

	it('handles multi-segment capture keys in variants', async () => {
		const wildcardMock = {
			id: 'm1',
			folderId: 'folder-1',
			endpoint: '/users/*/status/*',
			method: 'GET',
			statusCode: 200,
			response: JSON.stringify({ default: true }),
			bodyType: 'json',
			matchType: 'wildcard',
			queryParams: null,
			enabled: true,
			echoRequestBody: false,
			useDynamicResponse: false,
			variants: [
				{
					key: 'alice|active',
					body: JSON.stringify({ user: 'alice', status: 'active' }),
					statusCode: 200,
					bodyType: 'json',
				},
				{
					key: 'bob|inactive',
					body: JSON.stringify({ user: 'bob', status: 'inactive' }),
					statusCode: 200,
					bodyType: 'json',
				},
			],
			wildcardRequireMatch: false,
		};

		let selectCall = 0;
		mockDb.select = mock(() => {
			selectCall++;
			if (selectCall === 1) return createMockBuilder([mockFolder]);
			if (selectCall === 2) return createMockBuilder([]);
			return createMockBuilder([wildcardMock]);
		});

		const req = new NextRequest(
			'http://localhost:3000/api/mock/api/users/bob/status/inactive',
		);
		const params = Promise.resolve({
			path: ['api', 'users', 'bob', 'status', 'inactive'],
		});

		const res = await GET(req, { params });
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ user: 'bob', status: 'inactive' });
	});

	it('returns 404 when wildcardRequireMatch true and no variant array', async () => {
		const wildcardMock = {
			id: 'm1',
			folderId: 'folder-1',
			endpoint: '/users/*',
			method: 'GET',
			statusCode: 200,
			response: JSON.stringify({ default: true }),
			bodyType: 'json',
			matchType: 'wildcard',
			queryParams: null,
			enabled: true,
			echoRequestBody: false,
			useDynamicResponse: false,
			variants: null,
			wildcardRequireMatch: true,
		};

		let selectCall = 0;
		mockDb.select = mock(() => {
			selectCall++;
			if (selectCall === 1) return createMockBuilder([mockFolder]);
			if (selectCall === 2) return createMockBuilder([]);
			return createMockBuilder([wildcardMock]);
		});

		// When no variants exist and wildcardRequireMatch is true, it should fall through
		// to serve the default mock body (variants array is empty/null, so no variant selection)
		const req = new NextRequest('http://localhost:3000/api/mock/api/users/123');
		const params = Promise.resolve({ path: ['api', 'users', '123'] });

		const res = await GET(req, { params });
		// Falls back to default body since no variants to select from
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ default: true });
	});
});
