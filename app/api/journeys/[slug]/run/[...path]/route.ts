import { type NextRequest, NextResponse } from 'next/server';
import { executePersistedJourney } from '@/lib/journey-store';
import { readJourneyRequest } from '@/lib/journey-http';

type RouteContext = { params: Promise<{ slug: string; path: string[] }> };

async function run(request: NextRequest, { params }: RouteContext) {
	const { slug, path } = await params;
	const result = await executePersistedJourney(slug, await readJourneyRequest(request, `/${path.join('/')}`));
	if (!result) return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
	if (!result.success) return NextResponse.json({ error: 'No Journey Action is available', runtime: result.runtime, candidates: result.candidates }, { status: 409 });
	return result.response.bodyType === 'json'
		? NextResponse.json(result.response.body, { status: result.response.statusCode, headers: result.response.headers })
		: new NextResponse(String(result.response.body ?? ''), { status: result.response.statusCode, headers: result.response.headers });
}

export const GET = run;
export const POST = run;
export const PUT = run;
export const PATCH = run;
export const DELETE = run;
export const HEAD = run;
export const OPTIONS = run;
