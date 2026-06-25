import path from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { getPgliteDataDir } from '../../lib/db/runtime';

const originalDataDir = process.env.MOCKZILLA_DATA_DIR;

afterEach(() => {
	if (originalDataDir === undefined) {
		delete process.env.MOCKZILLA_DATA_DIR;
		return;
	}

	process.env.MOCKZILLA_DATA_DIR = originalDataDir;
});

describe('lib/db/index (PGlite path)', () => {
	it('resolves repo-local data by default', () => {
		delete process.env.MOCKZILLA_DATA_DIR;

		expect(getPgliteDataDir()).toBe(path.resolve('./data'));
	});

	it('uses MOCKZILLA_DATA_DIR when configured', () => {
		process.env.MOCKZILLA_DATA_DIR = './tmp/desktop-data';

		expect(getPgliteDataDir()).toBe(path.resolve('./tmp/desktop-data'));
	});
});
