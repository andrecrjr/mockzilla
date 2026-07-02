export function normalizeAbsolutePath(path: string): string {
	const trimmed = path.trim();
	if (!trimmed || trimmed === '/') return '/';
	const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
	const collapsed = withLeadingSlash.replace(/\/+/g, '/');
	return collapsed.length > 1 && collapsed.endsWith('/')
		? collapsed.slice(0, -1)
		: collapsed;
}

export function normalizeRelativeMockPath(path: string): string {
	return normalizeAbsolutePath(path);
}

export function joinMockPaths(
	basePath: string | null | undefined,
	mockPath: string,
): string {
	const normalizedBase = normalizeAbsolutePath(basePath || '/');
	const normalizedMock = normalizeRelativeMockPath(mockPath);
	if (normalizedBase === '/') return normalizedMock;
	if (normalizedMock === '/') return normalizedBase;
	return normalizeAbsolutePath(`${normalizedBase}/${normalizedMock.slice(1)}`);
}

export function stripMockPathPrefix(
	path: string,
	prefix: string | null | undefined,
): string {
	const normalizedPath = normalizeAbsolutePath(path);
	const normalizedPrefix = normalizeAbsolutePath(prefix || '/');
	if (normalizedPrefix === '/') return normalizedPath;
	if (normalizedPath === normalizedPrefix) return '/';
	if (!normalizedPath.startsWith(`${normalizedPrefix}/`)) return normalizedPath;
	return normalizeAbsolutePath(normalizedPath.slice(normalizedPrefix.length));
}

export function getMockFolderRelativePath(
	path: string,
	mockFolderMainPath: string | null | undefined,
	folderSlug?: string | null,
): string {
	const normalizedPath = normalizeAbsolutePath(path);
	const normalizedMockFolderPath = normalizeAbsolutePath(
		mockFolderMainPath || '/',
	);
	const withoutPublicMockPrefix = folderSlug
		? stripMockPathPrefix(normalizedPath, `/api/mock/${folderSlug}`)
		: normalizedPath;
	let withoutFolderSlug = withoutPublicMockPrefix;

	if (folderSlug && normalizedMockFolderPath !== '/') {
		const candidatePath = stripMockPathPrefix(
			withoutPublicMockPrefix,
			`/${folderSlug}`,
		);
		const candidateIncludesMockFolder =
			candidatePath === normalizedMockFolderPath ||
			candidatePath.startsWith(`${normalizedMockFolderPath}/`);
		if (candidateIncludesMockFolder) {
			withoutFolderSlug = candidatePath;
		}
	}

	return stripMockPathPrefix(withoutFolderSlug, normalizedMockFolderPath);
}

export function getServedMockPath(
	mockFolderMainPath: string | null | undefined,
	mockPath: string,
	folderSlug?: string | null,
): string {
	return joinMockPaths(
		mockFolderMainPath,
		getMockFolderRelativePath(mockPath, mockFolderMainPath, folderSlug),
	);
}

function getPathnameFromInput(value: string): string {
	const trimmed = value.trim();
	if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
		try {
			return new URL(trimmed).pathname;
		} catch {
			return trimmed;
		}
	}
	return trimmed;
}

export function normalizeSubfolderSlugInput(
	value: string,
	parentMainPath: string | null | undefined,
	folderSlug?: string | null,
): string {
	const pathname = getPathnameFromInput(value);
	const normalizedParent = normalizeAbsolutePath(parentMainPath || '/');
	const absolutePath = normalizeAbsolutePath(pathname);
	const pathLikeInput = pathname.includes('/');
	let relativeInput = pathname;

	if (pathLikeInput) {
		const withoutPublicMockPrefix = folderSlug
			? stripMockPathPrefix(absolutePath, `/api/mock/${folderSlug}`)
			: absolutePath;
		const withoutFolderSlug =
			folderSlug && normalizedParent !== '/'
				? stripMockPathPrefix(withoutPublicMockPrefix, `/${folderSlug}`)
				: withoutPublicMockPrefix;
		const withoutParent = stripMockPathPrefix(
			withoutFolderSlug,
			normalizedParent,
		);
		const segments = withoutParent.split('/').filter(Boolean);
		relativeInput = segments.at(-1) ?? withoutParent;
	}

	return generateSlug(relativeInput);
}

export interface SplitPathSearchParamsResult {
	path: string;
	queryParams: Record<string, string>;
}

function normalizePathPart(path: string): string {
	if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return path;
	return normalizeAbsolutePath(path);
}

export function splitPathSearchParams(
	path: string,
): SplitPathSearchParamsResult {
	const trimmed = path.trim();
	const queryStart = trimmed.indexOf('?');
	if (queryStart === -1) {
		return { path: normalizePathPart(trimmed), queryParams: {} };
	}

	const pathPart = trimmed.slice(0, queryStart);
	const searchWithHash = trimmed.slice(queryStart + 1);
	const hashStart = searchWithHash.indexOf('#');
	const search =
		hashStart === -1 ? searchWithHash : searchWithHash.slice(0, hashStart);

	return {
		path: normalizePathPart(pathPart),
		queryParams: Object.fromEntries(new URLSearchParams(search).entries()),
	};
}

export function hasSearchParamsInEndpointPath(path: string): boolean {
	return path.trim().includes('?');
}

export function hasConfiguredQueryParams(
	queryParams: Record<string, string> | null | undefined,
): boolean {
	if (!queryParams) return false;
	return Object.keys(queryParams).some((key) => key.trim().length > 0);
}

export function validateEndpointPathSearchParams(
	path: string,
	queryParams?: Record<string, string> | null,
): { valid: true } | { valid: false; error: string } {
	if (!hasSearchParamsInEndpointPath(path)) return { valid: true };

	const error = hasConfiguredQueryParams(queryParams)
		? 'Endpoint path cannot include search params when queryParams are configured. Remove the ?... portion from the path and keep those values in queryParams.'
		: 'Endpoint path cannot include search params. Remove the ?... portion from the path and configure query params separately when matching query strings.';

	return { valid: false, error };
}

export function generateSlug(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}
