import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { NextRequest } from 'next/server';

// 1. Mock Data
const mockFolder = {
	id: 'folder-1',
	name: 'API',
	slug: 'api',
};

const mockResponse = {
	id: 'mock-1',
	folderId: 'folder-1',
	name: 'Get Users',
	endpoint: '/users',
	method: 'GET',
	statusCode: 200,
	response: JSON.stringify({ users: [] }),
	bodyType: 'json',
	useDynamicResponse: false,
	echoRequestBody: false,
	enabled: true,
	matchType: 'exact',
	queryParams: null,
};

// 2. Chainable mock builder
const createMockBuilder = (resolvedValue: unknown) => {
	const builder = {
		from: mock(() => builder),
		where: mock(() => builder),
		limit: mock(() => builder),
		then: (resolve: (val: unknown) => void) => resolve(resolvedValue),
	} as unknown as {
		from: (val: unknown) => unknown;
		where: (val: unknown) => unknown;
		limit: (val: unknown) => unknown;
		then: (resolve: (val: unknown) => void) => void;
	};
	return builder;
};

// State for mocks
let folderResult: unknown[] = [mockFolder];
let _mockResult: unknown[] = [mockResponse];

const mockDb = {
	select: mock(() => createMockBuilder(folderResult)), // Simplified: first call is folder, second is mock
};

// We need to differentiate select returns based on what table is being queried?
// Or we can rely on call order?
// In `handleRequest`:
// 1. select from folders where slug = ...
// 2. select from mockResponses where folderId = ...

// Let's make mockDb.select smart enough or just mock specific returns in tests
// Since `drizzle-orm` isn't fully mocked here to distinguish tables easily without more complex setup,
// we will intercept the calls in test cases.

mock.module('@/lib/db', () => ({ db: mockDb }));

// Import handler
// Since it's a dynamic route [...path], the exports are GET, POST, etc.
// But the logic is in handleRequest which is not exported...
// We have to call GET/POST etc.

import { GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS } from '../../app/api/mock/[...path]/route';

