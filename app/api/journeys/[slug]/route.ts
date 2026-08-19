import { type NextRequest, NextResponse } from 'next/server';
import { deleteJourney, getJourneyRuntime, getPersistedJourneyDefinition, updateJourneyMetadata } from '@/lib/journey-store';
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
		const body: unknown = await request.json();
		if (typeof body !== 'object' || body === null || !('name' in body) || typeof body.name !== 'string') return journeyError(new Error('name is required'));
		const description = 'description' in body && typeof body.description === 'string' ? body.description : undefined;
		const journey = await updateJourneyMetadata(persisted.journey.id, { name: body.name, description });
		return NextResponse.json(journey);
	} catch (error: unknown) { return journeyError(error); }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
	const persisted = await getPersistedJourneyDefinition((await params).slug);
	if (!persisted) return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
	await deleteJourney(persisted.journey.id);
	return NextResponse.json({ success: true });
}
