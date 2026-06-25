import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SUPPORTED_MAJOR_VERSIONS = [24, 22, 20];
const MIN_NODE_20_MINOR = 9;

function runNodeVersion(binaryPath) {
	try {
		return execFileSync(binaryPath, ['--version'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();
	} catch {
		return null;
	}
}

function parseNodeVersion(version) {
	const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
	if (!match) {
		return null;
	}

	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
		version,
	};
}

function isSupportedVersion(parsedVersion) {
	if (!parsedVersion) {
		return false;
	}

	if (!SUPPORTED_MAJOR_VERSIONS.includes(parsedVersion.major)) {
		return false;
	}

	return parsedVersion.major !== 20 || parsedVersion.minor >= MIN_NODE_20_MINOR;
}

function getCandidateScore(parsedVersion) {
	const majorScore = SUPPORTED_MAJOR_VERSIONS.indexOf(parsedVersion.major);
	return {
		majorScore,
		minor: parsedVersion.minor,
		patch: parsedVersion.patch,
	};
}

function compareCandidates(left, right) {
	const leftScore = getCandidateScore(left.parsedVersion);
	const rightScore = getCandidateScore(right.parsedVersion);

	if (leftScore.majorScore !== rightScore.majorScore) {
		return leftScore.majorScore - rightScore.majorScore;
	}

	if (leftScore.minor !== rightScore.minor) {
		return rightScore.minor - leftScore.minor;
	}

	return rightScore.patch - leftScore.patch;
}

function addCandidate(candidates, binaryPath) {
	if (!binaryPath || candidates.some((candidate) => candidate.path === binaryPath)) {
		return;
	}

	if (!fs.existsSync(binaryPath)) {
		return;
	}

	const version = runNodeVersion(binaryPath);
	const parsedVersion = version ? parseNodeVersion(version) : null;
	if (!isSupportedVersion(parsedVersion)) {
		return;
	}

	candidates.push({
		path: binaryPath,
		version,
		parsedVersion,
	});
}

function findPathNode() {
	try {
		return execFileSync(process.platform === 'win32' ? 'where' : 'which', ['node'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		})
			.split(/\r?\n/)
			.find(Boolean);
	} catch {
		return null;
	}
}

function findNvmNodes() {
	const nvmDir = process.env.NVM_DIR || path.join(os.homedir(), '.nvm');
	const versionsDir = path.join(nvmDir, 'versions', 'node');
	if (!fs.existsSync(versionsDir)) {
		return [];
	}

	return fs
		.readdirSync(versionsDir)
		.filter((entry) => entry.startsWith('v'))
		.map((entry) =>
			path.join(versionsDir, entry, 'bin', process.platform === 'win32' ? 'node.exe' : 'node'),
		);
}

export function findDesktopNode() {
	const candidates = [];

	addCandidate(candidates, process.env.MOCKZILLA_DESKTOP_NODE);
	addCandidate(candidates, findPathNode());
	for (const nvmNode of findNvmNodes()) {
		addCandidate(candidates, nvmNode);
	}

	candidates.sort(compareCandidates);
	const selected = candidates[0];
	if (selected) {
		return selected;
	}

	const pathNode = findPathNode();
	const pathVersion = pathNode ? runNodeVersion(pathNode) : null;
	const current = pathVersion ? ` Current PATH node is ${pathVersion} at ${pathNode}.` : '';
	throw new Error(
		`Desktop builds require Node 24, 22, or >=20.9 for Next.js Webpack standalone output.${current} Set MOCKZILLA_DESKTOP_NODE to a supported node binary.`,
	);
}
