import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { JourneyAction, JourneyDefinition } from '@/lib/journeys';

let insertedValues: unknown;
let existingActions: unknown[] = [];

function createQuery(result: unknown) {
	const query = {
		from: mock(() => query),
		where: mock(() => query),
		orderBy: mock(() => query),
		values: mock((value: unknown) => {
			insertedValues = value;
			return query;
		}),
		onConflictDoUpdate: mock(() => query),
		returning: mock(() => query),
		then: (resolve: (value: unknown) => void) => resolve(result),
	};

	return query;
}

const persistedAction = {
	id: 'action-1',
	journeyId: 'journey-1',
	name: 'Pay for order',
	method: 'POST' as const,
	path: '/orders/:id/pay',
	requires: { auth: 'authenticated', checkout: 'pending' },
	transitions: { checkout: 'paid' },
	setFields: { orderId: '{{params.id}}' },
	statusCode: 201,
	headers: { 'x-action': 'pay' },
	body: { id: '{{fields.orderId}}' },
	bodyType: 'json',
	matchSignature: '[["auth","authenticated"],["checkout","pending"]]',
	position: 0,
	createdAt: new Date('2026-08-18T00:00:00.000Z'),
	updatedAt: null,
};

const mockDb = {
	select: mock(() => createQuery(existingActions)),
	insert: mock(() => createQuery([persistedAction])),
};

mock.module('@/lib/db', () => ({ db: mockDb }));

import { createJourneyAction, listJourneyActions, resetJourney } from '@/lib/journey-store';

const journey: JourneyDefinition = {
	name: 'Customer order',
	slug: 'customer-order',
	lifecycles: [
		{ key: 'auth', name: 'Authentication', states: ['signed_out', 'authenticated'], initialState: 'signed_out' },
		{ key: 'checkout', name: 'Checkout', states: ['pending', 'paid'], initialState: 'pending' },
	],
	fields: [{ key: 'orderId', type: 'string', initialValue: null }],
};

const action: JourneyAction = {
	name: 'Pay for order',
	method: 'POST',
	path: '/orders/:id/pay',
	requires: { auth: 'authenticated', checkout: 'pending' },
	transitions: { checkout: 'paid' },
	setFields: { orderId: '{{params.id}}' },
	statusCode: 201,
	headers: { 'x-action': 'pay' },
	body: { id: '{{fields.orderId}}' },
	bodyType: 'json',
};

describe('Journey Action persistence', () => {
	beforeEach(() => {
		existingActions = [];
		insertedValues = undefined;
		mockDb.select = mock(() => createQuery(existingActions));
		mockDb.insert = mock(() => createQuery([persistedAction]));
	});

	it('persists every declared Action and assigns the next position', async () => {
		const result = await createJourneyAction(journey, 'journey-1', action);

		expect(result).toMatchObject({ success: true, data: persistedAction });
		expect(insertedValues).toEqual({
			journeyId: 'journey-1',
			...action,
			matchSignature: '[["auth","authenticated"],["checkout","pending"]]',
			position: 0,
		});
	});

	it('lists a Journey’s Actions in their persisted order', async () => {
		existingActions = [persistedAction];

		await expect(listJourneyActions('journey-1')).resolves.toMatchObject([persistedAction]);
	});

	it('rejects an Action with an equivalent method, path, and requires map', async () => {
		existingActions = [persistedAction];

		const result = await createJourneyAction(journey, 'journey-1', {
			...action,
			requires: { checkout: 'pending', auth: 'authenticated' },
		});

		expect(result).toEqual({
			success: false,
			error: 'Duplicate Journey Action method, path, and requires map',
		});
		expect(insertedValues).toBeUndefined();
	});

	it('resets all persisted Lifecycle states and fields to their initial values', async () => {
		const runtime = {
			journeyId: 'journey-1',
			state: { auth: 'signed_out', checkout: 'pending' },
			fields: { orderId: null },
			updatedAt: new Date('2026-08-19T00:00:00.000Z'),
		};
		const selectResults = [
			[
				{ key: 'auth', initialState: 'signed_out', position: 0 },
				{ key: 'checkout', initialState: 'pending', position: 1 },
			],
			[{ key: 'orderId', initialValue: null, position: 0 }],
		];
		mockDb.select = mock(() => createQuery(selectResults.shift() ?? []));
		mockDb.insert = mock(() => createQuery([runtime]));

		await expect(resetJourney('journey-1')).resolves.toEqual(runtime);
		expect(insertedValues).toEqual({
			journeyId: 'journey-1',
			state: { auth: 'signed_out', checkout: 'pending' },
			fields: { orderId: null },
			updatedAt: expect.any(Date),
		});
	});
});
