import { beforeEach, describe, expect, it, mock } from 'bun:test';

type Row = Record<string, unknown>;

const baseRow: Row = {
	id: 'mock-1',
	name: 'Users',
	endpoint: '/users',
	method: 'GET',
	statusCode: 200,
	response: '{"stored":true}',
	folderId: 'folder-1',
	mockFolderId: null,
	matchType: 'exact',
	bodyType: 'json',
	enabled: true,
	queryParams: null,
	variants: null,
	wildcardRequireMatch: false,
	jsonSchema: null,
	useDynamicResponse: false,
	echoRequestBody: false,
	delay: 0,
	meta: {},
	createdAt: new Date('2026-01-01'),
	updatedAt: null,
};

/** Results handed out to successive select() calls. */
let selectQueue: unknown[][] = [];
let insertedValues: Row | undefined;
let updatedValues: Row | undefined;
let storedRow: Row = { ...baseRow };

const chain = (result: () => unknown) => {
	const builder: Record<string, unknown> = {};
	for (const method of ['from', 'where', 'limit', 'orderBy', 'offset']) {
		builder[method] = mock(() => builder);
	}
	builder.then = (resolve: (value: unknown) => void) => resolve(result());
	return builder;
};

const mockDb = {
	select: mock(() => {
		const next = selectQueue.shift() ?? [];
		return chain(() => next);
	}),
	insert: mock(() => ({
		values: (values: Row) => {
			insertedValues = values;
			return {
				returning: () =>
					chain(() => [{ ...baseRow, ...values, endpoint: values.endpoint }]),
			};
		},
	})),
	update: mock(() => ({
		set: (values: Row) => {
			updatedValues = values;
			return {
				where: () => ({
					returning: () => chain(() => [{ ...storedRow, ...values }]),
				}),
			};
		},
	})),
};

mock.module('@/lib/db', () => ({ db: mockDb }));

// manage_mocks `update` is partial (only `id` is required), unlike the
// standalone UpdateMockArgs schema the handler signature uses.
type PartialUpdate = { id: string } & Record<string, unknown>;
const asUpdateArgs = (args: PartialUpdate) =>
	args as unknown as Parameters<typeof callUpdateMock>[0];

const { callCreateMock, callGetMock, callPreviewMock, callUpdateMock } =
	await import('../../lib/mcp/handlers');

describe('MCP manage_mocks proxy settings', () => {
	beforeEach(() => {
		selectQueue = [];
		insertedValues = undefined;
		updatedValues = undefined;
		storedRow = { ...baseRow };
	});

	it('create stores proxy settings in meta and masks credentials in the reply', async () => {
		const result = await callCreateMock({
			name: 'Users',
			path: '/users',
			method: 'GET',
			statusCode: 200,
			folderId: 'folder-1',
			response: '{}',
			proxy: {
				targetUrl: 'https://api.example.com/users',
				headers: { Authorization: 'Bearer secret' },
				queryParams: { v: '2' },
			},
		});

		expect(insertedValues?.meta).toEqual({
			proxyTargetUrl: 'https://api.example.com/users',
			proxyHeaders: { Authorization: 'Bearer secret' },
			proxyQueryParams: { v: '2' },
		});
		expect(result.proxy).toEqual({
			targetUrl: 'https://api.example.com/users',
			headers: { Authorization: '***' },
			queryParams: { v: '2' },
			forwardHeaders: true,
		});
		expect(JSON.stringify(result)).not.toContain('Bearer secret');
		expect(result.recorded).toBe(false);
	});

	it('create rejects invalid proxy settings before inserting', async () => {
		await expect(
			callCreateMock({
				name: 'Users',
				path: '/users',
				method: 'GET',
				statusCode: 200,
				folderId: 'folder-1',
				response: '{}',
				proxy: { targetUrl: 'api.example.com' },
			}),
		).rejects.toThrow('http://');
		expect(insertedValues).toBeUndefined();
	});

	it('update merges proxy settings and keeps a stored secret sent back as ***', async () => {
		storedRow = {
			...baseRow,
			meta: {
				proxyTargetUrl: 'https://api.example.com/users',
				proxyHeaders: { Authorization: 'Bearer secret' },
				recordedNote: 'keep',
			},
		};
		selectQueue = [[storedRow]];

		const result = await callUpdateMock(
			asUpdateArgs({
				id: 'mock-1',
				proxy: { headers: { Authorization: '***', 'X-Trace': 'on' } },
			}),
		);

		expect(updatedValues?.meta).toEqual({
			proxyTargetUrl: 'https://api.example.com/users',
			proxyHeaders: { Authorization: 'Bearer secret', 'X-Trace': 'on' },
			recordedNote: 'keep',
		});
		expect(result?.proxy?.headers).toEqual({
			Authorization: '***',
			'X-Trace': 'on',
		});
	});

	it('update without proxy leaves meta untouched', async () => {
		const meta = { proxyTargetUrl: 'https://api.example.com/users' };
		storedRow = { ...baseRow, meta };
		selectQueue = [[storedRow]];

		await callUpdateMock(asUpdateArgs({ id: 'mock-1', name: 'Renamed' }));

		expect(updatedValues?.meta).toEqual(meta);
	});

	it('get reports recordings', async () => {
		selectQueue = [
			[
				{
					...baseRow,
					name: 'Recorded: GET /users',
					meta: { recordedFrom: 'p' },
				},
			],
		];

		const result = await callGetMock({ id: 'mock-1' });

		expect(result?.recorded).toBe(true);
		expect(result?.proxy).toBeNull();
	});

	it('preview of a proxy mock reports the upstream instead of the stored body', async () => {
		selectQueue = [
			[{ id: 'folder-1', slug: '/demo' }],
			[
				{
					...baseRow,
					meta: {
						proxyTargetUrl: 'https://api.example.com/users',
						proxyHeaders: { Authorization: 'Bearer secret' },
						proxyQueryParams: { api_key: 'K' },
					},
				},
			],
			[],
		];

		const result = await callPreviewMock({
			folderSlug: '/demo',
			path: '/users',
			method: 'GET',
			queryParams: { page: '2' },
		});

		expect(result.body).toMatchObject({
			proxied: true,
			matchedMockId: 'mock-1',
			upstreamUrl: 'https://api.example.com/users?page=2&api_key=***',
			upstreamHeaders: { Authorization: '***' },
			forwardCallerHeaders: true,
		});
		expect(JSON.stringify(result)).not.toContain('secret');
		expect(JSON.stringify(result)).not.toContain('"stored"');
	});
});
