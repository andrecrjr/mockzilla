import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { folders, mockResponses } from '@/lib/db/schema';
import { type Logger, logger } from '@/lib/logger';
import type { HttpMethod, MatchType, MockVariant } from '@/lib/types';
import type { MockCandidate } from '@/lib/utils/mock-matcher';
import {
	extractCaptureKey,
	findBestMatch,
	queryParamsMatch,
	selectVariant as selectMockVariant,
} from '@/lib/utils/mock-matcher';

type MockResponseRecord = typeof mockResponses.$inferSelect;

function getQueryParamCount(queryParams: unknown): number {
	if (!queryParams || typeof queryParams !== 'object' || Array.isArray(queryParams)) {
		return 0;
	}

	return Object.keys(queryParams).length;
}

function hasProxyTarget(mock: MockResponseRecord): boolean {
	const meta = mock.meta as { proxyTargetUrl?: string } | null;
	return Boolean(meta?.proxyTargetUrl);
}

function getCreatedAtTime(mock: MockResponseRecord): number {
	return mock.createdAt instanceof Date ? mock.createdAt.getTime() : 0;
}

function selectExactMock(
	mocks: MockResponseRecord[],
	urlQueryParams: Record<string, string>,
): MockResponseRecord | undefined {
	return mocks
		.filter((mock) =>
			queryParamsMatch(
				mock.queryParams as Record<string, string> | null,
				urlQueryParams,
			),
		)
		.sort((a, b) => {
			const querySpecificity =
				getQueryParamCount(b.queryParams) - getQueryParamCount(a.queryParams);
			if (querySpecificity !== 0) return querySpecificity;

			if (hasProxyTarget(a) !== hasProxyTarget(b)) {
				return hasProxyTarget(a) ? 1 : -1;
			}

			return getCreatedAtTime(b) - getCreatedAtTime(a);
		})[0];
}

