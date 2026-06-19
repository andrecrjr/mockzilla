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
	mainPath: '/v1/users',
	createdAt: new Date('2024-01-01'),
	updatedAt: null,
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
		expect(body[0].mainPath).toBe('/v1/users');
	});

	it('creates a subfolder with normalized main path', async () => {
		selectResults = [[], []];
		const req = new NextRequest('http://localhost:3000/api/mock-subfolders', {
			method: 'POST',
			body: JSON.stringify({
				folderId,
				name: 'Users',
				mainPath: 'v1/users/',
			}),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(201);
		expect(body.slug).toBe('users');
		expect(mockDb.insert).toHaveBeenCalled();
	});

	it('rejects duplicate sibling names', async () => {
		selectResults = [[mockSubfolder]];
		const req = new NextRequest('http://localhost:3000/api/mock-subfolders', {
			method: 'POST',
			body: JSON.stringify({
				folderId,
				name: 'Users',
				mainPath: '/v2/users',
			}),
		});

		const res = await POST(req);

		expect(res.status).toBe(409);
	});

	it('updates a subfolder main path', async () => {
		selectResults = [[mockSubfolder], [], []];
		const req = new NextRequest(
			`http://localhost:3000/api/mock-subfolders?id=${subfolderId}`,
			{
				method: 'PUT',
				body: JSON.stringify({ mainPath: '/v2/users/' }),
			},
		);

		const res = await PUT(req);

		expect(res.status).toBe(200);
		expect(mockDb.update).toHaveBeenCalled();
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
