import { describe, expect, test } from 'bun:test';
import { buildFolderHref } from '../../lib/utils/folder-paths';

describe('buildFolderHref', () => {
	test('links to the folder root without a subfolder', () => {
		expect(buildFolderHref('/flow-demo')).toBe('/app/folder/flow-demo');
		expect(buildFolderHref('/flow-demo', null)).toBe('/app/folder/flow-demo');
	});

	test('keeps the mock subfolder so back navigation returns to it', () => {
		expect(buildFolderHref('/flow-demo', 'sub-1')).toBe(
			'/app/folder/flow-demo?mockFolderId=sub-1',
		);
	});
});