async function handleRequest(request: NextRequest, params: { path: string[] }) {
	const reqId = crypto.randomUUID();
	const pathSegments = params.path;
	const method = (request.method as HttpMethod) || 'GET';

	// Expected format: /mock/{folderSlug}/{mockPath...}
	// If only folderSlug provided (1 segment), treat as root path "/"
	if (pathSegments.length < 1) {
		return NextResponse.json(
			{ error: 'Invalid mock URL format' },
			{ status: 400 },
		);
	}

	const folderSlug = pathSegments[0];
	let mockPath =
		pathSegments.length === 1 ? '/' : `/${pathSegments.slice(1).join('/')}`;

	// Normalize: remove trailing slash for consistency
	if (mockPath.endsWith('/') && mockPath.length > 1) {
		mockPath = mockPath.slice(0, -1);
	}

	// Extract query params from request URL
	const url = request.nextUrl;
	const urlQueryParams = Object.fromEntries(url.searchParams.entries());

	// Create a scoped logger for this request
	const log = logger.child({
		reqId,
		path: mockPath,
		method,
		type: 'intercept',
	});
	log.info('Incoming request');

	try {
		// Find the folder by slug
		const [folder] = await db
			.select()
			.from(folders)
			.where(eq(folders.slug, folderSlug))
			.limit(1);

		if (!folder) {
			log.warn({ folderSlug }, 'Folder not found');
			return NextResponse.json(
				{ error: 'Folder not found', folderSlug },
				{ status: 404 },
			);
		}

		// --- Phase 1: Exact match (existing behavior, zero breaking change) ---
		const exactMocks = await db
			.select()
			.from(mockResponses)
			.where(
				and(
					eq(mockResponses.folderId, folder.id),
					eq(mockResponses.endpoint, mockPath),
					eq(mockResponses.method, method),
					eq(mockResponses.enabled, true),
				),
			);

		const exactMock = selectExactMock(exactMocks, urlQueryParams);
		if (exactMock && exactMock.matchType === 'exact') {
			log.info({ mockId: exactMock.id }, 'Phase 1: Exact match found');
			// Handle response delay if configured
			if (exactMock.delay && exactMock.delay > 0) {
				log.info({ delay: exactMock.delay }, 'Applying response delay');
				await new Promise((resolve) => setTimeout(resolve, exactMock.delay));
			}
			return await buildResponse(exactMock, request, {}, log, mockPath);
		} else if (exactMock) {
			// Found by exact path but matchType is not 'exact' — this means
			// the endpoint happens to equal the path but is configured as wildcard/substring.
			// We still need to evaluate it properly in Phase 2.
		}

		// --- Phase 2: Fallback — fetch all mocks for folder+method and evaluate ---
		const allMocks = await db
			.select()
			.from(mockResponses)
			.where(
				and(
					eq(mockResponses.folderId, folder.id),
					eq(mockResponses.method, method),
					eq(mockResponses.enabled, true),
				),
			);

		// Build candidates (include full mock reference for variant lookup)
		const candidates: MockCandidate[] = allMocks.map((m) => ({
			endpoint: m.endpoint,
			matchType: (m.matchType as MatchType) || 'exact',
			queryParams: (m.queryParams as Record<string, string> | null) ?? null,
			_score: 0,
			_id: m.id,
		}));

		const best = findBestMatch(mockPath, urlQueryParams, candidates);

		if (!best) {
			log.warn('No matching mock found');
			return NextResponse.json(
				{
					error: 'Mock endpoint not found',
					folder: folderSlug,
					path: mockPath,
					method,
				},
				{ status: 404 },
			);
		}

		// Find the full mock record for the best match
		const bestMock = allMocks.find(
			(m) =>
				m.endpoint === best.endpoint &&
				((m.matchType as MatchType) || 'exact') === best.matchType &&
				JSON.stringify(m.queryParams) === JSON.stringify(best.queryParams),
		);

		if (!bestMock) {
			log.error('Match found in Phase 2 but database record lookup failed');
			return NextResponse.json(
				{
					error: 'Mock endpoint not found',
					folder: folderSlug,
					path: mockPath,
					method,
				},
				{ status: 404 },
			);
		}

		log.info(
			{ mockId: bestMock.id, matchType: bestMock.matchType },
			'Phase 2: Fallback match found',
		);

		// Handle response delay if configured
		if (bestMock.delay && bestMock.delay > 0) {
			log.info({ delay: bestMock.delay }, 'Applying response delay');
			await new Promise((resolve) => setTimeout(resolve, bestMock.delay));
		}

		// For wildcard mocks with variants, try to select a matching variant
		if (bestMock.matchType === 'wildcard') {
			const variants = bestMock.variants as MockVariant[] | null;
			const wildcardRequireMatch = bestMock.wildcardRequireMatch || false;

			if (variants && variants.length > 0) {
				const variant = selectMockVariant(
					variants,
					mockPath,
					bestMock.endpoint,
				);
				if (variant) {
					log.info({ variantKey: variant.key }, 'Wildcard variant matched');
					// Use variant's body, statusCode, bodyType
					const variantMock = {
						...bestMock,
						response: variant.body,
						statusCode: variant.statusCode,
						bodyType: variant.bodyType as 'json' | 'text',
						useDynamicResponse: false, // Ensure variants always return their static body
					};
					const captures =
						extractCaptureKey(mockPath, bestMock.endpoint)?.split('|') || [];
					const paramsMap: Record<string, string> = {};
					for (let i = 0; i < captures.length; i++) {
						paramsMap[String(i)] = captures[i];
					}
					return await buildResponse(variantMock, request, paramsMap, log, mockPath);
				}

				// No variant matched
				if (wildcardRequireMatch) {
					log.warn('Wildcard requires match but no variant found');
					return NextResponse.json(
						{
							error: 'No matching variant found',
							folder: folderSlug,
							path: mockPath,
							method,
						},
						{ status: 404 },
					);
				}
				// Fall back to default mock body
			}
		}

		const captures =
			bestMock.matchType === 'wildcard'
				? extractCaptureKey(mockPath, bestMock.endpoint)?.split('|') || []
				: [];
		const paramsMap: Record<string, string> = {};
		for (let i = 0; i < captures.length; i++) {
			paramsMap[String(i)] = captures[i];
		}

		return await buildResponse(bestMock, request, paramsMap, log, mockPath);
	} catch (error) {
		log.error({ err: error }, 'Internal Server Error during mock processing');
		return NextResponse.json(
			{ error: 'Internal Server Error', details: String(error) },
			{ status: 500 },
		);
	}
}

