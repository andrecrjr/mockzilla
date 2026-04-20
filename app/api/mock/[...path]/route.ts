import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { folders, mockResponses } from '@/lib/db/schema';
import type { HttpMethod, MatchType } from '@/lib/types';
import type { MockVariant } from '@/lib/types';
import {
	findBestMatch,
	queryParamsMatch,
	selectVariant as selectMockVariant,
	extractCaptureKey,
} from '@/lib/utils/mock-matcher';
import type { MockCandidate } from '@/lib/utils/mock-matcher';

async function handleRequest(request: NextRequest, params: { path: string[] }) {
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
	let mockPath = pathSegments.length === 1
		? '/'
		: `/${pathSegments.slice(1).join('/')}`;
	
	// Normalize: remove trailing slash for consistency
	if (mockPath.endsWith('/') && mockPath.length > 1) {
		mockPath = mockPath.slice(0, -1);
	}

	// Extract query params from request URL
	const url = request.nextUrl;
	const urlQueryParams = Object.fromEntries(url.searchParams.entries());

	try {
		// Find the folder by slug
		const [folder] = await db
			.select()
			.from(folders)
			.where(eq(folders.slug, folderSlug))
			.limit(1);

		if (!folder) {
			return NextResponse.json(
				{ error: 'Folder not found', folderSlug },
				{ status: 404 },
			);
		}

		// --- Phase 1: Exact match (existing behavior, zero breaking change) ---
		const [exactMock] = await db
			.select()
			.from(mockResponses)
			.where(
				and(
					eq(mockResponses.folderId, folder.id),
					eq(mockResponses.endpoint, mockPath),
					eq(mockResponses.method, method),
					eq(mockResponses.enabled, true),
				),
			)
			.limit(1);

		if (exactMock && exactMock.matchType === 'exact') {
			// Check query params if the mock has requirements
			const qpRequired = exactMock.queryParams as Record<string, string> | null;
			if (!queryParamsMatch(qpRequired, urlQueryParams)) {
				// Query params don't match — fall through to Phase 2
			} else {
				return await buildResponse(exactMock, request);
			}
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
				(m.matchType as MatchType || 'exact') === best.matchType &&
				JSON.stringify(m.queryParams) === JSON.stringify(best.queryParams),
		);

		if (!bestMock) {
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

		// For wildcard mocks with variants, try to select a matching variant
		if (bestMock.matchType === 'wildcard') {
			const variants = bestMock.variants as MockVariant[] | null;
			const wildcardRequireMatch = bestMock.wildcardRequireMatch || false;

			if (variants && variants.length > 0) {
				const variant = selectMockVariant(variants, mockPath, bestMock.endpoint);
				if (variant) {
					// Use variant's body, statusCode, bodyType
					const variantMock = {
						...bestMock,
						response: variant.body,
						statusCode: variant.statusCode,
						bodyType: variant.bodyType as 'json' | 'text',
						useDynamicResponse: false, // Ensure variants always return their static body
					};
					const captures = extractCaptureKey(mockPath, bestMock.endpoint)?.split('|') || [];
					const paramsMap: Record<string, string> = {};
					for (let i = 0; i < captures.length; i++) {
						paramsMap[String(i)] = captures[i];
					}
					return await buildResponse(variantMock, request, paramsMap);
				}

				// No variant matched
				if (wildcardRequireMatch) {
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

		const captures = bestMock.matchType === 'wildcard' 
			? extractCaptureKey(mockPath, bestMock.endpoint)?.split('|') || []
			: [];
		const paramsMap: Record<string, string> = {};
		for (let i = 0; i < captures.length; i++) {
			paramsMap[String(i)] = captures[i];
		}

		return await buildResponse(bestMock, request, paramsMap);
	} catch (error) {
		if (error instanceof Error) {
			console.error('[API] Error serving mock:', error.message);
		} else {
			console.error('[API] Unknown error serving mock:', error);
		}
		return NextResponse.json(
			{ error: 'Failed to serve mock response' },
			{ status: 500 },
		);
	}
}

async function buildResponse(
	mock: typeof mockResponses.$inferSelect, 
	request: NextRequest,
	paramsMap: Record<string, string> = {}
): Promise<NextResponse> {
	// Check if we should echo the request body
	if (mock.echoRequestBody) {
		return handleEchoRequestBody(mock, request);
	}

	// Extract query params and headers from request
	const url = request.nextUrl;
	const urlQueryParams = Object.fromEntries(url.searchParams.entries());
	const requestHeaders = Object.fromEntries(request.headers.entries());

	const context = {
		input: {
			query: urlQueryParams,
			params: paramsMap,
			headers: requestHeaders,
		}
	};

	// Check if this mock uses dynamic schema-based responses
	if (mock.useDynamicResponse && mock.jsonSchema) {
		return handleDynamicResponse(mock, context);
	}

	// Apply template replacement to static responses
	const { replaceTemplates } = await import('@/lib/schema-generator');
	const responseBody = replaceTemplates(mock.response, context);

	// Return the mock response with the configured status code
	const contentType =
		mock.bodyType === 'json' ? 'application/json' : 'text/plain';

	if (mock.bodyType === 'json') {
		try {
			return NextResponse.json(JSON.parse(responseBody), {
				status: mock.statusCode,
			});
		} catch {
			// If parsing fails, return as text
			return new NextResponse(responseBody, {
				status: mock.statusCode,
				headers: { 'Content-Type': contentType },
			});
		}
	}

	return new NextResponse(responseBody, {
		status: mock.statusCode,
		headers: { 'Content-Type': contentType },
	});
}

async function handleEchoRequestBody(
	mock: typeof mockResponses.$inferSelect,
	request: NextRequest,
): Promise<NextResponse> {
	const contentType = request.headers.get('content-type') || 'text/plain';

	if (contentType.includes('application/json')) {
		try {
			const body = await request.json();
			return NextResponse.json(body, { status: mock.statusCode });
		} catch {
			// If JSON parsing fails, fall back to text
			const body = await request.text();
			return new NextResponse(body, {
				status: mock.statusCode,
				headers: { 'Content-Type': contentType },
			});
		}
	} else {
		const body = await request.text();
		return new NextResponse(body, {
			status: mock.statusCode,
			headers: { 'Content-Type': contentType },
		});
	}
}

async function handleDynamicResponse(
	mock: typeof mockResponses.$inferSelect,
	context: any = {},
): Promise<NextResponse> {
	try {
		// Import the schema generator utility
		const { generateFromSchema } = await import('@/lib/schema-generator');

		// Generate fresh JSON from the schema on each request
		const generatedJson = generateFromSchema(JSON.parse(mock.jsonSchema!), context);

		return NextResponse.json(JSON.parse(generatedJson), {
			status: mock.statusCode,
		});
	} catch (error) {
		console.error('[API] Error generating from schema:', error);
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
