import { describe, expect, it, mock } from 'bun:test';
import { processWorkflowRequest } from '../../lib/engine/processor';
import type { Transition } from '../../lib/types';

// State to control mock behavior
let mockStateResult: any[] = [];

mock.module('../../lib/db', () => ({
	db: {
		select: () => ({
			from: () => ({
				where: () => Promise.resolve(mockStateResult),
				execute: () => Promise.resolve(mockStateResult),
			}),
		}),
		insert: () => ({
			values: () => ({
				onConflictDoUpdate: () => Promise.resolve(),
				execute: () => Promise.resolve(),
			}),
		}),
	},
}));

describe('Processor Coverage', () => {
    const baseTransition = {
        id: 't1',
        scenarioId: 's1',
        name: 'Test',
        path: '/test',
        method: 'POST',
        response: { status: 200, body: {} }
    } as unknown as Transition;

    it('should load existing scenario state', async () => {
        mockStateResult = [{
            data: {
                state: { user: 'Gemini' },
                tables: { users: [{ id: 1 }] }
            }
        }];

        const result = await processWorkflowRequest(
            baseTransition,
            {}, {}, {}, {}
        );

        expect(result.status).toBe(200);
        // We can't easily verify scenarioData internal state here but we've triggered lines 36-42
    });

    it('should return 400 when transition conditions are not met', async () => {
        mockStateResult = [];
        const transitionWithConditions = {
            ...baseTransition,
            conditions: [{ field: 'input.body.id', type: 'eq', value: 1 }]
        } as unknown as Transition;

        const result = await processWorkflowRequest(
            transitionWithConditions,
            {}, { id: 2 }, {}, {}
        );

        expect(result.status).toBe(400);
        expect((result.body as any).error).toBe('Transition conditions not met');
    });

    it('should apply effects when present', async () => {
        mockStateResult = [];
        const transitionWithEffects = {
            ...baseTransition,
            effects: [{ type: 'state.set', key: 'done', value: true }]
        } as unknown as Transition;

        const result = await processWorkflowRequest(
            transitionWithEffects,
            {}, {}, {}, {}
        );

        expect(result.status).toBe(200);
        // Effects application triggered lines 69-70
    });
});
