import { type NextRequest, NextResponse } from 'next/server';
import { createJourney, listJourneys } from '@/lib/journey-store';
import { journeyError } from '@/lib/journey-http';

export async function GET() { return NextResponse.json(await listJourneys()); }

export async function POST(request: NextRequest) {
	try {
		const result = await createJourney(await request.json());
		if (!result.success) return journeyError(result.error);
		return NextResponse.json(result.data, { status: 201 });
	} catch (error: unknown) { return journeyError(error); }
}
