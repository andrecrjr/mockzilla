export function normalizeFolderPath(value: string): string {
	const trimmed = value.trim().toLowerCase();
	if (!trimmed) return '';

	const parts = trimmed
		.split('/')
		.map((part) =>
			part
				.trim()
				.replace(/\s+/g, '-')
				.replace(/[^a-z0-9-]/g, ''),
		)
		.filter(Boolean);

	if (parts.length === 0) return '';
	return `/${parts.join('/')}`;
}

export function formatStoredFolderPath(value: string): string {
	return normalizeFolderPath(value.startsWith('/') ? value : `/${value}`);
}

export function validateFolderPath(
	value: string,
): { valid: true } | { valid: false; error: string } {
	if (!value) {
		return { valid: false, error: 'Folder path cannot be empty' };
	}
	if (value.length > 200) {
		return { valid: false, error: 'Folder path must be 200 characters or less' };
	}
	if (/[?#]/.test(value)) {
		return { valid: false, error: 'Folder path cannot contain "?" or "#"' };
	}
	if (/\s/.test(value)) {
		return { valid: false, error: 'Folder path cannot contain spaces' };
	}
	if (!value.startsWith('/')) {
		return { valid: false, error: 'Folder path must start with "/"' };
	}
	if (value === '/') {
		return { valid: false, error: 'Folder path cannot be "/"' };
	}
	if (value.includes('//')) {
		return { valid: false, error: 'Folder path cannot contain empty segments' };
	}

	const parts = value.split('/').filter(Boolean);
	if (parts.length === 0) {
		return { valid: false, error: 'Folder path cannot be empty' };
	}
	if (parts.some((part) => !/^[a-z0-9-]+$/.test(part))) {
		return {
			valid: false,
			error:
				'Folder path segments can only contain lowercase letters, numbers, and hyphens',
		};
	}
	if (parts.some((part) => part.startsWith('-') || part.endsWith('-'))) {
		return {
			valid: false,
			error: 'Folder path segments cannot start or end with a hyphen',
		};
	}
	return { valid: true };
}

export function getFolderPathSegments(folderPath: string): string[] {
	return formatStoredFolderPath(folderPath).split('/').filter(Boolean);
}

export function getFolderLookupCandidates(value: string): string[] {
	const canonical = normalizeFolderPath(value);
	const raw = value.trim();
	const withoutLeadingSlash = canonical.startsWith('/') ? canonical.slice(1) : canonical;
	return Array.from(new Set([raw, canonical, withoutLeadingSlash].filter(Boolean)));
}

export function hasFolderPathConflict(
	existingPaths: string[],
	nextPath: string,
): boolean {
	return existingPaths.some(
		(existingPath) =>
			existingPath === nextPath ||
			existingPath.startsWith(`${nextPath}/`) ||
			nextPath.startsWith(`${existingPath}/`),
	);
}

export function buildFolderHref(folderPath: string): string {
	return `/app/folder${formatStoredFolderPath(folderPath)}`;
}

export function buildExtensionFolderHref(folderPath: string): string {
	return `/app/extension-data${formatStoredFolderPath(folderPath)}`;
}

export function buildMockEditorHref(
	mockId: string,
	folderPath: string,
): string {
	return `/app/mock/${mockId}?folder=${encodeURIComponent(
		formatStoredFolderPath(folderPath),
	)}`;
}

export function buildMockApiBasePath(folderPath: string): string {
	return `/api/mock${formatStoredFolderPath(folderPath)}`;
}

export interface FolderPathMatch<TRow> {
	folder: TRow;
	folderPath: string;
	matchedSegments: number;
}

export function matchFolderByPathSegments<TRow extends { slug: string }>(
	rows: TRow[],
	pathSegments: string[],
): FolderPathMatch<TRow> | null {
	let bestMatch: FolderPathMatch<TRow> | null = null;

	for (const row of rows) {
		const folderPath = formatStoredFolderPath(row.slug);
		const folderSegments = getFolderPathSegments(folderPath);
		if (folderSegments.length === 0 || folderSegments.length > pathSegments.length) {
			continue;
		}

		const matches = folderSegments.every(
			(segment, index) => pathSegments[index] === segment,
		);
		if (!matches) continue;

		if (!bestMatch || folderSegments.length > bestMatch.matchedSegments) {
			bestMatch = {
				folder: row,
				folderPath,
				matchedSegments: folderSegments.length,
			};
		}
	}

	return bestMatch;
}
