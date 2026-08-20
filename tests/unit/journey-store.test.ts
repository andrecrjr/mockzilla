import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { JourneyAction, JourneyDefinition } from '@/lib/journeys';

let insertedValues: unknown;
let existingActions: unknown[] = [];

function createQuery(result: unknown) {
	const query = {
		from: mock(() => query),
		where: mock(() => query),
		orderBy: mock(() => query),
		limit: mock(() => query),
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

function createUpdateQuery(result: unknown) {
	const query = {
		set: mock(() => query),
		where: mock(() => query),
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
	update: mock(() => createUpdateQuery([])),
	transaction: mock(async (callback: (transaction: typeof mockDb) => unknown) => callback(mockDb)),
};

mock.module('@/lib/db', () => ({ db: mockDb }));

import { createJourneyAction, executePersistedJourney, listJourneyActions, resetJourney } from '@/lib/journey-store';

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
		mockDb.update = mock(() => createUpdateQuery([]));
		mockDb.transaction = mock(async (callback: (transaction: typeof mockDb) => unknown) => callback(mockDb));
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
			version: 0,
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

	it('retries execution from a fresh runtime when a concurrent write wins the compare-and-swap', async () => {
		const persistedJourney = {
			id: 'journey-1',
			name: journey.name,
			slug: journey.slug,
			description: null,
			createdAt: new Date(),
			updatedAt: null,
		};
		const lifecycleRows = journey.lifecycles.map((lifecycle, position) => ({ ...lifecycle, journeyId: 'journey-1', position }));
		const fieldRows = journey.fields.map((field, position) => ({ ...field, journeyId: 'journey-1', position }));
		const runtimeRow = {
			journeyId: 'journey-1',
			state: { auth: 'authenticated', checkout: 'pending' },
			fields: { orderId: null },
			version: 1,
			updatedAt: new Date(),
		};
		const selectResults = [
			[persistedJourney], lifecycleRows, fieldRows, [runtimeRow], [persistedAction],
			[persistedJourney], lifecycleRows, fieldRows, [{ ...runtimeRow, version: 2 }], [persistedAction],
		];
		const updateResults = [[], [{ ...runtimeRow, version: 3 }]];
		mockDb.select = mock(() => createQuery(selectResults.shift() ?? []));
		mockDb.update = mock(() => createUpdateQuery(updateResults.shift() ?? []));

		const result = await executePersistedJourney(journey.slug, {
			method: 'POST',
			path: '/orders/order-1/pay',
		});

		expect(result).toMatchObject({
			success: true,
			runtime: { state: { auth: 'authenticated', checkout: 'paid' }, fields: { orderId: 'order-1' } },
		});
		expect(mockDb.update).toHaveBeenCalledTimes(2);
	});
});
