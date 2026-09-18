// @ts-check

import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';

import {
	clearConfig,
	DEFAULT_URL,
	getDefaultConfigPath,
	readConfig,
	writeConfig,
} from './config.mjs';
import { createClient, normalizeBaseUrl } from './client.mjs';
import { formatCliError } from './errors.mjs';
import { readAgentSkill } from './skill.mjs';

const BOOLEAN_OPTIONS = new Set([
	'all',
	'disabled',
	'dynamic',
	'echo-request-body',
	'enabled',
	'help',
	'json',
	'no-require-match',
	'require-match',
	'use-dynamic-response',
	'version',
	'wildcard-require-match',
	'yes',
]);

const ALLOWED_OPTIONS = new Set([
	...BOOLEAN_OPTIONS,
	'body-type',
	'description',
	'file',
	'folder-id',
	'folder-slug',
	'json-schema',
	'json-schema-file',
	'limit',
	'match-type',
	'meta',
	'meta-file',
	'method',
	'mock-folder-id',
	'name',
	'page',
	'path',
	'query',
	'query-params',
	'query-params-file',
	'response',
	'response-file',
	'slug',
	'status-code',
	'url',
	'variants-file',
]);

/** @typedef {string | boolean} OptionValue */
/** @typedef {Map<string, OptionValue>} ParsedOptions */
/** @typedef {{ positionals: string[]; options: ParsedOptions }} ParsedArgs */
/** @typedef {(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} FetchImpl */
/** @typedef {{ stdout?: Writer; stderr?: Writer; input?: string; env?: Record<string, string | undefined>; configPath?: string; fetch?: FetchImpl }} CliDependencies */
/** @typedef {(value: string) => void} Writer */

/**
 * @param {string[]} argv
 * @param {CliDependencies} [dependencies]
 * @returns {Promise<number>}
 */
export async function run(argv, dependencies = {}) {
	const stdout =
		dependencies.stdout || ((value) => process.stdout.write(value));
	const stderr =
		dependencies.stderr || ((value) => process.stderr.write(value));
	let json = argv.includes('--json');

	try {
		const parsed = parseArgs(argv);
		json = getBoolean(parsed.options, 'json');
		const result = await execute(parsed, dependencies);
		if (result !== undefined) {
			if (
				typeof result === 'string' &&
				parsed.positionals[0] === 'agent-skill'
			) {
				stdout(result.endsWith('\n') ? result : `${result}\n`);
			} else {
				stdout(formatResult(result, json));
			}
		}
		return 0;
	} catch (error) {
		stderr(formatCliError(error, json));
		return 1;
	}
}

/**
 * @param {string[]} argv
 * @returns {ParsedArgs}
 */
export function parseArgs(argv) {
	const positionals = [];
	const options = new Map();
	let parsingOptions = true;

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (!parsingOptions || token === '-') {
			positionals.push(token);
			continue;
		}
		if (token === '--') {
			parsingOptions = false;
			continue;
		}
		if (!token.startsWith('--')) {
			positionals.push(token);
			continue;
		}

		const optionToken = token.slice(2);
		const equalsIndex = optionToken.indexOf('=');
		const rawName =
			equalsIndex === -1 ? optionToken : optionToken.slice(0, equalsIndex);
		const inlineValue =
			equalsIndex === -1 ? undefined : optionToken.slice(equalsIndex + 1);
		const isNegated = rawName.startsWith('no-');
		const name = isNegated ? rawName.slice(3) : rawName;

		if (!ALLOWED_OPTIONS.has(rawName) && !ALLOWED_OPTIONS.has(name)) {
			throw new Error(`Unknown option: --${rawName}`);
		}
		if (isNegated && !BOOLEAN_OPTIONS.has(name)) {
			throw new Error(`Option --${rawName} is not a boolean option.`);
		}

		if (isNegated) {
			options.set(name, false);
			continue;
		}
		if (BOOLEAN_OPTIONS.has(name)) {
			options.set(
				name,
				inlineValue === undefined ? true : parseBoolean(inlineValue),
			);
			continue;
		}
		const value = inlineValue ?? argv[index + 1];
		if (value === undefined)
			throw new Error(`Option --${name} requires a value.`);
		if (inlineValue === undefined) index += 1;
		options.set(name, value);
	}

	return { positionals, options };
}

