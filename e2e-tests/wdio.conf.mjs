import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const binaryName = isWindows ? 'mockzilla.exe' : 'mockzilla';
const appBinary = path.join(rootDir, 'src-tauri', 'target', 'debug', binaryName);
const desktopDataDir = path.join(os.tmpdir(), 'mockzilla-desktop-e2e');
const specsGlob = path.join(rootDir, 'e2e-tests', 'specs', '**', '*.e2e.mjs');
const tauriDriver = isWindows
	? path.join(os.homedir(), '.cargo', 'bin', 'tauri-driver.exe')
	: path.join(os.homedir(), '.cargo', 'bin', 'tauri-driver');

let tauriDriverProcess;
let shuttingDown = false;

function closeTauriDriver() {
	shuttingDown = true;
	tauriDriverProcess?.kill();
}

function startTauriDriver() {
	tauriDriverProcess = spawn(tauriDriver, [], {
		stdio: ['ignore', process.stdout, process.stderr],
	});

	tauriDriverProcess.on('error', (error) => {
		console.error('tauri-driver error:', error);
		process.exit(1);
	});

	tauriDriverProcess.on('exit', (code) => {
		if (!shuttingDown) {
			console.error('tauri-driver exited with code:', code);
			process.exit(1);
		}
	});
}

function waitForPort(host, port, timeoutMs = 15000) {
	const startedAt = Date.now();

	return new Promise((resolve, reject) => {
		const check = () => {
			const socket = net.createConnection({ host, port }, () => {
				socket.end();
				resolve();
			});

			socket.on('error', () => {
				socket.destroy();

				if (Date.now() - startedAt >= timeoutMs) {
					reject(new Error(`Timed out waiting for ${host}:${port}`));
					return;
				}

				setTimeout(check, 250);
			});
		};

		check();
	});
}

function runCommand(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: rootDir,
		env: {
			...process.env,
			DATABASE_URL: '',
			MOCKZILLA_DESKTOP: '1',
			MOCKZILLA_DATA_DIR: desktopDataDir,
		},
		shell: isWindows,
		stdio: 'inherit',
		...options,
	});

	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} exited with ${result.status}`);
	}
}

export const config = {
	host: '127.0.0.1',
	port: 4444,
	specs: [specsGlob],
	maxInstances: 1,
	capabilities: [
		{
			maxInstances: 1,
			'tauri:options': {
				application: appBinary,
			},
		},
	],
	reporters: ['spec'],
	framework: 'mocha',
	mochaOpts: {
		ui: 'bdd',
		timeout: 120000,
	},
	onPrepare: async () => {
		if (isMac) {
			throw new Error('Tauri WebDriver desktop tests are supported on Linux and Windows, not macOS.');
		}

		runCommand('bun', ['run', 'desktop:build:debug']);
		fs.rmSync(desktopDataDir, { recursive: true, force: true });
		process.env.DATABASE_URL = '';
		process.env.MOCKZILLA_DESKTOP = '1';
		process.env.MOCKZILLA_DATA_DIR = desktopDataDir;
		startTauriDriver();
		await waitForPort('127.0.0.1', 4444);
	},
	onComplete: () => {
		closeTauriDriver();
	},
};
