import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { formatCliError } from '../../cli/errors.mjs';
import { run } from '../../cli/main.mjs';

interface CliOutput {
	stdout: string[];
	stderr: string[];
}

interface CliOptions {
	configPath?: string;
	input?: string;
	env?: Record<string, string | undefined>;
	fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

function output(): CliOutput {
	return { stdout: [], stderr: [] };
}

function options(
	result: CliOutput,
	overrides: CliOptions = {},
): CliOptions & {
	stdout: (value: string) => void;
	stderr: (value: string) => void;
} {
	return {
		...overrides,
		stdout: (value) => result.stdout.push(value),
		stderr: (value) => result.stderr.push(value),
	};
}

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe('mockzilla CLI', () => {
	it('renders the CLI agent skill as markdown', async () => {
		const result = output();

		const exitCode = await run(['agent-skill'], options(result));

		expect(exitCode).toBe(0);
		expect(result.stderr).toEqual([]);
		expect(result.stdout.join('')).toContain('name: mockzilla-cli');
		expect(result.stdout.join('')).toContain('mockzilla mocks create');
		expect(result.stdout.join('')).toContain('mockzilla update check');
		expect(result.stdout.join('')).toContain('Standard workflow');
		expect(result.stdout.join('')).toContain('Diagnose a mismatch');
	});

	it('ends human errors with an agent discovery hint', () => {
		const message = formatCliError(new Error('server unavailable'), false);

		expect(message.trimEnd()).toEndWith(
			'Agent guidance: run `mockzilla agent-skill` for Mockzilla CLI instructions.',
		);
	});

	it('keeps the agent hint machine-readable for JSON errors', () => {
		const message = formatCliError(new Error('server unavailable'), true);
		const parsed = JSON.parse(message) as {
			error: string;
			agentHint: string;
		};

		expect(parsed).toEqual({
			error: 'server unavailable',
			agentHint: 'mockzilla agent-skill',
		});
	});

	it('resolves a folder slug before creating a mock from stdin', async () => {
		const result = output();
		const requests: Array<{ url: string; init?: RequestInit }> = [];
		const fetchImpl: CliOptions['fetch'] = async (input, init) => {
			const url = String(input);
			requests.push({ url, init });

			if (url.includes('/api/folders?slug=demo')) {
				return Response.json({ id: 'folder-1', name: 'Demo', slug: 'demo' });
			}

			return Response.json(
				{
					id: 'mock-1',
					name: 'Users',
					path: '/users/*',
					folderId: 'folder-1',
				},
				{ status: 201 },
			);
		};

		const exitCode = await run(
			['mocks', 'create', '--file', '-', '--json'],
			options(result, {
				fetch: fetchImpl,
				input: JSON.stringify({
					name: 'Users',
					path: '/users/*',
					method: 'GET',
					folderSlug: 'demo',
					response: '{}',
					variants: [
						{
							key: 'active',
							captures: ['active'],
							body: '{"active":true}',
							statusCode: 200,
						},
					],
				}),
			}),
		);

		expect(exitCode).toBe(0);
		expect(requests).toHaveLength(2);
		expect(requests[0]?.url).toContain('/api/folders?slug=demo');
		expect(requests[1]?.url).toContain('/api/mocks');
		expect(JSON.parse(String(requests[1]?.init?.body))).toMatchObject({
			folderId: 'folder-1',
			path: '/users/*',
		});
		expect(JSON.parse(String(requests[1]?.init?.body))).not.toHaveProperty(
			'folderSlug',
		);
	});

	it('lists and creates mock subfolders by folder slug', async () => {
		const requests: Array<{ url: string; init?: RequestInit }> = [];
		const fetchImpl: CliOptions['fetch'] = async (input, init) => {
			const url = String(input);
			requests.push({ url, init });
			if (url.includes('/api/folders?slug=demo')) {
				return Response.json({ id: 'folder-1' });
			}
			return Response.json({ id: 'subfolder-1' }, { status: 201 });
		};

		const listResult = output();
		expect(
			await run(
				[
					'subfolders',
					'list',
					'--folder-slug',
					'demo',
					'--parent-id',
					'root',
					'--json',
				],
				options(listResult, { fetch: fetchImpl }),
			),
		).toBe(0);
		expect(requests[1]?.url).toContain(
			'/api/mock-subfolders?folderId=folder-1&parentId=root',
		);

		const createResult = output();
		expect(
			await run(
				[
					'subfolders',
					'create',
					'--folder-slug',
					'demo',
					'--parent-id',
					'subfolder-parent',
					'--name',
					'Details',
					'--path',
					'details',
					'--json',
				],
				options(createResult, { fetch: fetchImpl }),
			),
		).toBe(0);
		expect(requests[3]?.url).toEndWith('/api/mock-subfolders');
		expect(JSON.parse(String(requests[3]?.init?.body))).toEqual({
			folderId: 'folder-1',
			parentId: 'subfolder-parent',
			name: 'Details',
			path: 'details',
		});
	});

	it('moves subfolders to root and requires confirmation before deletion', async () => {
		const requests: Array<{ url: string; init?: RequestInit }> = [];
		const fetchImpl: CliOptions['fetch'] = async (input, init) => {
			requests.push({ url: String(input), init });
			return Response.json({ success: true });
		};

		const updateResult = output();
		expect(
			await run(
				[
					'subfolders',
					'update',
					'subfolder-1',
					'--parent-id',
					'root',
					'--json',
				],
				options(updateResult, { fetch: fetchImpl }),
			),
		).toBe(0);
		expect(JSON.parse(String(requests[0]?.init?.body))).toEqual({
			parentId: null,
		});

		const deleteResult = output();
		expect(
			await run(
				['subfolders', 'delete', 'subfolder-1', '--yes', '--json'],
				options(deleteResult, { fetch: fetchImpl }),
			),
		).toBe(0);
		expect(requests[1]?.init?.method).toBe('DELETE');

		const noConfirmationResult = output();
		expect(
			await run(
				['subfolders', 'delete', 'subfolder-2', '--json'],
				options(noConfirmationResult, { fetch: fetchImpl }),
			),
		).toBe(1);
		expect(requests).toHaveLength(2);
	});

	it('filters mock lists by subfolder', async () => {
		const requests: string[] = [];
		const fetchImpl: CliOptions['fetch'] = async (input) => {
			const url = String(input);
			requests.push(url);
			return url.includes('/api/folders?slug=demo')
				? Response.json({ id: 'folder-1' })
				: Response.json({ data: [] });
		};

		const result = output();
		expect(
			await run(
				[
					'mocks',
					'list',
					'--folder-slug',
					'demo',
					'--mock-folder-id',
					'subfolder-1',
					'--json',
				],
				options(result, { fetch: fetchImpl }),
			),
		).toBe(0);
		expect(requests[1]).toContain(
			'/api/mocks?folderId=folder-1&mockFolderId=subfolder-1',
		);
	});

	it('imports JSON data and OpenAPI specs from stdin', async () => {
		const requests: Array<{ url: string; init?: RequestInit }> = [];
		const fetchImpl: CliOptions['fetch'] = async (input, init) => {
			requests.push({ url: String(input), init });
			return Response.json({ success: true });
		};

		const importPayload = { folders: [], mocks: [] };
		const importResult = output();
		expect(
			await run(
				['import', '--file', '-', '--json'],
				options(importResult, {
					fetch: fetchImpl,
					input: JSON.stringify(importPayload),
				}),
			),
		).toBe(0);
		expect(requests[0]?.url).toEndWith('/api/import');
		expect(JSON.parse(String(requests[0]?.init?.body))).toEqual(importPayload);

		const spec = 'openapi: 3.0.0\ninfo:\n  title: Demo\npaths: {}\n';
		const openApiResult = output();
		expect(
			await run(
				['openapi', 'import', '--file', '-', '--json'],
				options(openApiResult, { fetch: fetchImpl, input: spec }),
			),
		).toBe(0);
		expect(requests[1]?.url).toEndWith('/api/import/openapi');
		expect(JSON.parse(String(requests[1]?.init?.body))).toEqual({ spec });
	});

	it('exports all mock data to a file', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'mockzilla-cli-export-'));
		temporaryDirectories.push(directory);
		const file = join(directory, 'backup.json');
		const exportPayload = { folders: [], mockSubfolders: [], mocks: [] };
		const result = output();
		const fetchImpl: CliOptions['fetch'] = async (input) => {
			expect(String(input)).toEndWith('/api/export');
			return Response.json(exportPayload);
		};

		expect(
			await run(
				['export', '--output', file, '--json'],
				options(result, { fetch: fetchImpl }),
			),
		).toBe(0);
		expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(exportPayload);
		expect(JSON.parse(result.stdout.join(''))).toEqual({
			exported: true,
			output: file,
		});
	});

	it('checks the latest published version without updating itself', async () => {
		const packageJson = JSON.parse(
			await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
		) as { version: string };
		const [major, minor, patch] = packageJson.version.split('.').map(Number);
		const releaseTags = [
			`v${packageJson.version}`,
			`v${major}.${minor}.${patch + 1}`,
		];
		const requests: string[] = [];
		const fetchImpl: CliOptions['fetch'] = async (input) => {
			requests.push(String(input));
			return Response.json({ tag_name: releaseTags[requests.length - 1] });
		};

		const currentResult = output();
		expect(
			await run(
				['update', 'check', '--json'],
				options(currentResult, { fetch: fetchImpl }),
			),
		).toBe(0);
		expect(JSON.parse(currentResult.stdout.join(''))).toMatchObject({
			currentVersion: packageJson.version,
			latestVersion: packageJson.version,
			status: 'up-to-date',
			updateAvailable: false,
		});

		const updateResult = output();
		expect(
			await run(
				['update', 'check', '--json'],
				options(updateResult, { fetch: fetchImpl }),
			),
		).toBe(0);
		expect(JSON.parse(updateResult.stdout.join(''))).toMatchObject({
			latestVersion: `${major}.${minor}.${patch + 1}`,
			status: 'update-available',
			updateAvailable: true,
			installWithBun: 'bun add --global github:andrecrjr/mockzilla',
		});
		expect(requests).toEqual([
			'https://api.github.com/repos/andrecrjr/mockzilla/releases/latest',
			'https://api.github.com/repos/andrecrjr/mockzilla/releases/latest',
		]);
	});

	it('sends proxy flags as a partial proxy payload', async () => {
		const result = output();
		const bodies: unknown[] = [];
		const fetchImpl: CliOptions['fetch'] = async (_input, init) => {
			bodies.push(JSON.parse(String(init?.body)));
			return Response.json({ id: 'mock-1' });
		};

		const exitCode = await run(
			[
				'mocks',
				'update',
				'mock-1',
				'--proxy-url',
				'https://api.example.com/users',
				'--proxy-headers-file',
				'-',
				'--proxy-params',
				'{"api_key":"K1"}',
				'--no-forward-headers',
				'--json',
			],
			options(result, {
				fetch: fetchImpl,
				input: '{"Authorization":"Bearer token"}',
			}),
		);

		expect(exitCode).toBe(0);
		expect(bodies[0]).toEqual({
			proxy: {
				targetUrl: 'https://api.example.com/users',
				headers: { Authorization: 'Bearer token' },
				queryParams: { api_key: 'K1' },
				forwardHeaders: false,
			},
		});
	});

	it('clears the proxy and rejects conflicting proxy flags', async () => {
		const clearResult = output();
		const bodies: unknown[] = [];
		await run(
			['mocks', 'update', 'mock-1', '--clear-proxy', '--json'],
			options(clearResult, {
				fetch: async (_input, init) => {
					bodies.push(JSON.parse(String(init?.body)));
					return Response.json({ id: 'mock-1' });
				},
			}),
		);
		expect(bodies[0]).toEqual({ proxy: { targetUrl: null } });

		const conflict = output();
		const exitCode = await run(
			[
				'mocks',
				'update',
				'mock-1',
				'--clear-proxy',
				'--proxy-url',
				'https://api.example.com',
				'--json',
			],
			options(conflict, { fetch: async () => Response.json({}) }),
		);
		expect(exitCode).not.toBe(0);
	});

	it('reports API failures with the agent hint', async () => {
		const result = output();
		const fetchImpl: CliOptions['fetch'] = async () =>
			Response.json({ error: 'Mock not found' }, { status: 404 });

		const exitCode = await run(
			['mocks', 'get', 'missing', '--json'],
			options(result, { fetch: fetchImpl }),
		);

		expect(exitCode).toBe(1);
		const parsed = JSON.parse(result.stderr.join('')) as {
			error: string;
			agentHint: string;
		};
		expect(parsed.error).toContain('Mock not found');
		expect(parsed.agentHint).toBe('mockzilla agent-skill');
	});

	it('persists and reads the default server profile', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'mockzilla-cli-'));
		temporaryDirectories.push(directory);
		const configPath = join(directory, 'config.json');
		const setResult = output();

		expect(
			await run(
				['config', 'set', '--url', 'http://example.test:36666'],
				options(setResult, { configPath }),
			),
		).toBe(0);

		const saved = JSON.parse(await readFile(configPath, 'utf8')) as {
			url: string;
		};
		expect(saved.url).toBe('http://example.test:36666');

		const showResult = output();
		expect(
			await run(
				['config', 'show', '--json'],
				options(showResult, { configPath }),
			),
		).toBe(0);
		expect(JSON.parse(showResult.stdout.join(''))).toEqual({
			url: 'http://example.test:36666',
		});
	});
});
