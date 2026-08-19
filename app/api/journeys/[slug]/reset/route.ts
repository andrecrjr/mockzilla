import { type NextRequest, NextResponse } from 'next/server';
import { getJourneyBySlug, resetJourney } from '@/lib/journey-store';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const journey = await getJourneyBySlug((await params).slug);
	if (!journey) return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
	return NextResponse.json(await resetJourney(journey.id));
}
