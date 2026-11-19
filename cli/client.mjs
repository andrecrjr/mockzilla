// @ts-check

/**
 * @param {string} value
 * @returns {string}
 */
export function normalizeBaseUrl(value) {
	let url;
	try {
		url = new URL(value);
	} catch {
		throw new Error(`Invalid Mockzilla URL: ${value}`);
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('Mockzilla URL must use http:// or https://.');
	}
	if (url.search || url.hash) {
		throw new Error('Mockzilla URL must not include a query string or hash.');
	}
	return url.toString().replace(/\/$/, '');
}

/**
 * @typedef {(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} FetchImpl
 */

/**
 * @typedef {{
 *   baseUrl: string;
 *   fetchImpl?: FetchImpl;
 * }} ClientOptions
 */

/**
 * @param {ClientOptions} options
 */
export function createClient({ baseUrl, fetchImpl = fetch }) {
	const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

	return {
		/**
		 * @param {string} path
		 * @param {RequestInit} [init]
		 * @returns {Promise<unknown>}
		 */
		async request(path, init = {}) {
			const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
				...init,
				headers: {
					accept: 'application/json',
					...(init.headers || {}),
				},
			});
			const body = await parseResponseBody(response);

			if (!response.ok) {
				throw new HttpError(response.status, response.statusText, body);
			}
			return body;
		},
	};
}

/**
 * @param {Response} response
 * @returns {Promise<unknown>}
 */
async function parseResponseBody(response) {
	const text = await response.text();
	if (!text) return null;
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

export class HttpError extends Error {
	/** @type {number} */
	status;

	/**
	 * @param {number} status
	 * @param {string} statusText
	 * @param {unknown} body
	 */
	constructor(status, statusText, body) {
		const detail = getResponseError(body);
		super(detail || `${status} ${statusText || 'Request failed'}`);
		this.name = 'HttpError';
		this.status = status;
	}
}

/**
 * @param {unknown} body
 * @returns {string | null}
 */
function getResponseError(body) {
	if (typeof body === 'string') return body;
	if (typeof body !== 'object' || body === null) return null;
	if ('error' in body && typeof body.error === 'string') return body.error;
	if ('message' in body && typeof body.message === 'string') {
		return body.message;
	}
	return null;
}
