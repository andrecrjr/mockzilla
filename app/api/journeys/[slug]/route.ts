import { type NextRequest, NextResponse } from 'next/server';
import { deleteJourney, getJourneyRuntime, getPersistedJourneyDefinition, updateJourneyDefinition } from '@/lib/journey-store';
import { journeyError } from '@/lib/journey-http';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
	const persisted = await getPersistedJourneyDefinition((await params).slug);
	if (!persisted) return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
	return NextResponse.json({ ...persisted.journey, definition: persisted.definition, runtime: await getJourneyRuntime(persisted.journey.id) });
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
	try {
		const persisted = await getPersistedJourneyDefinition((await params).slug);
		if (!persisted) return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
		const result = await updateJourneyDefinition(persisted.journey.id, { ...(await request.json()), slug: persisted.journey.slug });
		if (!result.success) return journeyError(result.error);
		return NextResponse.json(result.data);
	} catch (error: unknown) { return journeyError(error); }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
	const persisted = await getPersistedJourneyDefinition((await params).slug);
	if (!persisted) return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
	await deleteJourney(persisted.journey.id);
	return NextResponse.json({ success: true });
}
