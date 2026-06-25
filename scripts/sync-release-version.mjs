import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const version = process.argv[2];
const semverPattern =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

if (!version || !semverPattern.test(version)) {
	throw new Error(`Expected a valid semantic version, received: ${version ?? '<empty>'}`);
}

function readText(relativePath) {
	return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function writeText(relativePath, content) {
	fs.writeFileSync(path.join(root, relativePath), content);
}

function updateJsonVersion(relativePath) {
	const original = readText(relativePath);
	const versionPattern = /("version"\s*:\s*)"[^"]+"/;
	if (!versionPattern.test(original)) {
		throw new Error(`Unable to find version in ${relativePath}`);
	}

	writeText(relativePath, original.replace(versionPattern, `$1"${version}"`));
}

function updateCargoToml() {
	const relativePath = 'src-tauri/Cargo.toml';
	const original = readText(relativePath);
	const packageVersionPattern = /(\[package\][\s\S]*?\nversion = )"[^"]+"/;
	if (!packageVersionPattern.test(original)) {
		throw new Error(`Unable to find package version in ${relativePath}`);
	}

	const updated = original.replace(
		packageVersionPattern,
		`$1"${version}"`,
	);

	writeText(relativePath, updated);
}

function updateCargoLock() {
	const relativePath = 'src-tauri/Cargo.lock';
	const original = readText(relativePath);
	const packageVersionPattern =
		/(\[\[package\]\]\nname = "mockzilla"\nversion = )"[^"]+"/;
	if (!packageVersionPattern.test(original)) {
		throw new Error(`Unable to find mockzilla version in ${relativePath}`);
	}

	const updated = original.replace(
		packageVersionPattern,
		`$1"${version}"`,
	);

	writeText(relativePath, updated);
}

updateJsonVersion('package.json');
updateJsonVersion('src-tauri/tauri.conf.json');
updateCargoToml();
updateCargoLock();

console.log(`Synchronized release version ${version}`);
