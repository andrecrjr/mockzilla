import { type NextRequest, NextResponse } from 'next/server';
import { deleteJourneyAction, getPersistedJourneyDefinition, updateJourneyAction } from '@/lib/journey-store';
import { journeyError } from '@/lib/journey-http';

type RouteContext = { params: Promise<{ slug: string; actionId: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext) {
	try {
		const { slug, actionId } = await params;
		const persisted = await getPersistedJourneyDefinition(slug);
		if (!persisted) return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
		const result = await updateJourneyAction(persisted.definition, persisted.journey.id, actionId, await request.json());
		if (!result) return NextResponse.json({ error: 'Journey Action not found' }, { status: 404 });
		if (!result.success) return journeyError(result.error);
		return NextResponse.json(result.data);
	} catch (error: unknown) { return journeyError(error); }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
	const { slug, actionId } = await params;
	const persisted = await getPersistedJourneyDefinition(slug);
	if (!persisted) return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
	const action = await deleteJourneyAction(persisted.journey.id, actionId);
	if (!action) return NextResponse.json({ error: 'Journey Action not found' }, { status: 404 });
	return NextResponse.json({ success: true });
}
