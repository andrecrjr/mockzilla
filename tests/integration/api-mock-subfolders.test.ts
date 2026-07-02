import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { NextRequest } from 'next/server';

const folderId = '11111111-1111-4111-8111-111111111111';
const subfolderId = '22222222-2222-4222-8222-222222222222';
const folder = {
	id: folderId,
	name: 'Ticket Management',
	slug: 'ticket-management',
	description: null,
	meta: {},
	createdAt: new Date('2024-01-01'),
	updatedAt: null,
};

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

import {
	DELETE,
	GET,
	PATCH,
	POST,
	PUT,
} from '../../app/api/mock-subfolders/route';

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

	it('creates a root subfolder with a custom slug path', async () => {
		const customSlugSubfolder = {
			...mockSubfolder,
			slug: 'people',
			mainPath: '/people',
		};
		selectResults = [[], [folder]];
		mockDb.insert = mock(() => createMockBuilder([customSlugSubfolder]));
		const req = new NextRequest('http://localhost:3000/api/mock-subfolders', {
			method: 'POST',
			body: JSON.stringify({
				folderId,
				name: 'Users',
				slug: 'People',
			}),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(201);
		expect(body.slug).toBe('people');
		expect(body.mainPath).toBe('/people');
	});

	it('creates a child subfolder under the parent main path', async () => {
		selectResults = [[mockSubfolder], [folder]];
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

	it('rejects duplicate sibling slugs', async () => {
		selectResults = [[mockSubfolder], [folder]];
		const req = new NextRequest('http://localhost:3000/api/mock-subfolders', {
			method: 'POST',
			body: JSON.stringify({
				folderId,
				name: 'People',
				slug: 'Users',
			}),
		});

		const res = await POST(req);

		expect(res.status).toBe(409);
	});

	it('updates a subfolder name without changing its slug path', async () => {
		const updatedSubfolder = {
			...mockSubfolder,
			name: 'Accounts',
		};
		selectResults = [[mockSubfolder], [folder], [mockSubfolder]];
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
		expect(body.slug).toBe('users');
		expect(body.mainPath).toBe('/users');
	});

	it('updates a subfolder slug and derived main path', async () => {
		const updatedSubfolder = {
			...mockSubfolder,
			name: 'Users',
			slug: 'accounts',
			mainPath: '/accounts',
		};
		selectResults = [[mockSubfolder], [folder], [mockSubfolder]];
		mockDb.update = mock(() => createMockBuilder([updatedSubfolder]));
		const req = new NextRequest(
			`http://localhost:3000/api/mock-subfolders?id=${subfolderId}`,
			{
				method: 'PUT',
				body: JSON.stringify({ slug: 'Accounts' }),
			},
		);

		const res = await PUT(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.slug).toBe('accounts');
		expect(body.mainPath).toBe('/accounts');
	});

	it('changing a parent slug recomputes descendant main paths', async () => {
		const updatedSubfolder = {
			...mockSubfolder,
			name: 'Accounts',
			slug: 'accounts',
			mainPath: '/accounts',
		};
		selectResults = [[mockSubfolder], [folder], [mockSubfolder, childSubfolder]];
		mockDb.update = mock(() => createMockBuilder([updatedSubfolder]));
		const req = new NextRequest(
			`http://localhost:3000/api/mock-subfolders?id=${subfolderId}`,
			{
				method: 'PUT',
				body: JSON.stringify({ name: 'Accounts', slug: 'Accounts' }),
			},
		);

		const res = await PUT(req);

		expect(res.status).toBe(200);
		expect(mockDb.update).toHaveBeenCalledTimes(2);
		expect(mockDb.update.mock.calls[1]).toBeDefined();
	});

	it('rejects moving a subfolder under its descendant', async () => {
		selectResults = [[mockSubfolder], [folder], [mockSubfolder, childSubfolder]];
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

	it('creates a root subfolder from a full public path slug', async () => {
		const createdSubfolder = {
			...mockSubfolder,
			name: 'App',
			slug: 'app',
			mainPath: '/app',
		};
		selectResults = [[], [folder]];
		mockDb.insert = mock(() => createMockBuilder([createdSubfolder]));
		const req = new NextRequest('http://localhost:3000/api/mock-subfolders', {
			method: 'POST',
			body: JSON.stringify({
				folderId,
				name: 'App',
				slug: '/api/mock/ticket-management/app',
			}),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(201);
		expect(body.slug).toBe('app');
		expect(body.mainPath).toBe('/app');
	});

	it('updates a child subfolder from a full public path slug', async () => {
		const parentSubfolder = {
			...mockSubfolder,
			name: 'App',
			slug: 'app',
			mainPath: '/app',
		};
		const existingChild = {
			...childSubfolder,
			name: 'Ticket Type',
			slug: 'ticket-type',
			mainPath: '/app/ticket-type',
		};
		const updatedChild = {
			...existingChild,
			slug: 'ticket-type-updated',
			mainPath: '/app/ticket-type-updated',
		};
		selectResults = [[existingChild], [folder], [parentSubfolder, existingChild]];
		mockDb.update = mock(() => createMockBuilder([updatedChild]));
		const req = new NextRequest(
			`http://localhost:3000/api/mock-subfolders?id=${existingChild.id}`,
			{
				method: 'PUT',
				body: JSON.stringify({
					slug: '/api/mock/ticket-management/app/ticket-type-updated',
				}),
			},
		);

		const res = await PUT(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.slug).toBe('ticket-type-updated');
		expect(body.mainPath).toBe('/app/ticket-type-updated');
	});

	it('patches a child subfolder from a full public path slug', async () => {
		const parentSubfolder = {
			...mockSubfolder,
			name: 'App',
			slug: 'app',
			mainPath: '/app',
		};
		const existingChild = {
			...childSubfolder,
			name: 'Ticket Type',
			slug: 'ticket-type',
			mainPath: '/app/ticket-type',
		};
		const updatedChild = {
			...existingChild,
			slug: 'ticket-type-patched',
			mainPath: '/app/ticket-type-patched',
		};
		selectResults = [[existingChild], [folder], [parentSubfolder, existingChild]];
		mockDb.update = mock(() => createMockBuilder([updatedChild]));
		const req = new NextRequest(
			`http://localhost:3000/api/mock-subfolders?id=${existingChild.id}`,
			{
				method: 'PATCH',
				body: JSON.stringify({
					slug: '/api/mock/ticket-management/app/ticket-type-patched',
				}),
			},
		);

		const res = await PATCH(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.slug).toBe('ticket-type-patched');
		expect(body.mainPath).toBe('/app/ticket-type-patched');
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
