import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { NextRequest } from 'next/server';

// -------------------------------------------------------
// Database mock setup (same pattern as existing tests)
// -------------------------------------------------------

const mockMockData = {
	id: 'mock-123',
	name: 'Test Mock',
	endpoint: '/api/test',
	method: 'GET' as const,
	folderId: 'folder-123',
	response: '{"data": "test"}',
	statusCode: 200,
	matchType: 'exact',
	bodyType: 'json' as const,
	enabled: true,
	queryParams: null,
	createdAt: new Date('2024-01-01'),
	updatedAt: new Date('2024-01-01'),
};

const createMockBuilder = (resolvedValue: unknown) => {
	const builder = {
		from: mock(() => builder),
		where: mock(() => builder),
		orderBy: mock(() => builder),
		limit: mock(() => builder),
		offset: mock(() => builder),
		values: mock(() => builder),
		set: mock(() => builder),
		returning: mock(() => builder),
		then: (resolve: (val: unknown) => void) => resolve(resolvedValue),
	} as unknown as {
		from: (val: unknown) => unknown;
		where: (val: unknown) => unknown;
		orderBy: (val: unknown) => unknown;
		limit: (val: unknown) => unknown;
		offset: (val: unknown) => unknown;
		values: (val: unknown) => unknown;
		set: (val: unknown) => unknown;
		returning: (val: unknown) => unknown;
		then: (resolve: (val: unknown) => void) => void;
	};
	return builder;
};

let mockResolvedValue: unknown[] = [mockMockData];
let insertedValue: unknown = { ...mockMockData };

const mockDb = {
	select: mock((args: { count: unknown } | null) => {
		if (args?.count) {
			return createMockBuilder([{ count: 5 }]);
		}
		return createMockBuilder(mockResolvedValue);
	}),
	insert: mock(() => createMockBuilder([insertedValue])),
	update: mock(() => createMockBuilder([mockMockData])),
	delete: mock(() => createMockBuilder([])),
};

mock.module('@/lib/db', () => ({ db: mockDb }));

import { GET, POST, PUT } from '../../app/api/mocks/route';

// -------------------------------------------------------
// Tests
// -------------------------------------------------------

describe('API /api/mocks — queryParams support', () => {
	beforeEach(() => {
		mockResolvedValue = [mockMockData];
		insertedValue = { ...mockMockData };
	});

	it('GET returns queryParams field when present', async () => {
		const mockWithParams = {
			...mockMockData,
			queryParams: { status: 'active', page: '1' },
		};
		mockResolvedValue = [mockWithParams];

		const req = new NextRequest(
			'http://localhost:3000/api/mocks?folderId=folder-123',
		);
		const res = await GET(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.data[0].queryParams).toEqual({ status: 'active', page: '1' });
	});

	it('GET by id returns queryParams field', async () => {
		const mockWithParams = {
			...mockMockData,
			queryParams: { status: 'active' },
		};
		mockResolvedValue = [mockWithParams];

		const req = new NextRequest('http://localhost:3000/api/mocks?id=mock-123');
		const res = await GET(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.queryParams).toEqual({ status: 'active' });
	});

	it('POST creates a mock with queryParams', async () => {
		insertedValue = {
			...mockMockData,
			name: 'Param Mock',
			endpoint: '/api/users',
			queryParams: { status: 'active' },
		};
		const payload = {
			name: 'Param Mock',
			path: '/api/users',
			method: 'GET',
			statusCode: 200,
			response: '{"users": []}',
			folderId: 'folder-123',
			matchType: 'exact',
			queryParams: { status: 'active' },
		};
		const req = new NextRequest('http://localhost:3000/api/mocks', {
			method: 'POST',
			body: JSON.stringify(payload),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(201);
		expect(body.queryParams).toEqual({ status: 'active' });
	});

	it('POST creates a mock without queryParams (nullable)', async () => {
		const payload = {
			name: 'Simple Mock',
			path: '/api/simple',
			method: 'GET',
			statusCode: 200,
			response: '{}',
			folderId: 'folder-123',
		};
		const req = new NextRequest('http://localhost:3000/api/mocks', {
			method: 'POST',
			body: JSON.stringify(payload),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(201);
		// queryParams is null when not set (DB default for nullable jsonb)
		expect(body.queryParams).toBeNull();
	});

	it('PUT updates queryParams', async () => {
		const payload = {
			queryParams: { status: 'banned', role: 'admin' },
		};
		const req = new NextRequest('http://localhost:3000/api/mocks?id=mock-123', {
			method: 'PUT',
			body: JSON.stringify(payload),
		});

		const res = await PUT(req);
		expect(res.status).toBe(200);
	});

	it('PUT clears queryParams when set to null', async () => {
		const payload = {
			queryParams: null,
		};
		const req = new NextRequest('http://localhost:3000/api/mocks?id=mock-123', {
			method: 'PUT',
			body: JSON.stringify(payload),
		});

		const res = await PUT(req);
		expect(res.status).toBe(200);
	});
});
