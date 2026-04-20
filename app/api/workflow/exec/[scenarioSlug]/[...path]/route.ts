import { type NextRequest, NextResponse } from 'next/server';
import { processWorkflowRequest } from '@/lib/engine/processor';
import { findTransition } from '@/lib/engine/router';
import type { Transition } from '@/lib/types';

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ scenarioSlug: string; path: string[] }> },
): Promise<NextResponse> {
	// Await the params to resolve the promise
	const resolvedParams = await params;

	// The path is composed of the scenario slug and additional path segments
	// For example: /api/workflow/exec/my-scenario/users -> scenarioSlug: "my-scenario", path: ["users"]
	// We need to reconstruct the path as it would be stored in the transitions database
	const path = `/${resolvedParams.path.join('/')}`;
	const method = request.method;

	// 1. Find Transition Candidates - filter by the specific scenario from the URL
	const candidates = await findTransition(
		path,
		method,
		resolvedParams.scenarioSlug,
	);

	if (!candidates || (Array.isArray(candidates) && candidates.length === 0)) {
		return NextResponse.json(
			{
				error:
					'No matching transition found for this scenario, path and method',
				path,
				method,
				scenario: resolvedParams.scenarioSlug,
			},
			{ status: 404 },
		);
	}

	// 2. Parse Body and Query
	let body = {};
	try {
		const text = await request.text();
		if (text) {
			try {
				body = JSON.parse(text);
			} catch (e) {
				console.warn('Failed to parse body as JSON', e);
			}
		}
	} catch (_e) {
		// Ignore body reading errors
	}

	const url = new URL(request.url);
	const query = Object.fromEntries(url.searchParams.entries());

	// Extract headers
	const headers: Record<string, string> = {};
	request.headers.forEach((value, key) => {
		headers[key.toLowerCase()] = value;
	});

	// 3. Process Request - Try candidates until one works (conditions match)
	let lastError = null;
	const matches = Array.isArray(candidates) ? candidates : [candidates];

	for (const match of matches) {
		try {
			const result = await processWorkflowRequest(
				match.transition as unknown as Transition,
				match.params,
				body,
				query,
				headers,
			);

			// If it returned 400 with "Transition conditions not met", we continue to next candidate
			if (
				result.status === 400 &&
				result.body &&
				(result.body as Record<string, unknown>).error ===
					'Transition conditions not met'
			) {
				lastError = result;
				continue;
			}

			return NextResponse.json(result.body, {
				status: result.status,
				headers: result.headers,
			});
		} catch (e) {
			console.error('Workflow processing error:', e);
			return NextResponse.json(
				{ error: 'Internal workflow processing error' },
				{ status: 500 },
			);
		}
	}

	// If we get here, no candidate matched their conditions
	return NextResponse.json(
		lastError?.body || { error: 'No transition matched conditions' },
		{
			status: lastError?.status || 400,
		},
	);
}

// Support other methods if needed, or mapping GET to transitions too?
// The prompt emphasized POST /mockzilla/:scenario/:event, but we generalized.
// Let's support all common methods by exporting them effectively.

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ scenarioSlug: string; path: string[] }> },
): Promise<NextResponse> {
	return POST(req, { params });
}
export async function PUT(
	req: NextRequest,
	{ params }: { params: Promise<{ scenarioSlug: string; path: string[] }> },
): Promise<NextResponse> {
	return POST(req, { params });
}
export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ scenarioSlug: string; path: string[] }> },
): Promise<NextResponse> {
	return POST(req, { params });
}
export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ scenarioSlug: string; path: string[] }> },
): Promise<NextResponse> {
	return POST(req, { params });
}
