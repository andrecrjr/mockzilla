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
