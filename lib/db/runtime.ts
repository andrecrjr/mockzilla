import * as path from 'node:path';

export function getPgliteDataDir() {
	const configuredDir = process.env.MOCKZILLA_DATA_DIR;

	if (configuredDir) {
		return path.resolve(configuredDir);
	}

	return path.resolve('./data');
}