/**
 * @param {ParsedArgs} parsed
 * @param {CliDependencies} dependencies
 * @returns {Promise<unknown>}
 */
async function execute(parsed, dependencies) {
	const [command, action, identifier] = parsed.positionals;
	if (getBoolean(parsed.options, 'help') || command === 'help') {
		return HELP_TEXT;
	}
	if (getBoolean(parsed.options, 'version') || command === 'version') {
		return `mockzilla ${await getPackageVersion()}`;
	}
	if (!command) return HELP_TEXT;
	if (command === 'agent-skill') return readAgentSkill();

	if (command === 'config') {
		return executeConfig(action, parsed.options, dependencies);
	}
	if (command === 'health') {
		return request(dependencies, parsed.options, '/api/health');
	}
	if (command === 'folders') {
		return executeFolders(action, identifier, parsed.options, dependencies);
	}
	if (command === 'mocks') {
		return executeMocks(action, identifier, parsed.options, dependencies);
	}
	throw new Error(`Unknown command: ${command}`);
}

/**
 * @param {string | undefined} action
 * @param {ParsedOptions} options
 * @param {CliDependencies} dependencies
 * @returns {Promise<unknown>}
 */
async function executeConfig(action, options, dependencies) {
	const configPath =
		dependencies.configPath || getDefaultConfigPath(dependencies.env);
	if (action === 'set') {
		const rawUrl = getRequiredOption(options, 'url');
		const url = normalizeBaseUrl(rawUrl);
		await writeConfig(configPath, { url });
		return { url };
	}
	if (action === 'show') {
		const config = await readConfig(configPath);
		return config || { url: DEFAULT_URL, configured: false };
	}
	if (action === 'clear') {
		await clearConfig(configPath);
		return { cleared: true };
	}
	throw new Error('Usage: mockzilla config set|show|clear.');
}

/**
 * @param {string | undefined} action
 * @param {string | undefined} identifier
 * @param {ParsedOptions} options
 * @param {CliDependencies} dependencies
 * @returns {Promise<unknown>}
 */
async function executeFolders(action, identifier, options, dependencies) {
	const client = await getClient(options, dependencies);
	if (action === 'list') {
		const query = new URLSearchParams();
		if (getOption(options, 'query'))
			query.set('q', getRequiredOption(options, 'query'));
		if (getOption(options, 'page'))
			query.set('page', getRequiredOption(options, 'page'));
		if (getOption(options, 'limit'))
			query.set('limit', getRequiredOption(options, 'limit'));
		if (getBoolean(options, 'all')) query.set('all', 'true');
		return client.request(`/api/folders${query.toString() ? `?${query}` : ''}`);
	}
	if (action === 'get') {
		return client.request(
			`/api/folders?slug=${encodeURIComponent(requireIdentifier(identifier, 'folder slug'))}`,
		);
	}
	if (action === 'create') {
		/** @type {Record<string, unknown>} */
		const payload = { name: getRequiredOption(options, 'name') };
		setOptionString(payload, 'slug', options, 'slug');
		setOptionString(payload, 'description', options, 'description');
		return client.request('/api/folders', jsonRequest('POST', payload));
	}
	if (action === 'update') {
		/** @type {Record<string, unknown>} */
		const payload = {};
		setOptionString(payload, 'name', options, 'name');
		setOptionString(payload, 'slug', options, 'slug');
		setOptionString(payload, 'description', options, 'description');
		if (Object.keys(payload).length === 0) {
			throw new Error(
				'Folder update requires --name, --slug, or --description.',
			);
		}
		const id = requireIdentifier(identifier, 'folder ID');
		return client.request(
			`/api/folders?id=${encodeURIComponent(id)}`,
			jsonRequest('PUT', payload),
		);
	}
	if (action === 'delete') {
		const id = requireIdentifier(identifier, 'folder ID');
		await confirmDeletion(`folder ${id}`, options);
		await client.request(`/api/folders?id=${encodeURIComponent(id)}`, {
			method: 'DELETE',
		});
		return { deleted: true, id };
	}
	throw new Error('Usage: mockzilla folders list|create|get|update|delete.');
}

