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

import { GET, POST } from '../../app/api/mock/[...path]/route';

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
});
