import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { NextRequest } from 'next/server';

const mockMockData = {
	id: 'mock-123',
	name: 'Test Mock',
	endpoint: '/api/test',
	method: 'GET',
	folderId: 'folder-123',
	response: '{"data": "test"}',
	statusCode: 200,
	matchType: 'exact',
	bodyType: 'json',
	enabled: true,
	createdAt: new Date('2024-01-01'),
	updatedAt: new Date('2024-01-01'),
};

// Chainable mock builder
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

const mockDb = {
	select: mock((args: { count: unknown } | null) => {
		if (args?.count) {
			return createMockBuilder([{ count: 5 }]);
		}
		return createMockBuilder(mockResolvedValue);
	}),
	insert: mock(() => createMockBuilder([mockMockData])),
	update: mock(() => createMockBuilder([mockMockData])),
	delete: mock(() => createMockBuilder([])),
};

mock.module('@/lib/db', () => ({ db: mockDb }));

import { DELETE, GET, POST, PUT } from '../../app/api/mocks/route';

describe('API /api/mocks', () => {
	beforeEach(() => {
		mockResolvedValue = [mockMockData];
	});

	it('GET (by folderId) returns mocks', async () => {
		const req = new NextRequest(
			'http://localhost:3000/api/mocks?folderId=folder-123',
		);

		const res = await GET(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.data).toBeArray();
		expect(body.data[0].id).toBe('mock-123');
		expect(body.meta.total).toBe(5);
	});

	it('GET (by id) returns single mock', async () => {
		const req = new NextRequest('http://localhost:3000/api/mocks?id=mock-123');

		const res = await GET(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.id).toBe('mock-123');
	});

	it('POST creates a mock', async () => {
		const payload = {
			name: 'New Mock',
			path: '/new',
			method: 'POST',
			statusCode: 201,
			response: '{}',
			folderId: 'folder-123',
		};
		const req = new NextRequest('http://localhost:3000/api/mocks', {
			method: 'POST',
			body: JSON.stringify(payload),
		});

		const res = await POST(req);
		const _body = await res.json();

		expect(res.status).toBe(201);
		expect(mockDb.insert).toHaveBeenCalled();
	});

	it('PUT updates a mock', async () => {
		const payload = { name: 'Updated Mock' };
		const req = new NextRequest('http://localhost:3000/api/mocks?id=mock-123', {
			method: 'PUT',
			body: JSON.stringify(payload),
		});

		const res = await PUT(req);
		expect(res.status).toBe(200);
		expect(mockDb.update).toHaveBeenCalled();
	});

	it('GET (without folderId) returns all mocks', async () => {
		const req = new NextRequest('http://localhost:3000/api/mocks');
		const res = await GET(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.data).toBeArray();
	});

	it('GET (by id) returns 404 if not found', async () => {
		mockResolvedValue = [];
		const req = new NextRequest('http://localhost:3000/api/mocks?id=none');
		const res = await GET(req);
		expect(res.status).toBe(404);
	});

	it('PUT returns 400 if ID is missing', async () => {
		const req = new NextRequest('http://localhost:3000/api/mocks', {
			method: 'PUT',
			body: '{}',
		});
		const res = await PUT(req);
		expect(res.status).toBe(400);
	});

	it('PUT returns 404 if mock not found', async () => {
		mockDb.update = mock(() => createMockBuilder([])); // Mock update returns nothing
		const req = new NextRequest('http://localhost:3000/api/mocks?id=999', {
			method: 'PUT',
			body: '{}',
		});
		const res = await PUT(req);
		expect(res.status).toBe(404);
		// Restore default
		mockDb.update = mock(() => createMockBuilder([mockMockData]));
	});

	it('DELETE returns 400 if ID is missing', async () => {
		const req = new NextRequest('http://localhost:3000/api/mocks', {
			method: 'DELETE',
		});
		const res = await DELETE(req);
		expect(res.status).toBe(400);
	});

	it('GET returns 500 on error', async () => {
		mockDb.select = mock(() => { throw new Error('fail'); });
		const res = await GET(new NextRequest('http://localhost:3000/api/mocks'));
		expect(res.status).toBe(500);
		mockDb.select = mock((args) => args?.count ? createMockBuilder([{ count: 5 }]) : createMockBuilder(mockResolvedValue));
	});

	it('POST returns 500 on error', async () => {
		mockDb.insert = mock(() => { throw new Error('fail'); });
		const res = await POST(new NextRequest('http://localhost:3000/api/mocks', { method: 'POST', body: '{}' }));
		expect(res.status).toBe(500);
		mockDb.insert = mock(() => createMockBuilder([mockMockData]));
	});

	it('PUT returns 500 on error', async () => {
		mockDb.update = mock(() => { throw new Error('fail'); });
		const res = await PUT(new NextRequest('http://localhost:3000/api/mocks?id=1', { method: 'PUT', body: '{}' }));
		expect(res.status).toBe(500);
		mockDb.update = mock(() => createMockBuilder([mockMockData]));
	});

	it('DELETE returns 500 on error', async () => {
		mockDb.delete = mock(() => { throw new Error('fail'); });
		const res = await DELETE(new NextRequest('http://localhost:3000/api/mocks?id=1', { method: 'DELETE' }));
		expect(res.status).toBe(500);
		mockDb.delete = mock(() => createMockBuilder([]));
	});
});