/**
 * @param {string | undefined} action
 * @param {string | undefined} identifier
 * @param {ParsedOptions} options
 * @param {CliDependencies} dependencies
 * @returns {Promise<unknown>}
 */
async function executeMocks(action, identifier, options, dependencies) {
	const client = await getClient(options, dependencies);
	if (action === 'list') {
		const query = new URLSearchParams();
		const folderId = getOption(options, 'folder-id');
		const folderSlug = getOption(options, 'folder-slug');
		if (folderId)
			query.set('folderId', getRequiredOption(options, 'folder-id'));
		if (folderSlug) {
			query.set(
				'folderId',
				await resolveFolderSlug(
					client,
					getRequiredOption(options, 'folder-slug'),
				),
			);
		}
		if (getOption(options, 'query'))
			query.set('q', getRequiredOption(options, 'query'));
		if (getOption(options, 'page'))
			query.set('page', getRequiredOption(options, 'page'));
		if (getOption(options, 'limit'))
			query.set('limit', getRequiredOption(options, 'limit'));
		return client.request(`/api/mocks${query.toString() ? `?${query}` : ''}`);
	}
	if (action === 'get') {
		const id = requireIdentifier(identifier, 'mock ID');
		return client.request(`/api/mocks?id=${encodeURIComponent(id)}`);
	}
	if (action === 'create') {
		const payload = await readMockPayload(options, dependencies, true);
		const folderSlug = getString(payload.folderSlug);
		if (folderSlug && !getString(payload.folderId)) {
			payload.folderId = await resolveFolderSlug(client, folderSlug);
		}
		delete payload.folderSlug;
		return client.request(
			'/api/mocks',
			jsonRequest('POST', validateCreatePayload(payload)),
		);
	}
	if (action === 'update') {
		const id = requireIdentifier(identifier, 'mock ID');
		const payload = await readMockPayload(options, dependencies, false);
		if (payload.folderId || payload.folderSlug) {
			throw new Error('Mock updates cannot change the parent folder.');
		}
		delete payload.folderSlug;
		return client.request(
			`/api/mocks?id=${encodeURIComponent(id)}`,
			jsonRequest('PUT', validateUpdatePayload(payload)),
		);
	}
	if (action === 'delete') {
		const id = requireIdentifier(identifier, 'mock ID');
		await confirmDeletion(`mock ${id}`, options);
		await client.request(`/api/mocks?id=${encodeURIComponent(id)}`, {
			method: 'DELETE',
		});
		return { deleted: true, id };
	}
	throw new Error('Usage: mockzilla mocks list|get|create|update|delete.');
}

/**
 * @param {ParsedOptions} options
 * @param {CliDependencies} dependencies
 * @returns {Promise<ReturnType<typeof createClient>>}
 */
async function getClient(options, dependencies) {
	const explicitUrl = getOption(options, 'url');
	if (explicitUrl !== undefined) {
		return createClient({
			baseUrl: String(explicitUrl),
			fetchImpl: dependencies.fetch,
		});
	}
	const environmentUrl = dependencies.env?.MOCKZILLA_URL;
	if (environmentUrl) {
		return createClient({
			baseUrl: environmentUrl,
			fetchImpl: dependencies.fetch,
		});
	}
	const config = await readConfig(
		dependencies.configPath || getDefaultConfigPath(dependencies.env),
	);
	return createClient({
		baseUrl: config?.url || DEFAULT_URL,
		fetchImpl: dependencies.fetch,
	});
}

