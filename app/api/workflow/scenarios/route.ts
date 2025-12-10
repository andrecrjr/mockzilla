import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scenarios, transitions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        // Fetch all scenarios from the scenarios table
        const allScenarios = await db.select().from(scenarios);

        // Get transition counts per scenario
        const transitionCounts = await db
            .select({
                scenarioId: transitions.scenarioId,
                count: sql<number>`count(*)::int`,
            })
            .from(transitions)
            .groupBy(transitions.scenarioId);

        const countMap = new Map(transitionCounts.map(t => [t.scenarioId, t.count]));

        const result = allScenarios.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            count: countMap.get(s.id) || 0,
            createdAt: s.createdAt,
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching scenarios:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, description } = body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            );
        }

        // Generate slug from name
        const slug = name.toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        if (!slug) {
            return NextResponse.json(
                { error: 'Invalid name - cannot generate valid slug' },
                { status: 400 }
            );
        }

        // Check if slug already exists
        const existing = await db.select().from(scenarios).where(eq(scenarios.id, slug));
        if (existing.length > 0) {
            return NextResponse.json(
                { error: 'A scenario with this name already exists' },
                { status: 409 }
            );
        }

        // Insert the new scenario
        const result = await db
            .insert(scenarios)
            .values({
                id: slug,
                name: name.trim(),
                description: description?.trim() || null,
            })
            .returning();

        return NextResponse.json(result[0], { status: 201 });
    } catch (error) {
        console.error('Error creating scenario:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: String(error) },
            { status: 500 }
        );
    }
}