async function buildResponse(
	mock: typeof mockResponses.$inferSelect,
	request: NextRequest,
	paramsMap: Record<string, string> = {},
	log: Logger,
	mockPath = '/',
): Promise<NextResponse> {
	log.debug({ mockId: mock.id }, 'Building response');
	const meta = mock.meta as { proxyTargetUrl?: string } | null;
	if (meta?.proxyTargetUrl) {
		const urlQueryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
		const method = (request.method as HttpMethod) || 'GET';

		return await handleProxyAndRecord(
			meta.proxyTargetUrl,
			mock.folderId,
			mockPath,
			method,
			request,
			urlQueryParams,
			log,
		);
	}

	// Check if we should echo the request body
	if (mock.echoRequestBody) {
		return handleEchoRequestBody(mock, request, log);
	}

	// Extract query params and headers from request
	const url = request.nextUrl;
	const urlQueryParams = Object.fromEntries(url.searchParams.entries());
	const requestHeaders = Object.fromEntries(request.headers.entries());

	const { faker } = await import('@faker-js/faker');

	const context = {
		input: {
			query: urlQueryParams,
			params: paramsMap,
			headers: requestHeaders,
		},
		// Support $. aliases
		query: urlQueryParams,
		params: paramsMap,
		headers: requestHeaders,
		// Explicit $ alias for Handlebars
		$: {
			query: urlQueryParams,
			params: paramsMap,
			headers: requestHeaders,
		},
		// Add faker to context
		faker,
	};

	// Check if this mock uses dynamic schema-based responses
	if (mock.useDynamicResponse && mock.jsonSchema) {
		return handleDynamicResponse(mock, context, log);
	}

	// Apply template replacement to static responses
	const { replaceTemplates } = await import('@/lib/engine/interpolation');
	const templatedResult = replaceTemplates(mock.response, context);

	// Return the mock response with the configured status code
	const contentType =
		mock.bodyType === 'json' ? 'application/json' : 'text/plain';

	log.info({ statusCode: mock.statusCode }, 'Returning static response');

	if (mock.bodyType === 'json') {
		if (typeof templatedResult === 'object' && templatedResult !== null) {
			return NextResponse.json(templatedResult, {
				status: mock.statusCode,
			});
		}

		try {
			// If it's a string, try parsing it as JSON (Handlebars might have produced a JSON string)
			return NextResponse.json(JSON.parse(String(templatedResult)), {
				status: mock.statusCode,
			});
		} catch {
			// If parsing fails, return as text
			return new NextResponse(String(templatedResult), {
				status: mock.statusCode,
				headers: { 'Content-Type': contentType },
			});
		}
	}

	return new NextResponse(String(templatedResult), {
		status: mock.statusCode,
		headers: { 'Content-Type': contentType },
	});
}
async function handleProxyAndRecord(
	targetUrlString: string,
	folderId: string,
	mockPath: string,
	method: HttpMethod,
	request: NextRequest,
	queryParams: Record<string, string>,
	log: Logger,
): Promise<NextResponse> {
	log.info({ targetUrlString, mockPath }, 'Proxying request to target');

	const url = new URL(request.url);
	const targetUrl = new URL(targetUrlString);

	// Preserve incoming query params
	url.searchParams.forEach((value, key) => {
		targetUrl.searchParams.set(key, value);
	});
	try {
		// Disable SSL verification for proxy calls in dev environments
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

		const requestClone = request.clone();
		const headers = Object.fromEntries(request.headers.entries());

		delete headers.host; // Cloudflare requirement: dont send localhost as Host header

		const response = await fetch(targetUrl.toString(), {
			method,
			headers,
			body: ["GET", "HEAD"].includes(method) ? null : await requestClone.text(),
		});

		const responseText = await response.text();
		const contentType = response.headers.get("content-type") || "text/plain";
		const bodyType = contentType.includes("application/json") ? "json" : "text";

		log.info(
			{ statusCode: response.status, bodyType },
			"Received proxy response, recording mock",
		);

		// Save the recorded mock
		await db.insert(mockResponses).values({
			name: `Auto-captured: ${method} ${mockPath}`,
			endpoint: mockPath,
			method,
			statusCode: response.status,
			response: responseText,
			folderId,
			matchType: "exact",
			bodyType,
			enabled: true,
			queryParams,
		});

		// Return the real response to the client
		return new NextResponse(responseText, {
			status: response.status,
			headers: {
				"Content-Type": contentType,
			},
		});
	} catch (error) {
		log.error(
			{ err: error, targetUrl: targetUrl.toString() },
			"Proxy request failed",
		);
		return NextResponse.json(
			{ error: "Proxy request failed", details: String(error) },
			{ status: 502 },
		);
	}
}