/**
 * @param {CliDependencies} dependencies
 * @param {ParsedOptions} options
 * @param {string} path
 * @returns {Promise<unknown>}
 */
function request(dependencies, options, path) {
	return getClient(options, dependencies).then((client) =>
		client.request(path),
	);
}

/**
 * @param {ParsedOptions} options
 * @param {CliDependencies} dependencies
 * @param {boolean} isCreate
 * @returns {Promise<Record<string, unknown>>}
 */
async function readMockPayload(options, dependencies, isCreate) {
	const payload = await readJsonObjectOption(options, 'file', dependencies);
	await applyFileOption(
		payload,
		options,
		'response-file',
		'response',
		dependencies,
		false,
	);
	await applyFileOption(
		payload,
		options,
		'json-schema-file',
		'jsonSchema',
		dependencies,
		false,
	);
	await applyFileOption(
		payload,
		options,
		'variants-file',
		'variants',
		dependencies,
		true,
	);
	await applyFileOption(
		payload,
		options,
		'query-params-file',
		'queryParams',
		dependencies,
		true,
	);
	await applyFileOption(
		payload,
		options,
		'meta-file',
		'meta',
		dependencies,
		true,
	);

	setOptionString(payload, 'name', options, 'name');
	setOptionString(payload, 'path', options, 'path');
	setOptionString(payload, 'method', options, 'method', (value) =>
		value.toUpperCase(),
	);
	setOptionString(payload, 'folderId', options, 'folder-id');
	setOptionString(payload, 'folderSlug', options, 'folder-slug');
	setOptionString(payload, 'mockFolderId', options, 'mock-folder-id');
	setOptionString(payload, 'response', options, 'response');
	setOptionString(payload, 'jsonSchema', options, 'json-schema');
	setOptionString(payload, 'matchType', options, 'match-type');
	setOptionString(payload, 'bodyType', options, 'body-type');

	if (getOption(options, 'status-code')) {
		payload.statusCode = parseInteger(
			getRequiredOption(options, 'status-code'),
			'status code',
		);
	}
	if (getOption(options, 'page') && !isCreate) {
		throw new Error('--page is only valid for mocks list.');
	}
	if (getOption(options, 'query-params'))
		payload.queryParams = parseJsonOption(options, 'query-params');
	if (getOption(options, 'meta'))
		payload.meta = parseJsonOption(options, 'meta');
	for (const name of [
		'enabled',
		'dynamic',
		'use-dynamic-response',
		'echo-request-body',
		'wildcard-require-match',
		'require-match',
	]) {
		if (options.has(name)) {
			const target = {
				dynamic: 'useDynamicResponse',
				'use-dynamic-response': 'useDynamicResponse',
				'echo-request-body': 'echoRequestBody',
				'wildcard-require-match': 'wildcardRequireMatch',
				'require-match': 'wildcardRequireMatch',
				enabled: 'enabled',
			}[name];
			if (target) payload[target] = getBoolean(options, name);
		}
	}
	if (options.has('disabled')) payload.enabled = false;
	if (options.has('no-require-match')) payload.wildcardRequireMatch = false;

	if (payload.method !== undefined)
		payload.method = String(payload.method).toUpperCase();
	if (
		payload.jsonSchema !== undefined &&
		typeof payload.jsonSchema !== 'string'
	) {
		payload.jsonSchema = JSON.stringify(payload.jsonSchema);
	}
	if (payload.response !== undefined && typeof payload.response !== 'string') {
		payload.response = JSON.stringify(payload.response);
	}
	if (
		isCreate &&
		payload.response === undefined &&
		payload.jsonSchema !== undefined
	) {
		payload.response = '{}';
		payload.useDynamicResponse = true;
	}
	return payload;
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, unknown>}
 */
