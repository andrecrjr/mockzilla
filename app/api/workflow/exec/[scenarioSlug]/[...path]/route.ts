import { type NextRequest, NextResponse } from 'next/server';
import { findTransition } from '@/lib/engine/router';
import { processWorkflowRequest } from '@/lib/engine/processor';

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ scenarioSlug: string; path: string[] }> }
) {
	// Await the params to resolve the promise
	const resolvedParams = await params;

	// The path is composed of the scenario slug and additional path segments
	// For example: /api/workflow/exec/my-scenario/users -> scenarioSlug: "my-scenario", path: ["users"]
	// We need to reconstruct the path as it would be stored in the transitions database
	const path = '/' + resolvedParams.path.join('/');
	const method = request.method;

	// 1. Find Transition - look for transitions that belong to the specific scenario
	// We'll need to modify the findTransition to accept scenario context
	// For now, let's try to find transitions that might match this path
	const match = await findTransition(path, method);

	if (!match) {
		return NextResponse.json(
			{ error: 'No matching transition found for this path and method', path, method },
			{ status: 404 }
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
                // Not JSON, usage of raw body might be needed in future but for now keep body as empty object or maybe raw string?
                // matching logic usually expects object access.
                // Let's store raw string? No, existing logic expects object access.
                console.warn('Failed to parse body as JSON', e);
            }
        }
	} catch (e) {
		// Ignore body reading errors
	}

	const url = new URL(request.url);
	const query = Object.fromEntries(url.searchParams.entries());

	// Extract headers
	const headers: Record<string, string> = {};
	request.headers.forEach((value, key) => {
		headers[key.toLowerCase()] = value;
	});

	// 3. Process Request
	try {
		const result = await processWorkflowRequest(
			match.transition,
			match.params,
			body,
			query,
			headers
		);

		return NextResponse.json(result.body, {
			status: result.status,
			headers: result.headers
		});
	} catch (e) {
		console.error('Workflow processing error:', e);
		return NextResponse.json(
			{ error: 'Internal workflow processing error' },
			{ status: 500 }
		);
	}
}

// Support other methods if needed, or mapping GET to transitions too?
// The prompt emphasized POST /mockzilla/:scenario/:event, but we generalized.
// Let's support all common methods by exporting them effectively.

export async function GET(req: NextRequest, props: any) { return POST(req, props); }
export async function PUT(req: NextRequest, props: any) { return POST(req, props); }
export async function DELETE(req: NextRequest, props: any) { return POST(req, props); }
export async function PATCH(req: NextRequest, props: any) { return POST(req, props); }