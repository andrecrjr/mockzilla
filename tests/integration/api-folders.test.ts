import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { NextRequest } from 'next/server';

// 1. Define mock data
const mockFolder = {
	id: '123',
	name: 'Test Folder',
	slug: 'test-folder',
	description: 'Description',
	createdAt: new Date('2024-01-01'),
	updatedAt: new Date('2024-01-01'),
};

// 2. Define the chainable mock builder
const createMockBuilder = (resolvedValue: unknown) => {
	const builder = {
		// Chainable methods return the builder itself
		from: mock(() => builder),
		where: mock(() => builder),
		orderBy: mock(() => builder),
		limit: mock(() => builder),
		offset: mock(() => builder),
		values: mock(() => builder),
		set: mock(() => builder),
		returning: mock(() => builder),

		// Make it thenable to simulate a Promise
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

// Default response is array of folders, but we might need to vary it
let mockResolvedValue: unknown[] = [mockFolder];

const mockDb = {
	select: mock((args: { count: unknown } | null) => {
		// If args present (count query), return count mock
		if (args?.count) {
			return createMockBuilder([{ count: 10 }]);
		}
		return createMockBuilder(mockResolvedValue);
	}),
	insert: mock(() => createMockBuilder([mockFolder])),
	update: mock(() => createMockBuilder([mockFolder])),
	delete: mock(() => createMockBuilder([])),
};

// 3. Mock the module
mock.module('@/lib/db', () => ({
	db: mockDb,
}));

// 4. Import the route handler (must be AFTER mock.module)
import { DELETE, GET, POST, PUT } from '../../app/api/folders/route';

describe('API /api/folders', () => {
	beforeEach(() => {
		// Reset default
		mockResolvedValue = [mockFolder];
	});

	it('GET (all=true) returns all folders', async () => {
		const req = new NextRequest('http://localhost:3000/api/folders?all=true');
		const res = await GET(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body).toBeArray();
		expect(body[0].slug).toBe('test-folder');
		expect(mockDb.select).toHaveBeenCalled();
	});

	it('GET (pagination) returns paginated result', async () => {
		const req = new NextRequest(
			'http://localhost:3000/api/folders?page=1&limit=5',
		);
		const res = await GET(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.data).toBeArray();
		expect(body.meta.total).toBe(10);
	});

	it('GET (slug) returns specific folder', async () => {
		const req = new NextRequest(
			'http://localhost:3000/api/folders?slug=test-folder',
		);

		// Mock returning found folder
		mockResolvedValue = [{ ...mockFolder, slug: 'test-folder' }];

		const res = await GET(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.slug).toBe('test-folder');
	});

	it('GET (slug) returns 404 if not found', async () => {
		const req = new NextRequest(
			'http://localhost:3000/api/folders?slug=unknown',
		);

		mockResolvedValue = []; // No folder found

		const res = await GET(req);
		const body = await res.json();

		expect(res.status).toBe(404);
		expect(body.error).toBe('Folder not found');
	});

	it('POST creates a new folder', async () => {
		mockResolvedValue = []; // Ensure uniqueness check passes
		const payload = { name: 'New Folder', description: 'Desc' };
		const req = new NextRequest('http://localhost:3000/api/folders', {
			method: 'POST',
			body: JSON.stringify(payload),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(201);
		expect(body.name).toBe('Test Folder'); // Note: mockDb.insert returns mockFolder in setup
		expect(mockDb.insert).toHaveBeenCalled();
	});

	it('PUT updates a folder', async () => {
		const payload = { name: 'Updated Name', description: 'Updated Desc' };
		const req = new NextRequest('http://localhost:3000/api/folders?id=123', {
			method: 'PUT',
			body: JSON.stringify(payload),
		});

		const res = await PUT(req);
		const _body = await res.json();

		expect(res.status).toBe(200);
		expect(mockDb.update).toHaveBeenCalled();
	});

	it('GET (type=standard/extension) filters folders', async () => {
		const reqExt = new NextRequest('http://localhost:3000/api/folders?all=true&type=extension');
		mockResolvedValue = [{ ...mockFolder, slug: 'ext', meta: { extensionSyncData: {} } }];
		const resExt = await GET(reqExt);
		const dataExt = await resExt.json();
		expect(dataExt).toHaveLength(1);

		const reqStd = new NextRequest('http://localhost:3000/api/folders?all=true&type=standard');
		mockResolvedValue = [{ ...mockFolder, slug: 'std' }];
		const resStd = await GET(reqStd);
		const dataStd = await resStd.json();
		expect(dataStd).toHaveLength(1);
	});

	it('POST returns 400 for invalid slug', async () => {
		const req = new NextRequest('http://localhost:3000/api/folders', {
			method: 'POST',
			body: JSON.stringify({ name: 'Invalid', slug: '---' }), // generateSlug will return '---' or something that validateSlug rejects
		});
		const res = await POST(req);
		expect(res.status).toBe(400);
	});

	it('POST returns 409 if slug already exists', async () => {
		mockResolvedValue = [mockFolder]; // Slug exists
		const req = new NextRequest('http://localhost:3000/api/folders', {
			method: 'POST',
			body: JSON.stringify({ name: 'New', slug: 'test-folder' }),
		});
		const res = await POST(req);
		expect(res.status).toBe(409);
	});

	it('PUT returns 400 if ID is missing', async () => {
		const req = new NextRequest('http://localhost:3000/api/folders', {
			method: 'PUT',
			body: '{}',
		});
		const res = await PUT(req);
		expect(res.status).toBe(400);
	});

	it('POST returns 400 for empty slug', async () => {
		mockResolvedValue = []; // Ensure no conflicts
		const req = new NextRequest('http://localhost:3000/api/folders', {
			method: 'POST',
			body: JSON.stringify({ name: '', slug: '' }), // Both empty will result in empty slug
		});
		const res = await POST(req);
		expect(res.status).toBe(400);
	});

	it('POST returns 400 for too long slug', async () => {
		const req = new NextRequest('http://localhost:3000/api/folders', {
			method: 'POST',
			body: JSON.stringify({ name: 'Long', slug: 'a'.repeat(101) }),
		});
		const res = await POST(req);
		expect(res.status).toBe(400);
	});

	it('POST returns 400 for slug starting/ending with hyphen', async () => {
		const req = new NextRequest('http://localhost:3000/api/folders', {
			method: 'POST',
			body: JSON.stringify({ name: 'Hyphen', slug: '-invalid-' }),
		});
		const res = await POST(req);
		expect(res.status).toBe(400);
	});

	it('PUT returns 409 if custom slug already exists (other record)', async () => {
		mockResolvedValue = [mockFolder]; // Simulate another folder has this slug
		const req = new NextRequest('http://localhost:3000/api/folders?id=other-id', {
			method: 'PUT',
			body: JSON.stringify({ name: 'New Name', slug: 'test-folder' }),
		});
		const res = await PUT(req);
		expect(res.status).toBe(409);
	});

	it('PUT updates slug if name changed', async () => {
		mockResolvedValue = [{ ...mockFolder, id: '123' }];
		const req = new NextRequest('http://localhost:3000/api/folders?id=123', {
			method: 'PUT',
			body: JSON.stringify({ name: 'Brand New Name' }),
		});
		const res = await PUT(req);
		expect(res.status).toBe(200);
	});

	it('GET returns 500 on database error', async () => {
		mockDb.select = mock(() => {
			throw new Error('DB Error');
		});
		const req = new NextRequest('http://localhost:3000/api/folders');
		const res = await GET(req);
		expect(res.status).toBe(500);
		// Restore mock
		mockDb.select = mock(() => createMockBuilder(mockResolvedValue));
	});

	it('DELETE returns 400 if ID is missing', async () => {
		const req = new NextRequest('http://localhost:3000/api/folders', {
			method: 'DELETE',
		});
		const res = await DELETE(req);
		expect(res.status).toBe(400);
	});

	it('POST returns 500 on error', async () => {
		mockResolvedValue = []; // No conflicts
		mockDb.insert = mock(() => { throw new Error('fail'); });
		const res = await POST(new NextRequest('http://localhost:3000/api/folders', { method: 'POST', body: '{"name":"f"}' }));
		expect(res.status).toBe(500);
		mockDb.insert = mock(() => createMockBuilder([mockFolder]));
	});

	it('PUT returns 500 on error', async () => {
		mockDb.update = mock(() => { throw new Error('fail'); });
		const res = await PUT(new NextRequest('http://localhost:3000/api/folders?id=1', { method: 'PUT', body: '{"name":"f"}' }));
		expect(res.status).toBe(500);
		mockDb.update = mock(() => createMockBuilder([mockFolder]));
	});

	it('PUT returns 404 if folder not found', async () => {
		mockDb.select = mock(() => createMockBuilder([])); // Phase 0: Lookup fails
		const req = new NextRequest('http://localhost:3000/api/folders?id=999', {
			method: 'PUT',
			body: '{}',
		});
		const res = await PUT(req);
		expect(res.status).toBe(404);
		// Restore default
		mockDb.select = mock((args: { count: unknown } | null) => {
			if (args?.count) return createMockBuilder([{ count: 10 }]);
			return createMockBuilder(mockResolvedValue);
		});
	});

	it('PUT returns 400 for invalid custom slug', async () => {
		mockResolvedValue = [{ ...mockFolder }];
		const req = new NextRequest('http://localhost:3000/api/folders?id=123', {
			method: 'PUT',
			body: JSON.stringify({ slug: '---' }),
		});
		const res = await PUT(req);
		expect(res.status).toBe(400);
	});

	it('PUT returns 409 if custom slug already exists (excluding self)', async () => {
		// Mock existingFolder lookup (first select) returns mockFolder with id 123
		// Mock isSlugUnique lookup (second select) returns existing other folder
		let callCount = 0;
		mockDb.select = mock(() => {
			callCount++;
			if (callCount === 1) return createMockBuilder([{ ...mockFolder, id: '123' }]);
			if (callCount === 2) return createMockBuilder([{ ...mockFolder, id: '456' }]); // Another folder exists
			return createMockBuilder([]);
		});
		
		const req = new NextRequest('http://localhost:3000/api/folders?id=123', {
			method: 'PUT',
			body: JSON.stringify({ slug: 'existing-other' }),
		});
		const res = await PUT(req);
		expect(res.status).toBe(409);
		
		// Restore
		mockDb.select = mock((args: { count: unknown } | null) => {
			if (args?.count) return createMockBuilder([{ count: 10 }]);
			return createMockBuilder(mockResolvedValue);
		});
	});

	it('DELETE returns 500 on error', async () => {
		mockDb.delete = mock(() => { throw new Error('fail'); });
		const res = await DELETE(new NextRequest('http://localhost:3000/api/folders?id=1', { method: 'DELETE' }));
		expect(res.status).toBe(500);
		mockDb.delete = mock(() => createMockBuilder([]));
	});
});
