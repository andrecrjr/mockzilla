import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { findDesktopNode } from './desktop-node.mjs';

const root = process.cwd();
const serverOut = path.join(root, 'desktop-dist', 'server');
const tauriBinaries = path.join(root, 'src-tauri', 'binaries');
const tauriBundleOut = path.join(root, 'src-tauri', 'target', 'release', 'bundle');

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

function copyNodePackage(packageName) {
	const packageParts = packageName.split('/');
	const source = path.join(root, 'node_modules', ...packageParts);
	const destination = path.join(serverOut, 'node_modules', ...packageParts);

	copyRecursive(source, destination);
}

function removeIfPresent(targetPath) {
	fs.rmSync(targetPath, { recursive: true, force: true });
}

function pruneUnsupportedNativeOptionals() {
	if (process.platform !== 'linux' || process.arch !== 'x64') {
		return;
	}

	const imgPackages = path.join(serverOut, 'node_modules', '@img');
	removeIfPresent(path.join(imgPackages, 'sharp-linuxmusl-x64'));
	removeIfPresent(path.join(imgPackages, 'sharp-libvips-linuxmusl-x64'));
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

function buildNextStandalone(node) {
	const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
	console.log(`Building desktop Next.js server with ${node.version} at ${node.path}`);
	fs.rmSync(path.join(root, '.next'), { recursive: true, force: true });

	const result = spawnSync(node.path, [nextBin, 'build', '--webpack'], {
		cwd: root,
		env: {
			...process.env,
			NODE_ENV: 'production',
			MOCKZILLA_DESKTOP_NODE: node.path,
		},
		stdio: 'inherit',
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function stageDesktopResources(node) {
	fs.rmSync(serverOut, { recursive: true, force: true });
	fs.rmSync(tauriBundleOut, { recursive: true, force: true });
	fs.mkdirSync(serverOut, { recursive: true });
	fs.mkdirSync(tauriBinaries, { recursive: true });

	copyRecursive(path.join(root, '.next', 'standalone'), serverOut);
	copyRecursive(path.join(root, '.next', 'static'), path.join(serverOut, '.next', 'static'));
	copyRecursive(path.join(root, 'public'), path.join(serverOut, 'public'));
	copyRecursive(path.join(root, 'drizzle'), path.join(serverOut, 'drizzle'));
	copyRecursive(path.join(root, 'scripts', 'migrate.mjs'), path.join(serverOut, 'scripts', 'migrate.mjs'));
	copyRecursive(path.join(root, 'scripts', 'desktop-server.mjs'), path.join(serverOut, 'desktop-server.mjs'));

	for (const packageName of ['@electric-sql/pglite', 'drizzle-orm', 'pg']) {
		copyNodePackage(packageName);
	}

	pruneUnsupportedNativeOptionals();

	for (const unsafePath of ['.env', '.env.local', '.logs', 'data']) {
		fs.rmSync(path.join(serverOut, unsafePath), { recursive: true, force: true });
	}

	for (const generatedPath of ['desktop-dist', 'src-tauri']) {
		fs.rmSync(path.join(serverOut, generatedPath), { recursive: true, force: true });
	}

	const nodeVersion = execFileSync(node.path, ['--version'], { encoding: 'utf8' }).trim();
	const extension = process.platform === 'win32' ? '.exe' : '';
	const sidecarPath = path.join(
		tauriBinaries,
		`mockzilla-node-${getTargetTriple()}${extension}`,
	);

	fs.copyFileSync(node.path, sidecarPath);
	if (process.platform !== 'win32') {
		fs.chmodSync(sidecarPath, 0o755);
	}

	console.log(`Prepared desktop server resources in ${serverOut}`);
	console.log(`Prepared Node ${nodeVersion} sidecar at ${sidecarPath}`);
}

const node = findDesktopNode();
buildNextStandalone(node);
stageDesktopResources(node);
