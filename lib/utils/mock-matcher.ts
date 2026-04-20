import type { MatchType } from '@/lib/types';

export interface MockVariant {
	key: string;
	body: string;
	statusCode: number;
	bodyType: string;
}

export interface MockCandidate {
	endpoint: string;
	matchType: MatchType;
	queryParams: Record<string, string> | null;
	_score: number;
}

// -------------------------------------------------------
// Wildcard matching (mirrors Chrome extension logic)
// -------------------------------------------------------

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function wildcardToRegex(p: string): RegExp {
	const s = String(p || '');
	const parts = s.split('*').map(escapeRegex);
	const pattern = parts.join('(.+?)');
	const anchored = s.includes('://') ? `^${pattern}$` : `^${pattern}$`;
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
		if (actual[key] !== value) return false;
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
	if (
		!pathMatchesPattern(requestPath, candidate.endpoint, candidate.matchType)
	) {
		return 0;
	}
	if (!queryParamsMatch(candidate.queryParams, urlQueryParams)) {
		return 0;
	}

	let score = MATCH_TYPE_SCORE[candidate.matchType];

	// Bonus for having query params requirement met (more specific)
	if (candidate.queryParams && Object.keys(candidate.queryParams).length > 0) {
		score += Object.keys(candidate.queryParams).length * 10;
	}

	// Tie-breaker: longer endpoint is more specific
	score += candidate.endpoint.length;

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

/**
 * Extracts the capture key from a URL matched against a wildcard pattern.
 * The key is formed by joining all captured wildcard segments with pipe.
 * Example: pattern "/api/users/WILDCARD" matching "/api/users/123" returns "123"
 * Example: pattern "/api/users/WILDCARD/status/WILDCARD" matching "/api/users/alice/status/active" returns "alice|active"
 */
export function extractCaptureKey(url: string, pattern: string): string | null {
	const result = matchWildcard(url, pattern);
	if (!result.ok || result.captures.length === 0) return null;
	return result.captures.join('|');
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

	const key = extractCaptureKey(urlPath, endpointPattern);
	if (key === null) return null;

	// Try exact match first
	const exactMatch = variants.find((v) => v.key === key);
	if (exactMatch) return exactMatch;

	// Fall back to wildcard catch-all variant
	return variants.find((v) => v.key === '*') ?? null;
}
