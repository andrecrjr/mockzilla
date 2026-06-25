import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(root, 'server.js');
const migratePath = path.join(root, 'scripts', 'migrate.mjs');

function requireFile(filePath, label) {
	if (!fs.existsSync(filePath)) {
		throw new Error(`${label} not found at ${filePath}`);
	}
}

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

function runNodeScript(scriptPath, env) {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [scriptPath], {
			cwd: root,
			env,
			stdio: 'inherit',
		});

		child.on('error', reject);
		child.on('exit', (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`${path.basename(scriptPath)} exited with ${code}`));
		});
	});
}

requireFile(serverPath, 'Next standalone server');
requireFile(migratePath, 'Migration script');

const port = Number(process.env.PORT || (await findAvailablePort(36666)));
const dataDir = process.env.MOCKZILLA_DATA_DIR || path.join(root, 'data');
const logDir = process.env.MOCKZILLA_LOG_DIR || path.resolve(dataDir, '..', 'logs');
const env = {
	...process.env,
	HOSTNAME: '127.0.0.1',
	MOCKZILLA_DESKTOP: '1',
	MOCKZILLA_DATA_DIR: dataDir,
	MOCKZILLA_LOG_DIR: logDir,
	NODE_ENV: 'production',
	PORT: String(port),
};

await runNodeScript(migratePath, env);

const server = spawn(process.execPath, [serverPath], {
	cwd: root,
	env,
	stdio: 'inherit',
});

server.on('error', (error) => {
	console.error(error);
	process.exit(1);
});

server.on('exit', (code, signal) => {
	if (signal) {
		process.exit(0);
	}
	process.exit(code ?? 0);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
	process.on(signal, () => {
		server.kill(signal);
	});
}