describe('Mock Serving /mock/[folder]/[path]', () => {
	beforeEach(() => {
		// Reset default behavior
		mockDb.select = mock(() => {
			// This is tricky because we chain .from().where()...
			// We can return a builder that returns folders first, then mocks?
			// Actually, `db.select()` returns the builder.
			return createMockBuilder([mockFolder]);
		});
	});

	it('serves a static JSON mock', async () => {
		// Setup distinct returns for the two queries
		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]); // Folder query
			if (callCount === 2) return createMockBuilder([mockResponse]); // Mock query
			return createMockBuilder([]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/users', {
			method: 'GET',
		});
		const params = Promise.resolve({ path: ['api', 'users'] });

		const res = await GET(req, { params });
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body).toEqual({ users: [] });
	});

	it('returns 404 if folder not found', async () => {
		mockDb.select = mock(() => createMockBuilder([])); // No folder found

		const req = new NextRequest('http://localhost:3000/api/mock/unknown/users');
		const params = Promise.resolve({ path: ['unknown', 'users'] });

		const res = await GET(req, { params });
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe('Folder not found');
	});

	it('returns 404 if mock not found in folder', async () => {
		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]); // Folder found
			if (callCount === 2) return createMockBuilder([]); // Mock NOT found
			return createMockBuilder([]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/unknown');
		const params = Promise.resolve({ path: ['api', 'unknown'] });

		const res = await GET(req, { params });
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe('Mock endpoint not found');
	});

	it('serves echo request body', async () => {
		const echoMock = {
			...mockResponse,
			echoRequestBody: true,
			statusCode: 201,
		};

		// Mock chain
		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]);
			if (callCount === 2) return createMockBuilder([echoMock]);
			return createMockBuilder([]);
		});

		const payload = { foo: 'bar' };
		const req = new NextRequest('http://localhost:3000/api/mock/api/users', {
			method: 'POST',
			body: JSON.stringify(payload),
			headers: { 'Content-Type': 'application/json' },
		});
		const params = Promise.resolve({ path: ['api', 'users'] });

		const res = await POST(req, { params });

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toEqual(payload);
	});

	it('serves static text mock', async () => {
		const textMock = {
			...mockResponse,
			bodyType: 'text',
			response: 'Hello World',
			statusCode: 200,
		};

		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]);
			if (callCount === 2) return createMockBuilder([textMock]);
			return createMockBuilder([]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/text');
		const params = Promise.resolve({ path: ['api', 'text'] });

		const res = await GET(req, { params });
		expect(res.status).toBe(200);
		const text = await res.text();
		expect(text).toBe('Hello World');
	});

	it("serves root path mock (folder only, path = '/')", async () => {
		const rootMock = {
			...mockResponse,
			endpoint: '/',
			name: 'Root Mock',
			response: JSON.stringify({ message: 'Root endpoint' }),
		};

		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]);
			if (callCount === 2) return createMockBuilder([rootMock]);
			return createMockBuilder([]);
		});

		// Test with trailing slash
		const reqWithSlash = new NextRequest('http://localhost:3000/api/mock/api/');
		const paramsWithSlash = Promise.resolve({ path: ['api', ''] });

		const resWithSlash = await GET(reqWithSlash, { params: paramsWithSlash });
		expect(resWithSlash.status).toBe(200);
		const bodyWithSlash = await resWithSlash.json();
		expect(bodyWithSlash).toEqual({ message: 'Root endpoint' });

		// Test without trailing slash (single segment)
		callCount = 0;
		const reqNoSlash = new NextRequest('http://localhost:3000/api/mock/api');
		const paramsNoSlash = Promise.resolve({ path: ['api'] });

		const resNoSlash = await GET(reqNoSlash, { params: paramsNoSlash });
		expect(resNoSlash.status).toBe(200);
		const bodyNoSlash = await resNoSlash.json();
		expect(bodyNoSlash).toEqual({ message: 'Root endpoint' });
	});

	it('serves a dynamic JSON mock from schema', async () => {
		const schemaMock = {
			...mockResponse,
			useDynamicResponse: true,
			jsonSchema: JSON.stringify({
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid' },
					name: { type: 'string', 'x-faker': 'person.fullName' },
				},
				required: ['id', 'name'],
			}),
			response: JSON.stringify({ fallback: true }), // Static fallback
			statusCode: 200,
		};

		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]);
			if (callCount === 2) return createMockBuilder([schemaMock]);
			return createMockBuilder([]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/dynamic');
		const params = Promise.resolve({ path: ['api', 'dynamic'] });

		const res = await GET(req, { params });
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body).toHaveProperty('id');
		expect(body).toHaveProperty('name');
		expect(body.id).toMatch(/^[0-9a-f-]{36}$/i); // Valid UUID
		expect(typeof body.name).toBe('string');
		// Verify 'fillProperties: false' - no other keys
		expect(Object.keys(body).length).toBe(2);
	});

	it('returns 400 for invalid mock URL format (no path segments)', async () => {
		const req = new NextRequest('http://localhost:3000/api/mock');
		const params = Promise.resolve({ path: [] });
		const res = await GET(req, { params });
		expect(res.status).toBe(400);
	});

	it('normalizes trailing slashes for non-root paths', async () => {
		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]);
			if (callCount === 2) return createMockBuilder([mockResponse]); // Matches /users
			return createMockBuilder([]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/users/');
		const params = Promise.resolve({ path: ['api', 'users', ''] });

		const res = await GET(req, { params });
		expect(res.status).toBe(200);
		// If normalized correctly, it should have matched mockResponse which is /users
	});

	it('serves a mock via Phase 2 fallback (substring match)', async () => {
		const substringMock = {
			...mockResponse,
			id: 'substring-1',
			endpoint: '/users',
			matchType: 'substring',
		};

		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]);
			if (callCount === 2) return createMockBuilder([]); // Phase 1: No exact match
			if (callCount === 3) return createMockBuilder([substringMock]); // Phase 2: Get all mocks
			return createMockBuilder([]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/users/list');
		const params = Promise.resolve({ path: ['api', 'users', 'list'] });

		const res = await GET(req, { params });
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ users: [] });
	});

	it('responds to OPTIONS with 204', async () => {
		const req = new NextRequest('http://localhost:3000/api/mock/api', { method: 'OPTIONS' });
		const res = await OPTIONS();
		expect(res.status).toBe(204);
	});

	it('falls through to Phase 2 when query params mismatch in Phase 1', async () => {
		const qpMock = {
			...mockResponse,
			matchType: 'exact',
			queryParams: { q: 'exact' },
		};

		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]);
			if (callCount === 2) return createMockBuilder([qpMock]); // Phase 1 match
			if (callCount === 3) return createMockBuilder([mockResponse]); // Phase 2 matches
			return createMockBuilder([]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/users?q=wrong');
		const params = Promise.resolve({ path: ['api', 'users'] });

		const res = await GET(req, { params });
		expect(res.status).toBe(200);
		// Should have matched mockResponse instead of qpMock
	});

	it('handles invalid JSON for echo request body', async () => {
		const echoMock = { ...mockResponse, echoRequestBody: true, method: 'POST' };
		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]);
			if (callCount === 2) return createMockBuilder([echoMock]);
			return createMockBuilder([]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/users', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: 'invalid json',
		});
		const params = Promise.resolve({ path: ['api', 'users'] });

		const res = await POST(req, { params });
		expect(res.status).toBe(200);
		expect(await res.text()).toBe('invalid json');
	});

	it('handles failure in dynamic response generation', async () => {
		const failMock = {
			...mockResponse,
			useDynamicResponse: true,
			jsonSchema: 'invalid', // Will throw
			response: '{"fallback":true}',
		};

		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]);
			if (callCount === 2) return createMockBuilder([failMock]);
			return createMockBuilder([]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/users');
		const params = Promise.resolve({ path: ['api', 'users'] });

		const res = await GET(req, { params });
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.fallback).toBe(true);
	});

	it('handles dynamic response with missing schema', async () => {
		const badDynamicMock = {
			...mockResponse,
			useDynamicResponse: true,
			jsonSchema: null as any,
			response: '{"fallback":true}',
		};

		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]);
			if (callCount === 2) return createMockBuilder([badDynamicMock]);
			return createMockBuilder([]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/users');
		const params = Promise.resolve({ path: ['api', 'users'] });

		const res = await GET(req, { params });
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.fallback).toBe(true);
	});

	it('returns text response if static JSON mock has invalid JSON body', async () => {
		const invalidJsonMock = {
			...mockResponse,
			bodyType: 'json',
			response: 'invalid json content { }',
		};

		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]);
			if (callCount === 2) return createMockBuilder([invalidJsonMock]);
			return createMockBuilder([]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/users');
		const params = Promise.resolve({ path: ['api', 'users'] });

		const res = await GET(req, { params });
		expect(res.status).toBe(200);
		expect(await res.text()).toBe('invalid json content { }');
	});

	it('echoes text body when content-type is not JSON', async () => {
		const echoMock = { ...mockResponse, echoRequestBody: true, method: 'POST' };
		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]);
			if (callCount === 2) return createMockBuilder([echoMock]);
			return createMockBuilder([]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/users', {
			method: 'POST',
			headers: { 'content-type': 'text/plain' },
			body: 'plain text',
		});
		const params = Promise.resolve({ path: ['api', 'users'] });

		const res = await POST(req, { params });
		expect(res.status).toBe(200);
		expect(await res.text()).toBe('plain text');
	});

	it('responds to HEAD with 200', async () => {
		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]);
			if (callCount === 2) return createMockBuilder([mockResponse]);
			return createMockBuilder([]);
		});
		const req = new NextRequest('http://localhost:3000/api/mock/api/users', { method: 'HEAD' });
		const params = Promise.resolve({ path: ['api', 'users'] });
		const res = await HEAD(req, { params });
		expect(res.status).toBe(200);
	});

	it('responds to PUT, PATCH, DELETE', async () => {
		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]);
			if (callCount === 2) return createMockBuilder([mockResponse]);
			return createMockBuilder([]);
		});
		const params = Promise.resolve({ path: ['api', 'users'] });

		const resPut = await PUT(new NextRequest('http://localhost:3000/api/mock/api/users', { method: 'PUT' }), { params });
		expect(resPut.status).toBe(200);

		callCount = 0;
		const resPatch = await PATCH(new NextRequest('http://localhost:3000/api/mock/api/users', { method: 'PATCH' }), { params });
		expect(resPatch.status).toBe(200);

		callCount = 0;
		const resDelete = await DELETE(new NextRequest('http://localhost:3000/api/mock/api/users', { method: 'DELETE' }), { params });
		expect(resDelete.status).toBe(200);
	});

	it('handles Phase 2 match found but database record lookup failed', async () => {
		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([mockFolder]);
			if (callCount === 2) return createMockBuilder([]); // Phase 1: No match
			if (callCount === 3) {
				// Phase 2: findBestMatch will be called on this array.
				// We return an array that will produce a match, but then bestMock lookup will fail 
				// if we are tricky, OR we just trust the logic.
				// Actually, we can just mock the array's find method if we want to be surgical.
				const results = [{ ...mockResponse, matchType: 'substring' }];
				// @ts-ignore
				results.find = () => null; 
				return createMockBuilder(results);
			}
			return createMockBuilder([]);
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/users');
		const params = Promise.resolve({ path: ['api', 'users'] });
		const res = await GET(req, { params });
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe('Mock endpoint not found');
	});

	it('returns 500 on internal server error', async () => {
		mockDb.select = mock(() => {
			throw new Error('Database connection failed');
		});

		const req = new NextRequest('http://localhost:3000/api/mock/api/users');
		const params = Promise.resolve({ path: ['api', 'users'] });

		const res = await GET(req, { params });
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toBe('Internal Server Error');
	});
});
