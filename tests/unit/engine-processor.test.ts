import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { NextRequest } from 'next/server';

// Mock DB and Logger
const mockDb = {
	select: mock(() => ({
		from: () => ({
			where: () => [
				{ data: { state: { initialized: true }, tables: { logs: [] } } }
			]
		})
	})),
	insert: mock(() => ({
		values: () => ({
			onConflictDoUpdate: () => {}
		})
	}))
};

mock.module('../../lib/db', () => ({
	db: mockDb
}));

import { processWorkflowRequest } from '../../lib/engine/processor';
import type { Transition } from '@/lib/types';

describe('Engine Processor', () => {
	beforeEach(() => {
		mockDb.select.mockClear();
		mockDb.insert.mockClear();
	});

	test('should process request and return interpolated response', async () => {
		const transition: Transition = {
			id: 't1',
			scenarioId: 's1',
			path: '/test',
			method: 'POST',
			response: {
				status: 201,
				body: {
					message: 'Created {{input.body.name}}',
					status: '{{state.initialized}}'
				}
			},
			conditions: [],
			effects: [
				{ type: 'state.set', key: 'processed', value: true }
			],
			createdAt: new Date(),
			updatedAt: null,
			name: 'Test Transition',
			description: null,
			meta: {}
		};

		const result = await processWorkflowRequest(
			transition,
			{}, // params
			{ name: 'Alice' }, // body
			{}, // query
			{}  // headers
		);

		expect(result.status).toBe(201);
		expect((result.body as Record<string, unknown>).message).toBe('Created Alice');
		expect((result.body as Record<string, unknown>).status).toBe(true);
		
		expect(mockDb.select).toHaveBeenCalled();
		expect(mockDb.insert).toHaveBeenCalled();
	});

	test('should return 400 if conditions not met', async () => {
		const transition: Transition = {
			id: 't1',
			scenarioId: 's1',
			path: '/test',
			method: 'GET',
			conditions: [
				{ type: 'eq', field: 'input.query.token', value: 'secret' }
			],
			response: { status: 200, body: {} },
			createdAt: new Date(),
			updatedAt: null,
			name: 'Auth Test',
			description: null,
			meta: {}
		};

		const result = await processWorkflowRequest(
			transition,
			{},
			{},
			{ token: 'wrong' }
		);

		expect(result.status).toBe(400);
		expect((result.body as Record<string, unknown>).error).toBe('Transition conditions not met');
	});

	test('should initialize new scenario state if not found', async () => {
		// Mock DB to return empty
		mockDb.select.mockImplementationOnce(() => ({
			from: () => ({
				where: () => [] // Not found
			})
		}));

		const transition: Transition = {
			id: 't2',
			scenarioId: 'new-s',
			path: '/new',
			method: 'GET',
			response: { status: 200, body: { ok: true } },
			createdAt: new Date(),
			updatedAt: null,
			name: 'New',
			description: null,
			meta: {}
		};

		const result = await processWorkflowRequest(transition, {}, {}, {});
		expect(result.status).toBe(200);
		expect(mockDb.insert).toHaveBeenCalled();
	});
});
