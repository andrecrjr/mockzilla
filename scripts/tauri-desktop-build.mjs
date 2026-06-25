import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { findDesktopNode } from './desktop-node.mjs';

const root = process.cwd();
const node = findDesktopNode();
const tauriArgs =
	process.argv.length > 2 ? process.argv.slice(2) : ['build', '--verbose'];

console.log(`Running Tauri desktop build with ${node.version} at ${node.path}`);

const result = spawnSync(
	process.execPath,
	['x', '@tauri-apps/cli@2.11.3', ...tauriArgs],
	{
		cwd: root,
		env: {
			...process.env,
			MOCKZILLA_DESKTOP_NODE: node.path,
			PATH: `${path.dirname(node.path)}${path.delimiter}${process.env.PATH || ''}`,
		},
		stdio: 'inherit',
	},
);

if (result.error) {
	throw result.error;
}

process.exit(result.status ?? 1);
