import { NextResponse } from 'next/server';
import type { JourneyRequest } from './journey-execution';

export async function readJourneyRequest(request: Request, path: string): Promise<JourneyRequest> {
	const text = await request.text();
	let body: unknown;
	if (text) {
		try { body = JSON.parse(text); } catch { body = text; }
	}
	return {
		method: request.method,
		path,
		body,
		query: Object.fromEntries(new URL(request.url).searchParams.entries()),
		headers: Object.fromEntries(request.headers.entries()),
	};
}

export function journeyError(error: unknown): NextResponse {
	return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid Journey request' }, { status: 400 });
}
