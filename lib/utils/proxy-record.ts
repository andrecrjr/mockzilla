/**
 * Pure helpers for Proxy & Record (app/api/mock/[...path]/route.ts).
 */

export type RecordedMockMeta = {
	/** Id of the proxy mock that produced this recording. */
	recordedFrom?: string;
	recordedAt?: string;
};

/** Per-mock upstream request settings stored in `meta`. */
export type ProxyUpstreamConfig = {
	/** Sent to the upstream, replacing any incoming header of the same name. */
	headers: Record<string, string>;
	/** Added to the upstream query string, replacing incoming params of the same name. */
	queryParams: Record<string, string>;
	/** When false, no incoming headers are forwarded (only `headers` are sent). */
	forwardHeaders: boolean;
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

const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

function toStringRecord(value: unknown): Record<string, string> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
	const result: Record<string, string> = {};
	for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
		if (key.trim() && (typeof raw === 'string' || typeof raw === 'number')) {
			result[key.trim()] = String(raw);
		}
	}
	return result;
}

/** Reads the upstream settings from a mock's `meta`, ignoring malformed values. */
export function getProxyUpstreamConfig(meta: unknown): ProxyUpstreamConfig {
	const source =
		meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : {};
	return {
		headers: toStringRecord(source.proxyHeaders),
		queryParams: toStringRecord(source.proxyQueryParams),
		forwardHeaders: source.proxyForwardHeaders !== false,
	};
}

/**
 * Returns an error for header names fetch would reject or that the proxy
 * manages itself, so the editor can flag them before saving.
 */
export function validateProxyHeaderName(name: string): string | null {
	const trimmed = name.trim();
	if (!trimmed) return null;
	if (!HEADER_NAME.test(trimmed)) {
		return `"${trimmed}" is not a valid header name`;
	}
	if (DROPPED_REQUEST_HEADERS.has(trimmed.toLowerCase())) {
		return `"${trimmed}" is set automatically and cannot be overridden`;
	}
	return null;
}

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
	extraQueryParams: Record<string, string> = {},
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
	// Configured params win over incoming ones so a stored API key is not
	// replaced by whatever the caller sends.
	for (const [key, value] of Object.entries(extraQueryParams)) {
		url.searchParams.set(key, value);
	}
	return { ok: true, url };
}

/**
 * Builds the upstream request headers: safe incoming headers (unless
 * `forwardHeaders` is false) with the configured headers applied on top.
 * Header names compare case-insensitively.
 */
