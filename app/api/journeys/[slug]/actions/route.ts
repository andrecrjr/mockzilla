import { type NextRequest, NextResponse } from 'next/server';
import { createJourneyAction, getPersistedJourneyDefinition, listJourneyActions } from '@/lib/journey-store';
import { journeyError } from '@/lib/journey-http';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
	const persisted = await getPersistedJourneyDefinition((await params).slug);
	if (!persisted) return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
	return NextResponse.json(await listJourneyActions(persisted.journey.id));
}

export async function POST(request: NextRequest, { params }: RouteContext) {
	try {
		const persisted = await getPersistedJourneyDefinition((await params).slug);
		if (!persisted) return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
		const result = await createJourneyAction(persisted.definition, persisted.journey.id, await request.json());
		if (!result.success) return journeyError(result.error);
		return NextResponse.json(result.data, { status: 201 });
	} catch (error: unknown) { return journeyError(error); }
}
