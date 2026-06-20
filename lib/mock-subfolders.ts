import { joinMockPaths } from '@/lib/utils/mock-paths';

export interface MockSubfolderHierarchyRow {
	id: string;
	folderId: string;
	parentId?: string | null;
	name: string;
	slug: string;
	mainPath: string;
}

export function deriveSubfolderMainPath(
	parentMainPath: string | null | undefined,
	slug: string,
): string {
	return joinMockPaths(parentMainPath ?? '/', `/${slug}`);
}

export function collectDescendantSubfolders<
	TRow extends Pick<MockSubfolderHierarchyRow, 'id' | 'parentId'>,
>(rows: TRow[], parentId: string): TRow[] {
	const descendants: TRow[] = [];
	const visit = (id: string) => {
		for (const row of rows) {
			if (row.parentId !== id) continue;
			descendants.push(row);
			visit(row.id);
		}
	};
	visit(parentId);
	return descendants;
}

export function computeSubtreeMainPaths<
	TRow extends Pick<MockSubfolderHierarchyRow, 'id' | 'parentId' | 'slug' | 'mainPath'>,
>(rows: TRow[], root: TRow): Map<string, string> {
	const nextPaths = new Map<string, string>([[root.id, root.mainPath]]);
	const visit = (parent: TRow) => {
		const parentMainPath = nextPaths.get(parent.id) ?? parent.mainPath;
		for (const child of rows) {
			if (child.parentId !== parent.id) continue;
			const childMainPath = deriveSubfolderMainPath(parentMainPath, child.slug);
			nextPaths.set(child.id, childMainPath);
			visit({ ...child, mainPath: childMainPath });
		}
	};
	visit(root);
	return nextPaths;
}

export function findMainPathConflict<
	TRow extends Pick<MockSubfolderHierarchyRow, 'id' | 'mainPath'>,
>(rows: TRow[], nextPaths: Map<string, string>): TRow | null {
	const updatedIds = new Set(nextPaths.keys());
	const nextPathValues = new Set(nextPaths.values());
	return (
		rows.find(
			(row) => !updatedIds.has(row.id) && nextPathValues.has(row.mainPath),
		) ?? null
	);
}

export function orderSubfoldersByHierarchy<
	TRow extends Pick<MockSubfolderHierarchyRow, 'id' | 'parentId'>,
>(rows: TRow[]): TRow[] {
	const pending = [...rows];
	const ordered: TRow[] = [];
	const seen = new Set<string>();

	while (pending.length > 0) {
		const before = pending.length;
		for (let index = pending.length - 1; index >= 0; index--) {
			const row = pending[index];
			if (!row.parentId || seen.has(row.parentId)) {
				ordered.push(row);
				seen.add(row.id);
				pending.splice(index, 1);
			}
		}

		if (pending.length === before) {
			ordered.push(...pending.splice(0));
		}
	}

	return ordered;
}