export function buildProxyRequestHeaders(
	headers: Headers,
	overrides: Record<string, string> = {},
	forwardHeaders = true,
): Record<string, string> {
	const forwarded: Record<string, string> = {};
	if (forwardHeaders) {
		headers.forEach((value, key) => {
			if (!DROPPED_REQUEST_HEADERS.has(key.toLowerCase())) {
				forwarded[key.toLowerCase()] = value;
			}
		});
	}
	for (const [name, value] of Object.entries(overrides)) {
		if (validateProxyHeaderName(name)) continue;
		forwarded[name.trim().toLowerCase()] = value;
	}
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

// ---------------------------------------------------------------------------
// First-class `proxy` settings for REST, MCP and CLI
// ---------------------------------------------------------------------------

/** Placeholder returned instead of a stored secret; sending it back keeps the stored value. */
export const REDACTED_VALUE = '***';

const SENSITIVE_NAME =
	/authorization|api[-_]?key|token|secret|cookie|password/i;

/** True for header/param names whose values are credentials. */
export function isSensitiveName(name: string): boolean {
	return SENSITIVE_NAME.test(name);
}

/**
 * Partial update of a mock's proxy settings. Omitted keys are unchanged and
 * `null` clears. `targetUrl: null` turns Proxy & Record off and removes the
 * headers, params, and forwarding flag too.
 */
export type ProxySettingsInput = {
	targetUrl?: string | null;
	headers?: Record<string, string> | null;
	queryParams?: Record<string, string> | null;
	forwardHeaders?: boolean | null;
};

export type ApplyProxyResult =
	| { ok: true; meta: Record<string, unknown> }
	| { ok: false; error: string };

const PROXY_META_KEYS = [
	'proxyTargetUrl',
	'proxyHeaders',
	'proxyQueryParams',
	'proxyForwardHeaders',
] as const;

function resolveRedacted(
	incoming: Record<string, string>,
	stored: Record<string, string>,
	label: string,
): { ok: true; value: Record<string, string> } | { ok: false; error: string } {
	const value: Record<string, string> = {};
	for (const [rawName, rawValue] of Object.entries(incoming)) {
		const name = rawName.trim();
		if (!name) continue;
		if (rawValue === REDACTED_VALUE) {
			const existing = Object.entries(stored).find(
				([storedName]) => storedName.toLowerCase() === name.toLowerCase(),
			);
			if (!existing) {
				return {
					ok: false,
					error: `${label} "${name}" has no stored value to keep; send the real value`,
				};
			}
			value[name] = existing[1];
		} else {
			value[name] = rawValue;
		}
	}
	return { ok: true, value };
}

/** Applies a partial `proxy` update to existing `meta`, validating the result. */
export function applyProxySettings(
	existingMeta: unknown,
	input: ProxySettingsInput,
): ApplyProxyResult {
	const meta: Record<string, unknown> =
		existingMeta &&
		typeof existingMeta === 'object' &&
		!Array.isArray(existingMeta)
			? { ...(existingMeta as Record<string, unknown>) }
			: {};
	const stored = getProxyUpstreamConfig(meta);

	if (input.targetUrl === null) {
		for (const key of PROXY_META_KEYS) delete meta[key];
		return { ok: true, meta };
	}

	if (input.targetUrl !== undefined) {
		const targetUrl = input.targetUrl.trim();
		const error = validateProxyTargetUrl(targetUrl);
		if (error) return { ok: false, error };
		if (targetUrl) {
			meta.proxyTargetUrl = targetUrl;
		} else {
			for (const key of PROXY_META_KEYS) delete meta[key];
			return { ok: true, meta };
		}
	}

	if (input.headers !== undefined) {
		for (const name of Object.keys(input.headers ?? {})) {
			const error = validateProxyHeaderName(name);
			if (error) return { ok: false, error };
		}
		const resolved = resolveRedacted(
			input.headers ?? {},
			stored.headers,
			'Header',
		);
		if (!resolved.ok) return resolved;
		if (Object.keys(resolved.value).length > 0) {
			meta.proxyHeaders = resolved.value;
		} else {
			delete meta.proxyHeaders;
		}
	}

	if (input.queryParams !== undefined) {
		const resolved = resolveRedacted(
			input.queryParams ?? {},
			stored.queryParams,
			'Query parameter',
		);
		if (!resolved.ok) return resolved;
		if (Object.keys(resolved.value).length > 0) {
			meta.proxyQueryParams = resolved.value;
		} else {
			delete meta.proxyQueryParams;
		}
	}

	if (input.forwardHeaders !== undefined) {
		if (input.forwardHeaders === false) {
			meta.proxyForwardHeaders = false;
		} else {
			delete meta.proxyForwardHeaders;
		}
	}

	const hasTarget =
		typeof meta.proxyTargetUrl === 'string' && meta.proxyTargetUrl.length > 0;
	if (
		!hasTarget &&
		(meta.proxyHeaders ||
			meta.proxyQueryParams ||
			input.forwardHeaders === false)
	) {
		return {
			ok: false,
			error:
				'Set proxy.targetUrl before adding headers, parameters, or forwarding rules',
		};
	}
	return { ok: true, meta };
}

function redactValues(record: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(record).map(([name, value]) => [
			name,
			isSensitiveName(name) ? REDACTED_VALUE : value,
		]),
	);
}

export type ProxySummary = {
	targetUrl: string;
	headers: Record<string, string>;
	queryParams: Record<string, string>;
	forwardHeaders: boolean;
};

/**
 * Proxy view of a mock for agents: credential values are replaced by
 * `***` (sending `***` back keeps the stored value). Null when the mock is
 * not a proxy and not a recording.
 */
export function summarizeProxy(
	meta: unknown,
	name?: string | null,
): { proxy: ProxySummary | null; recorded: boolean } {
	const source =
		meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : {};
	const targetUrl =
		typeof source.proxyTargetUrl === 'string' ? source.proxyTargetUrl : '';
	const upstream = getProxyUpstreamConfig(meta);
	return {
		proxy: targetUrl
			? {
					targetUrl,
					headers: redactValues(upstream.headers),
					queryParams: redactValues(upstream.queryParams),
					forwardHeaders: upstream.forwardHeaders,
				}
			: null,
		recorded: isRecordedMock(meta, name),
	};
}
