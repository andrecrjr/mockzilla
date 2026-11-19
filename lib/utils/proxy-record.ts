/**
 * Pure helpers for Proxy & Record (app/api/mock/[...path]/route.ts).
 */

export type RecordedMockMeta = {
	/** Id of the proxy mock that produced this recording. */
	recordedFrom?: string;
	recordedAt?: string;
};

export type ProxyTargetResult =
	| { ok: true; url: URL }
	| { ok: false; error: string };

// Hop-by-hop and length headers must not be forwarded; fetch rejects some of
// them (e.g. `connection`) and recomputes `content-length` itself.
const DROPPED_REQUEST_HEADERS = new Set([
	'host',
	'connection',
	'keep-alive',
	'proxy-connection',
	'proxy-authorization',
	'transfer-encoding',
	'te',
	'trailer',
	'upgrade',
	'content-length',
	'expect',
]);

const LEGACY_RECORDED_NAME_PREFIX = 'Auto-captured: ';
export const RECORDED_NAME_PREFIX = 'Recorded: ';

/** Validates a configured proxy target and returns an error message if not usable. */
export function validateProxyTargetUrl(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	let url: URL;
	try {
		url = new URL(trimmed.replace(/\*/g, 'x'));
	} catch {
		return 'Enter a full URL, including http:// or https://';
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return 'Proxy target must use http:// or https://';
	}
	return null;
}

/**
 * Builds the upstream URL: each `*` in the target is replaced by the matching
 * wildcard capture (in order), then the incoming query string is merged in.
 */
export function buildProxyTargetUrl(
	target: string,
	captures: string[],
	incomingSearchParams: URLSearchParams,
): ProxyTargetResult {
	const error = validateProxyTargetUrl(target);
	if (error) return { ok: false, error };

	let captureIndex = 0;
	const substituted = target.trim().replace(/\*/g, () => {
		const capture = captures[captureIndex] ?? '';
		captureIndex += 1;
		return capture;
	});

	let url: URL;
	try {
		url = new URL(substituted);
	} catch {
		return { ok: false, error: `Invalid proxy target URL: ${substituted}` };
	}
	incomingSearchParams.forEach((value, key) => {
		url.searchParams.set(key, value);
	});
	return { ok: true, url };
}

/** Copies request headers that are safe to forward upstream. */
export function buildProxyRequestHeaders(
	headers: Headers,
): Record<string, string> {
	const forwarded: Record<string, string> = {};
	headers.forEach((value, key) => {
		if (!DROPPED_REQUEST_HEADERS.has(key.toLowerCase())) {
			forwarded[key] = value;
		}
	});
	return forwarded;
}

/** Name for a recorded mock, e.g. `Recorded: GET /users?page=1`. */
export function buildRecordedMockName(
	method: string,
	mockPath: string,
	queryParams: Record<string, string>,
): string {
	const query = new URLSearchParams(queryParams).toString();
	return `${RECORDED_NAME_PREFIX}${method} ${mockPath}${query ? `?${query}` : ''}`;
}

/**
 * True for mocks created by Proxy & Record (current meta flag or the legacy
 * auto-generated name). Recordings only answer the exact query they captured.
 */
export function isRecordedMock(
	meta: unknown,
	name: string | null | undefined,
): boolean {
	const recordedFrom =
		meta && typeof meta === 'object'
			? (meta as RecordedMockMeta).recordedFrom
			: undefined;
	return (
		Boolean(recordedFrom) ||
		Boolean(name?.startsWith(LEGACY_RECORDED_NAME_PREFIX))
	);
}
