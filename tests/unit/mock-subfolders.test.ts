import { describe, expect, it } from 'bun:test';
import {
	collectDescendantSubfolders,
	computeCanonicalSubfolderMainPaths,
	computeSubtreeMainPaths,
	deriveSubfolderMainPath,
	findMainPathConflict,
	withCanonicalSubfolderMainPaths,
	orderSubfoldersByHierarchy,
} from '../../lib/mock-subfolders';

const rows = [
	{
		id: 'users',
		folderId: 'folder-1',
		parentId: null,
		name: 'Users',
		slug: 'users',
		mainPath: '/users',
	},
	{
		id: 'details',
		folderId: 'folder-1',
		parentId: 'users',
		name: 'Details',
		slug: 'details',
		mainPath: '/users/details',
	},
	{
		id: 'history',
		folderId: 'folder-1',
		parentId: 'details',
		name: 'History',
		slug: 'history',
		mainPath: '/users/details/history',
	},
];

describe('mock subfolder hierarchy helpers', () => {
	it('derives subfolder main paths from parent path and slug', () => {
		expect(deriveSubfolderMainPath(null, 'users')).toBe('/users');
		expect(deriveSubfolderMainPath('/users', 'details')).toBe('/users/details');
	});

	it('collects all descendants in a subtree', () => {
		const descendants = collectDescendantSubfolders(rows, 'users');

		expect(descendants.map((row) => row.id)).toEqual(['details', 'history']);
	});

	it('computes descendant paths after a parent path changes', () => {
		const updatedUsers = {
			...rows[0],
			slug: 'accounts',
			mainPath: '/accounts',
		};
		const nextRows = rows.map((row) =>
			row.id === updatedUsers.id ? updatedUsers : row,
		);

		const paths = computeSubtreeMainPaths(nextRows, updatedUsers);

		expect(paths.get('users')).toBe('/accounts');
		expect(paths.get('details')).toBe('/accounts/details');
		expect(paths.get('history')).toBe('/accounts/details/history');
	});

	it('rebuilds canonical paths from parent links when stored paths are stale', () => {
		const staleRows = [
			rows[0],
			{
				...rows[1],
				mainPath: '/details',
			},
			{
				...rows[2],
				mainPath: '/history',
			},
		];

		const paths = computeCanonicalSubfolderMainPaths(staleRows);
		const canonicalRows = withCanonicalSubfolderMainPaths(staleRows);

		expect(paths.get('details')).toBe('/users/details');
		expect(paths.get('history')).toBe('/users/details/history');
		expect(canonicalRows[1].mainPath).toBe('/users/details');
		expect(canonicalRows[2].mainPath).toBe('/users/details/history');
	});

	it('finds path conflicts outside the updated subtree', () => {
		const paths = new Map([
			['users', '/accounts'],
			['details', '/accounts/details'],
		]);
		const conflict = findMainPathConflict(
			[
				...rows,
				{
					id: 'accounts',
					folderId: 'folder-1',
					parentId: null,
					name: 'Accounts',
					slug: 'accounts',
					mainPath: '/accounts',
				},
			],
			paths,
		);

		expect(conflict?.id).toBe('accounts');
	});

	it('orders subfolders so parents are imported before children', () => {
		const ordered = orderSubfoldersByHierarchy([rows[2], rows[1], rows[0]]);

		expect(ordered.map((row) => row.id)).toEqual(['users', 'details', 'history']);
	});
});
