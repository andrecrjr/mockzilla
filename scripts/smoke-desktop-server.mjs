import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const serverScript = path.join(root, 'desktop-dist', 'server', 'desktop-server.mjs');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mockzilla-desktop-'));

function findAvailablePort(startPort) {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.unref();
		server.on('error', (error) => {
			if (error.code === 'EADDRINUSE') {
				findAvailablePort(startPort + 1).then(resolve, reject);
				return;
			}
			reject(error);
		});
		server.listen(startPort, '127.0.0.1', () => {
			const address = server.address();
			server.close(() => {
				resolve(typeof address === 'object' && address ? address.port : startPort);
			});
		});
	});
}

const port = await findAvailablePort(45666);

if (!fs.existsSync(serverScript)) {
	throw new Error(`Desktop server script not found at ${serverScript}`);
}

const child = spawn(process.execPath, [serverScript], {
	cwd: path.dirname(serverScript),
	env: {
		...process.env,
		DATABASE_URL: '',
		MOCKZILLA_DATA_DIR: dataDir,
		PORT: String(port),
	},
	stdio: 'inherit',
});

async function waitForHealth() {
	const url = `http://127.0.0.1:${port}/api/health`;

	for (let attempt = 0; attempt < 80; attempt += 1) {
		try {
			const response = await fetch(url);
			if (response.ok) {
				return;
			}
		} catch {
			// The server may still be starting.
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	throw new Error(`Desktop server did not become healthy at ${url}`);
}

try {
	await waitForHealth();
	const response = await fetch(`http://127.0.0.1:${port}/api/health`);
	const body = await response.json();
	if (body.ok !== true || body.desktop !== true) {
		throw new Error(`Unexpected health response: ${JSON.stringify(body)}`);
	}
	console.log('Desktop server smoke test passed');
} finally {
	child.kill('SIGTERM');
	fs.rmSync(dataDir, { recursive: true, force: true });
}
