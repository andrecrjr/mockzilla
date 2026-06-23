import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const serverOut = path.join(root, 'desktop-dist', 'server');
const tauriBinaries = path.join(root, 'src-tauri', 'binaries');

function copyRecursive(source, destination) {
	if (!fs.existsSync(source)) {
		throw new Error(`Missing required desktop source: ${source}`);
	}

	fs.cpSync(source, destination, {
		recursive: true,
		force: true,
		errorOnExist: false,
	});
}

function getTargetTriple() {
	try {
		return execFileSync('rustc', ['--print', 'host-tuple'], {
			encoding: 'utf8',
		}).trim();
	} catch {
		const verbose = execFileSync('rustc', ['-Vv'], { encoding: 'utf8' });
		const hostLine = verbose
			.split('\n')
			.find((line) => line.startsWith('host: '));
		if (!hostLine) {
			throw new Error('Unable to determine Rust target triple');
		}
		return hostLine.replace('host: ', '').trim();
	}
}

function findNodeBinary() {
	const configured = process.env.MOCKZILLA_DESKTOP_NODE;
	if (configured) {
		return configured;
	}

	return execFileSync(process.platform === 'win32' ? 'where' : 'which', ['node'], {
		encoding: 'utf8',
	})
		.split(/\r?\n/)
		.find(Boolean);
}

fs.rmSync(serverOut, { recursive: true, force: true });
fs.mkdirSync(serverOut, { recursive: true });
fs.mkdirSync(tauriBinaries, { recursive: true });

copyRecursive(path.join(root, '.next', 'standalone'), serverOut);
copyRecursive(path.join(root, '.next', 'static'), path.join(serverOut, '.next', 'static'));
copyRecursive(path.join(root, 'public'), path.join(serverOut, 'public'));
copyRecursive(path.join(root, 'drizzle'), path.join(serverOut, 'drizzle'));
copyRecursive(path.join(root, 'scripts', 'migrate.mjs'), path.join(serverOut, 'scripts', 'migrate.mjs'));
copyRecursive(path.join(root, 'scripts', 'desktop-server.mjs'), path.join(serverOut, 'desktop-server.mjs'));

for (const unsafePath of ['.env', '.env.local', '.logs', 'data']) {
	fs.rmSync(path.join(serverOut, unsafePath), { recursive: true, force: true });
}

for (const generatedPath of ['desktop-dist', 'src-tauri']) {
	fs.rmSync(path.join(serverOut, generatedPath), { recursive: true, force: true });
}

const nodeBinary = findNodeBinary();
if (!nodeBinary) {
	throw new Error('Unable to find node binary for Tauri sidecar');
}

const extension = process.platform === 'win32' ? '.exe' : '';
const sidecarPath = path.join(
	tauriBinaries,
	`mockzilla-node-${getTargetTriple()}${extension}`,
);
fs.copyFileSync(nodeBinary, sidecarPath);
if (process.platform !== 'win32') {
	fs.chmodSync(sidecarPath, 0o755);
}

console.log(`Prepared desktop server resources in ${serverOut}`);
console.log(`Prepared Node sidecar at ${sidecarPath}`);