async function handleEchoRequestBody(
	mock: typeof mockResponses.$inferSelect,
	request: NextRequest,
	log: Logger,
): Promise<NextResponse> {
	log.debug('Handling echo request body');
	const contentType = request.headers.get('content-type') || 'text/plain';

	if (contentType.includes('application/json')) {
		try {
			const body = await request.clone().json();
			log.info(
				{ statusCode: mock.statusCode },
				'Returning echoed JSON response',
			);
			return NextResponse.json(body, { status: mock.statusCode });
		} catch {
			// If JSON parsing fails, fall back to text
			log.warn('Failed to parse JSON for echo, falling back to text');
			const body = await request.text();
			return new NextResponse(body, {
				status: mock.statusCode,
				headers: { 'Content-Type': contentType },
			});
		}
	} else {
		const body = await request.text();
		log.info({ statusCode: mock.statusCode }, 'Returning echoed text response');
		return new NextResponse(body, {
			status: mock.statusCode,
			headers: { 'Content-Type': contentType },
		});
	}
}

async function handleDynamicResponse(
	mock: typeof mockResponses.$inferSelect,
	context: Record<string, unknown> = {},
	log: Logger,
): Promise<NextResponse> {
	log.debug('Generating dynamic response');
	try {
		// Import the schema generator utility
		const { generateFromSchema } = await import('@/lib/schema-generator');

		// Generate fresh JSON from the schema on each request
		if (!mock.jsonSchema) {
			throw new Error('JSON Schema is required for dynamic response');
		}
		const generatedJson = generateFromSchema(
			JSON.parse(mock.jsonSchema),
			context,
		);

		log.info({ statusCode: mock.statusCode }, 'Returning dynamic response');
		return NextResponse.json(JSON.parse(generatedJson), {
			status: mock.statusCode,
		});
	} catch (error) {
		log.error(
			{ err: error },
			'Error generating from schema, falling back to static',
		);
		// Fallback to static response if generation fails
		try {
			return NextResponse.json(JSON.parse(mock.response), {
				status: mock.statusCode,
			});
		} catch {
			return new NextResponse(mock.response, {
				status: mock.statusCode,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	}
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ path: string[] }> },
) {
	return handleRequest(request, await params);
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ path: string[] }> },
) {
	return handleRequest(request, await params);
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ path: string[] }> },
) {
	return handleRequest(request, await params);
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ path: string[] }> },
) {
	return handleRequest(request, await params);
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ path: string[] }> },
) {
	return handleRequest(request, await params);
}

export async function HEAD(
	request: NextRequest,
	{ params }: { params: Promise<{ path: string[] }> },
) {
	return handleRequest(request, await params);
}

export async function OPTIONS() {
	// Respond to preflight with 204; actual CORS headers are set by middleware
	return new NextResponse(null, { status: 204 });
}
