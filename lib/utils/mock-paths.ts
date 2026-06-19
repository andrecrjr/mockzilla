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

export function joinMockPaths(basePath: string | null | undefined, mockPath: string): string {
	const normalizedBase = normalizeAbsolutePath(basePath || '/');
	const normalizedMock = normalizeRelativeMockPath(mockPath);
	if (normalizedBase === '/') return normalizedMock;
	if (normalizedMock === '/') return normalizedBase;
	return normalizeAbsolutePath(`${normalizedBase}/${normalizedMock.slice(1)}`);
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
