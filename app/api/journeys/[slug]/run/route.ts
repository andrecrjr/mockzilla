import { type NextRequest, NextResponse } from 'next/server';
import { executePersistedJourney } from '@/lib/journey-store';
import { readJourneyRequest } from '@/lib/journey-http';

export async function runJourneyRoot(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const result = await executePersistedJourney((await params).slug, await readJourneyRequest(request, '/'));
	if (!result) return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
	if (!result.success) return NextResponse.json({ error: 'No Journey Action is available', runtime: result.runtime, candidates: result.candidates }, { status: 409 });
	return result.response.bodyType === 'json'
		? NextResponse.json(result.response.body, { status: result.response.statusCode, headers: result.response.headers })
		: new NextResponse(String(result.response.body ?? ''), { status: result.response.statusCode, headers: result.response.headers });
}

export const GET = runJourneyRoot;
export const POST = runJourneyRoot;
export const PUT = runJourneyRoot;
export const PATCH = runJourneyRoot;
export const DELETE = runJourneyRoot;
export const HEAD = runJourneyRoot;
export const OPTIONS = runJourneyRoot;
