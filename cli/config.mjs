// @ts-check

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';

export const DEFAULT_URL = 'http://localhost:36666';

/** @typedef {{ url: string }} MockzillaConfig */
/** @typedef {Record<string, string | undefined>} Environment */

/**
 * @param {Environment} env
 * @returns {string}
 */
export function getDefaultConfigPath(env = process.env) {
	const configRoot =
		platform() === 'win32'
			? env.APPDATA || join(homedir(), 'AppData', 'Roaming')
			: env.XDG_CONFIG_HOME || join(env.HOME || homedir(), '.config');
	return join(configRoot, 'mockzilla', 'config.json');
}

/**
 * @param {string} configPath
 * @returns {Promise<MockzillaConfig | null>}
 */
export async function readConfig(configPath) {
	try {
		const contents = await readFile(configPath, 'utf8');
		const parsed = JSON.parse(contents);
		if (
			typeof parsed !== 'object' ||
			parsed === null ||
			typeof parsed.url !== 'string'
		) {
			throw new Error('Mockzilla config must contain a string URL.');
		}
		return { url: parsed.url };
	} catch (error) {
		if (isNodeError(error) && error.code === 'ENOENT') return null;
		if (error instanceof SyntaxError) {
			throw new Error('Mockzilla config contains invalid JSON.');
		}
		throw error;
	}
}

/**
 * @param {string} configPath
 * @param {MockzillaConfig} config
 * @returns {Promise<void>}
 */
export async function writeConfig(configPath, config) {
	await mkdir(dirname(configPath), { recursive: true });
	await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

/**
 * @param {string} configPath
 * @returns {Promise<void>}
 */
export async function clearConfig(configPath) {
	await rm(configPath, { force: true });
}

/**
 * @param {unknown} error
 * @returns {error is NodeJS.ErrnoException}
 */
function isNodeError(error) {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		typeof error.code === 'string'
	);
}