function validateCreatePayload(payload) {
	for (const field of ['name', 'path', 'method', 'folderId']) {
		if (!getString(payload[field]))
			throw new Error(`Mock create requires ${field}.`);
	}
	if (payload.response === undefined) {
		throw new Error('Mock create requires response or jsonSchema.');
	}
	payload.statusCode =
		payload.statusCode === undefined
			? 200
			: parseInteger(String(payload.statusCode), 'status code');
	payload.matchType = payload.matchType || 'exact';
	payload.bodyType = payload.bodyType || 'json';
	return payload;
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, unknown>}
 */
function validateUpdatePayload(payload) {
	if (Object.keys(payload).length === 0)
		throw new Error('Mock update requires a JSON payload or flags.');
	if (payload.statusCode !== undefined)
		payload.statusCode = parseInteger(
			String(payload.statusCode),
			'status code',
		);
	return payload;
}

/**
 * @param {Record<string, unknown>} payload
 * @param {ParsedOptions} options
 * @param {string} optionName
 * @param {string} targetName
 * @param {CliDependencies} dependencies
 * @param {boolean} parseJson
 * @returns {Promise<void>}
 */
async function applyFileOption(
	payload,
	options,
	optionName,
	targetName,
	dependencies,
	parseJson,
) {
	const file = getOption(options, optionName);
	if (!file) return;
	const contents = await readInputFile(String(file), dependencies);
	payload[targetName] = parseJson
		? parseJsonText(contents, optionName)
		: contents;
}

/**
 * @param {ParsedOptions} options
 * @param {string} name
 * @param {CliDependencies} dependencies
 * @returns {Promise<Record<string, unknown>>}
 */
async function readJsonObjectOption(options, name, dependencies) {
	const file = getOption(options, name);
	if (!file) return {};
	const parsed = parseJsonText(
		await readInputFile(String(file), dependencies),
		`--${name}`,
	);
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new Error(`--${name} must contain a JSON object.`);
	}
	return { ...parsed };
}

/**
 * @param {string} file
 * @param {CliDependencies} dependencies
 * @returns {Promise<string>}
 */
async function readInputFile(file, dependencies) {
	if (file !== '-') return readFile(file, 'utf8');
	if (dependencies.input !== undefined) return dependencies.input;
	let input = '';
	for await (const chunk of process.stdin) input += String(chunk);
	return input;
}

/**
 * @param {string} text
 * @param {string} source
 * @returns {unknown}
 */
function parseJsonText(text, source) {
	try {
		return JSON.parse(text);
	} catch {
		throw new Error(`${source} contains invalid JSON.`);
	}
}

/**
 * @param {ReturnType<typeof createClient>} client
 * @param {string} slug
 * @returns {Promise<string>}
 */
async function resolveFolderSlug(client, slug) {
	const result = await client.request(
		`/api/folders?slug=${encodeURIComponent(slug)}`,
	);
	if (!isRecord(result) || typeof result.id !== 'string') {
		throw new Error(`Folder lookup returned no ID for slug: ${slug}`);
	}
	return result.id;
}

/**
 * @param {string} method
 * @param {Record<string, unknown>} body
 * @returns {RequestInit}
 */
function jsonRequest(method, body) {
	return {
		method,
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	};
}

/**
 * @param {Record<string, unknown>} target
 * @param {string} targetName
 * @param {ParsedOptions} options
 * @param {string} optionName
 * @param {(value: string) => string} [transform]
 */
function setOptionString(
	target,
	targetName,
	options,
	optionName,
	transform = (value) => value,
) {
	const value = getOption(options, optionName);
	if (value !== undefined) target[targetName] = transform(String(value));
}

/**
 * @param {ParsedOptions} options
 * @param {string} name
 * @returns {OptionValue | undefined}
 */
function getOption(options, name) {
	return options.get(name);
}

/**
 * @param {ParsedOptions} options
 * @param {string} name
 * @returns {string}
 */
