import type { MatchType, MockVariant } from '@/lib/types';
import { splitPathSearchParams } from './mock-paths';
import { normalizeMockVariant } from './mock-variants';

export type { MockVariant } from '@/lib/types';

export interface MockCandidate {
	endpoint: string;
	matchType: MatchType;
	queryParams: Record<string, string> | null;
	_score: number;
	_id?: string;
}

// -------------------------------------------------------
// Wildcard matching (mirrors Chrome extension logic)
// -------------------------------------------------------

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function queryParamValueMatches(expected: string, actual: string): boolean {
	const expectedValue = String(expected ?? '');
	const actualValue = String(actual ?? '');

	if (!expectedValue.includes('*')) return expectedValue === actualValue;

	const pattern = expectedValue.split('*').map(escapeRegex).join('.*');
	return new RegExp(`^${pattern}$`).test(actualValue);
}

export function wildcardToRegex(p: string): RegExp {
	const s = String(p || '');
	const parts = s.split('*').map(escapeRegex);
	const pattern = parts.join('(.+?)');
	const anchored = s.includes('://') ? `^${pattern}$` : `${pattern}$`;
	return new RegExp(anchored);
}

export function matchWildcard(
	url: string,
	pattern: string,
): { ok: boolean; captures: string[] } {
	const p = String(pattern || '');
	const re = wildcardToRegex(p);
	const m = re.exec(url);
	if (!m) return { ok: false, captures: [] };
	const caps = m.slice(1);
	return { ok: true, captures: caps };
}

// -------------------------------------------------------
// Query params matching
// -------------------------------------------------------

export function queryParamsMatch(
	required: Record<string, string> | null | undefined,
	actual: Record<string, string>,
): boolean {
	if (!required || Object.keys(required).length === 0) return true;
	for (const [key, value] of Object.entries(required)) {
		if (!Object.hasOwn(actual, key)) return false;
		if (!queryParamValueMatches(value, actual[key])) return false;
	}
	return true;
}

// -------------------------------------------------------
// Path matching per matchType
// -------------------------------------------------------

function pathMatchesPattern(
	requestPath: string,
	endpoint: string,
	matchType: MatchType,
): boolean {
	switch (matchType) {
		case 'exact':
			return requestPath === endpoint;
		case 'wildcard':
			return matchWildcard(requestPath, endpoint).ok;
		case 'substring':
			return requestPath.includes(endpoint);
		default:
			return requestPath === endpoint;
	}
}

// -------------------------------------------------------
// Best match selection
// -------------------------------------------------------

const MATCH_TYPE_SCORE: Record<MatchType, number> = {
	exact: 300,
	wildcard: 200,
	substring: 100,
};

function scoreCandidate(
	candidate: MockCandidate,
	requestPath: string,
	urlQueryParams: Record<string, string>,
): number {
	const parsedRequest = splitPathSearchParams(requestPath);
	const parsedEndpoint = splitPathSearchParams(candidate.endpoint);
	const actualQueryParams = {
		...parsedRequest.queryParams,
		...urlQueryParams,
	};
	const requiredQueryParams = {
		...parsedEndpoint.queryParams,
		...(candidate.queryParams ?? {}),
	};

	if (
		!pathMatchesPattern(
			parsedRequest.path,
			parsedEndpoint.path,
			candidate.matchType,
		)
	) {
		return 0;
	}
	if (!queryParamsMatch(requiredQueryParams, actualQueryParams)) {
		return 0;
	}

	let score = MATCH_TYPE_SCORE[candidate.matchType];

	// Bonus for having query params requirement met (more specific)
	if (Object.keys(requiredQueryParams).length > 0) {
		score += Object.keys(requiredQueryParams).length * 10;
		// Exact query values are more specific than wildcard values.
		score += Object.values(requiredQueryParams).filter(
			(value) => !String(value ?? '').includes('*'),
		).length;
	}

	// Tie-breaker: longer endpoint is more specific
	score += parsedEndpoint.path.length;

	return score;
}

export function findBestMatch(
	requestPath: string,
	urlQueryParams: Record<string, string>,
	candidates: MockCandidate[],
): MockCandidate | null {
	let best: MockCandidate | null = null;
	let bestScore = 0;

	for (const c of candidates) {
		const score = scoreCandidate(c, requestPath, urlQueryParams);
		c._score = score;
		if (score > bestScore) {
			bestScore = score;
			best = c;
		}
	}

	return best;
}

// -------------------------------------------------------
// Variant selection (mirrors Chrome extension logic)
// -------------------------------------------------------

/** Extracts wildcard values in endpoint order without serializing them. */
export function extractCaptureValues(
	url: string,
	pattern: string,
): string[] | null {
	const parsedUrl = splitPathSearchParams(url);
	const parsedPattern = splitPathSearchParams(pattern);
	const result = matchWildcard(parsedUrl.path, parsedPattern.path);
	if (!result.ok || result.captures.length === 0) return null;
	return result.captures;
}

/**
 * Legacy capture-key helper. New code should use extractCaptureValues so URL
 * values never need a delimiter. The pipe format remains for compatibility.
 */
export function extractCaptureKey(url: string, pattern: string): string | null {
	return extractCaptureValues(url, pattern)?.join('|') ?? null;
}

/**
 * Normalizes a key for variant lookup without changing the capture value that
 * is later exposed to response templates. This lets users enter ordinary URL
 * characters (for example `/`) in a variant key while also supporting an
 * encoded request value such as `%2F`.
 */
function normalizeVariantKey(key: string): string {
	try {
		return decodeURIComponent(key);
	} catch {
		// Keep malformed percent sequences matchable as literal text.
		return key;
	}
}

/**
 * Selects a matching variant from a wildcard mock's variants array.
 * Tries exact key match first, then falls back to "*" wildcard catch-all variant.
 * Returns null if no variant matches or if the mock has no variants.
 */
export function selectVariant(
	variants: MockVariant[] | null,
	urlPath: string,
	endpointPattern: string,
): MockVariant | null {
	if (!variants || variants.length === 0) return null;

	const captures = extractCaptureValues(urlPath, endpointPattern);
	if (captures === null) return null;

	const normalizedCaptures = captures.map(normalizeVariantKey);
	const exactMatch = variants.find((variant) => {
		const normalizedVariant = normalizeMockVariant(variant, endpointPattern);
		return (
			!normalizedVariant.isFallback &&
			normalizedVariant.captures.length === normalizedCaptures.length &&
			normalizedVariant.captures.every(
				(capture, index) =>
					normalizeVariantKey(capture) === normalizedCaptures[index],
			)
		);
	});
	if (exactMatch) return exactMatch;

	// Fall back to an explicitly marked or legacy wildcard variant.
	return (
		variants.find(
			(variant) => normalizeMockVariant(variant, endpointPattern).isFallback,
		) ?? null
	);
}
