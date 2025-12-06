import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { transitions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const transitionId = parseInt(id, 10);

    if (Number.isNaN(transitionId)) {
        return NextResponse.json({ error: 'Invalid transition ID' }, { status: 400 });
    }

    try {
        const result = await db.select().from(transitions).where(eq(transitions.id, transitionId));
        
        if (result.length === 0) {
            return NextResponse.json({ error: 'Transition not found' }, { status: 404 });
        }

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('Error fetching transition:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: String(error) },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const transitionId = parseInt(id, 10);

    if (Number.isNaN(transitionId)) {
        return NextResponse.json({ error: 'Invalid transition ID' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { name, path, method, conditions, effects, response, meta } = body;

        // Validate required fields
        if (!path || !method || !response) {
            return NextResponse.json(
                { error: 'Missing required fields: path, method, response' },
                { status: 400 }
            );
        }

        const result = await db
            .update(transitions)
            .set({
                name: name || '',
                path,
                method,
                conditions: conditions || {},
                effects: effects || [],
                response,
                meta: meta || {},
                updatedAt: new Date(),
            })
            .where(eq(transitions.id, transitionId))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'Transition not found' }, { status: 404 });
        }

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('Error updating transition:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: String(error) },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const transitionId = parseInt(id, 10);

    if (Number.isNaN(transitionId)) {
        return NextResponse.json({ error: 'Invalid transition ID' }, { status: 400 });
    }

    try {
        const result = await db
            .delete(transitions)
            .where(eq(transitions.id, transitionId))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'Transition not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, deleted: result[0] });
    } catch (error) {
        console.error('Error deleting transition:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: String(error) },
            { status: 500 }
        );
    }
}
