import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { transitions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: 'Transition ID is required' },
                { status: 400 }
            );
        }

        const transitionId = parseInt(id);
        if (isNaN(transitionId)) {
            return NextResponse.json(
                { error: 'Invalid Transition ID' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const {
            scenarioId,
            name,
            description,
            path,
            method,
            conditions,
            effects,
            response,
            meta,
        } = body;

        // Verify transition exists
        const existing = await db
            .select()
            .from(transitions)
            .where(eq(transitions.id, transitionId));

        if (existing.length === 0) {
            return NextResponse.json(
                { error: 'Transition not found' },
                { status: 404 }
            );
        }

        // Update the transition
        const result = await db
            .update(transitions)
            .set({
                scenarioId,
                name: name || '',
                description: description || null,
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
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: 'Transition ID is required' },
                { status: 400 }
            );
        }

        const transitionId = parseInt(id);
        if (isNaN(transitionId)) {
            return NextResponse.json(
                { error: 'Invalid Transition ID' },
                { status: 400 }
            );
        }

        // Verify transition exists
        const existing = await db
            .select()
            .from(transitions)
            .where(eq(transitions.id, transitionId));

        if (existing.length === 0) {
            return NextResponse.json(
                { error: 'Transition not found' },
                { status: 404 }
            );
        }

        // Delete the transition
        await db.delete(transitions).where(eq(transitions.id, transitionId));

        return NextResponse.json({ message: 'Transition deleted successfully' });
    } catch (error) {
        console.error('Error deleting transition:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: String(error) },
            { status: 500 }
        );
    }
}
