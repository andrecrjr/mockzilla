import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { NextRequest } from 'next/server';

const folderId = '11111111-1111-4111-8111-111111111111';
const subfolderId = '22222222-2222-4222-8222-222222222222';

const mockSubfolder = {
	id: subfolderId,
	folderId,
	parentId: null,
	name: 'Users',
	slug: 'users',
	mainPath: '/users',
	createdAt: new Date('2024-01-01'),
	updatedAt: null,
};

const childSubfolder = {
	id: '33333333-3333-4333-8333-333333333333',
	folderId,
	parentId: subfolderId,
	name: 'Details',
	slug: 'details',
	mainPath: '/users/details',
	createdAt: new Date('2024-01-01'),
	updatedAt: null,
};

const staleChildSubfolder = {
	...childSubfolder,
	mainPath: '/details',
};

const createMockBuilder = (resolvedValue: unknown) => {
	const builder = {
		from: mock(() => builder),
		where: mock(() => builder),
		orderBy: mock(() => builder),
		limit: mock(() => builder),
		values: mock(() => builder),
		set: mock(() => builder),
		returning: mock(() => builder),
		then: (resolve: (val: unknown) => void) => resolve(resolvedValue),
	} as unknown as {
		from: (val: unknown) => unknown;
		where: (val: unknown) => unknown;
		orderBy: (val: unknown) => unknown;
		limit: (val: unknown) => unknown;
		values: (val: unknown) => unknown;
		set: (val: unknown) => unknown;
		returning: (val: unknown) => unknown;
		then: (resolve: (val: unknown) => void) => void;
	};
	return builder;
};

let selectResults: unknown[][] = [];

const mockDb = {
	select: mock((args?: { count: unknown }) => {
		if (args?.count) {
			return createMockBuilder(selectResults.shift() ?? [{ count: 0 }]);
		}
		return createMockBuilder(selectResults.shift() ?? []);
	}),
	insert: mock(() => createMockBuilder([mockSubfolder])),
	update: mock(() => createMockBuilder([mockSubfolder])),
	delete: mock(() => createMockBuilder([])),
	transaction: mock(async (callback: (tx: typeof mockDb) => Promise<unknown>) =>
		callback(mockDb),
	),
};

mock.module('@/lib/db', () => ({ db: mockDb }));

import { DELETE, GET, POST, PUT } from '../../app/api/mock-subfolders/route';

describe('API /api/mock-subfolders', () => {
	beforeEach(() => {
		selectResults = [];
		mockDb.select = mock((args?: { count: unknown }) => {
			if (args?.count) {
				return createMockBuilder(selectResults.shift() ?? [{ count: 0 }]);
			}
			return createMockBuilder(selectResults.shift() ?? []);
		});
		mockDb.insert = mock(() => createMockBuilder([mockSubfolder]));
		mockDb.update = mock(() => createMockBuilder([mockSubfolder]));
		mockDb.delete = mock(() => createMockBuilder([]));
		mockDb.transaction = mock(
			async (callback: (tx: typeof mockDb) => Promise<unknown>) =>
				callback(mockDb),
		);
	});

	it('lists subfolders for a folder and parent', async () => {
		selectResults = [[mockSubfolder]];
		const req = new NextRequest(
			`http://localhost:3000/api/mock-subfolders?folderId=${folderId}&parentId=root`,
		);

		const res = await GET(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body).toHaveLength(1);
		expect(body[0].mainPath).toBe('/users');
	});

	it('returns canonical nested paths when stored main paths are stale', async () => {
		selectResults = [[mockSubfolder, staleChildSubfolder]];
		const req = new NextRequest(
			`http://localhost:3000/api/mock-subfolders?folderId=${folderId}&all=true`,
		);

		const res = await GET(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.map((row: { mainPath: string }) => row.mainPath)).toEqual([
			'/users',
			'/users/details',
		]);
	});

	it('creates a root subfolder with a slug-derived main path', async () => {
		selectResults = [[]];
		const req = new NextRequest('http://localhost:3000/api/mock-subfolders', {
			method: 'POST',
			body: JSON.stringify({
				folderId,
				name: 'Users',
			}),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(201);
		expect(body.slug).toBe('users');
		expect(body.mainPath).toBe('/users');
	});

	it('creates a child subfolder under the parent main path', async () => {
		selectResults = [[mockSubfolder]];
		mockDb.insert = mock(() => createMockBuilder([childSubfolder]));
		const req = new NextRequest('http://localhost:3000/api/mock-subfolders', {
			method: 'POST',
			body: JSON.stringify({
				folderId,
				parentId: subfolderId,
				name: 'Details',
			}),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(201);
		expect(body.mainPath).toBe('/users/details');
	});

	it('rejects duplicate sibling names', async () => {
		selectResults = [[mockSubfolder]];
		const req = new NextRequest('http://localhost:3000/api/mock-subfolders', {
			method: 'POST',
			body: JSON.stringify({
				folderId,
				name: 'Users',
			}),
		});

		const res = await POST(req);

		expect(res.status).toBe(409);
	});

	it('updates a subfolder name and derived main path', async () => {
		const updatedSubfolder = {
			...mockSubfolder,
			name: 'Accounts',
			slug: 'accounts',
			mainPath: '/accounts',
		};
		selectResults = [[mockSubfolder], [mockSubfolder]];
		mockDb.update = mock(() => createMockBuilder([updatedSubfolder]));
		const req = new NextRequest(
			`http://localhost:3000/api/mock-subfolders?id=${subfolderId}`,
			{
				method: 'PUT',
				body: JSON.stringify({ name: 'Accounts' }),
			},
		);

		const res = await PUT(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.mainPath).toBe('/accounts');
	});

	it('renaming a parent recomputes descendant main paths', async () => {
		const updatedSubfolder = {
			...mockSubfolder,
			name: 'Accounts',
			slug: 'accounts',
			mainPath: '/accounts',
		};
		selectResults = [[mockSubfolder], [mockSubfolder, childSubfolder]];
		mockDb.update = mock(() => createMockBuilder([updatedSubfolder]));
		const req = new NextRequest(
			`http://localhost:3000/api/mock-subfolders?id=${subfolderId}`,
			{
				method: 'PUT',
				body: JSON.stringify({ name: 'Accounts' }),
			},
		);

		const res = await PUT(req);

		expect(res.status).toBe(200);
		expect(mockDb.update).toHaveBeenCalledTimes(2);
		expect(mockDb.update.mock.calls[1]).toBeDefined();
	});

	it('rejects moving a subfolder under its descendant', async () => {
		selectResults = [[mockSubfolder], [mockSubfolder, childSubfolder]];
		const req = new NextRequest(
			`http://localhost:3000/api/mock-subfolders?id=${subfolderId}`,
			{
				method: 'PUT',
				body: JSON.stringify({ parentId: childSubfolder.id }),
			},
		);

		const res = await PUT(req);

		expect(res.status).toBe(400);
	});

	it('blocks deleting non-empty subfolders', async () => {
		selectResults = [[{ count: 1 }], [{ count: 0 }]];
		const req = new NextRequest(
			`http://localhost:3000/api/mock-subfolders?id=${subfolderId}`,
			{ method: 'DELETE' },
		);

		const res = await DELETE(req);

		expect(res.status).toBe(409);
	});
});