function getRequiredOption(options, name) {
	const value = getOption(options, name);
	if (value === undefined || value === true || value === false) {
		throw new Error(`Option --${name} requires a value.`);
	}
	return value;
}

/**
 * @param {ParsedOptions} options
 * @param {string} name
 * @returns {boolean}
 */
function getBoolean(options, name) {
	const value = getOption(options, name);
	return value === true || value === 'true';
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function parseBoolean(value) {
	if (value === 'true') return true;
	if (value === 'false') return false;
	throw new Error(`Expected true or false, received: ${value}`);
}

/**
 * @param {string} value
 * @param {string} label
 * @returns {number}
 */
function parseInteger(value, label) {
	const result = Number(value);
	if (!Number.isInteger(result)) throw new Error(`Invalid ${label}: ${value}`);
	return result;
}

/**
 * @param {ParsedOptions} options
 * @param {string} name
 * @returns {unknown}
 */
function parseJsonOption(options, name) {
	return parseJsonText(getRequiredOption(options, name), `--${name}`);
}

/**
 * @param {string | undefined} value
 * @param {string} label
 * @returns {string}
 */
function requireIdentifier(value, label) {
	if (!value) throw new Error(`A ${label} is required.`);
	return value;
}

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
function getString(value) {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {string} label
 * @param {ParsedOptions} options
 * @returns {Promise<void>}
 */
async function confirmDeletion(label, options) {
	if (getBoolean(options, 'yes')) return;
	if (!process.stdin.isTTY) {
		throw new Error(
			`Refusing to delete ${label} without --yes in a non-interactive shell.`,
		);
	}
	const readline = createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	try {
		const answer = await readline.question(`Delete ${label}? [y/N] `);
		if (!['y', 'yes'].includes(answer.trim().toLowerCase())) {
			throw new Error('Deletion cancelled.');
		}
	} finally {
		readline.close();
	}
}

/**
 * @param {unknown} result
 * @param {boolean} json
 * @returns {string}
 */
function formatResult(result, json) {
	if (json) return `${JSON.stringify(result, null, 2)}\n`;
	if (typeof result === 'string') return `${result}\n`;
	if (isRecord(result) && Array.isArray(result.data))
		return formatTable(result.data);
	if (Array.isArray(result)) return formatTable(result);
	return `${JSON.stringify(result, null, 2)}\n`;
}

/**
 * @param {unknown[]} rows
 * @returns {string}
 */
function formatTable(rows) {
	if (rows.length === 0) return 'No results.\n';
	const columns = ['id', 'name', 'slug', 'path', 'method', 'statusCode'];
	const values = rows.map((row) =>
		columns.map((column) => (isRecord(row) ? String(row[column] ?? '') : '')),
	);
	const widths = columns.map((column, index) =>
		Math.max(column.length, ...values.map((row) => row[index].length)),
	);
	/** @param {string[]} row */
	const line = (row) =>
		row
			.map((value, index) => value.padEnd(widths[index]))
			.join('  ')
			.trimEnd();
	return `${line(columns)}\n${line(widths.map((width) => '-'.repeat(width)))}\n${values.map(line).join('\n')}\n`;
}

/**
 * @returns {Promise<string>}
 */
async function getPackageVersion() {
	const packageUrl = new URL('../package.json', import.meta.url);
	const packageJson = JSON.parse(await readFile(packageUrl, 'utf8'));
	return typeof packageJson.version === 'string'
		? packageJson.version
		: 'unknown';
}

const HELP_TEXT = `Mockzilla CLI

Usage:
  mockzilla config set --url <url>
  mockzilla health
  mockzilla folders list|create|get|update|delete
  mockzilla mocks list|get|create|update|delete
  mockzilla agent-skill

Options:
  --url <url>       Override the server URL for one command
  --json            Print machine-readable JSON
  --yes             Confirm destructive commands
  --file <path|->   Read a mock JSON payload from a file or stdin

Run \`mockzilla agent-skill\` for the full agent-facing workflow.
`;
