import { describe, expect, it } from 'bun:test';
import {
	createInitialJourneyRuntime,
	isDuplicateJourneyAction,
	matchJourneyPath,
	type JourneyDefinition,
	validateJourneyAction,
	validateJourneyDefinition,
} from '@/lib/journeys';

const journey: JourneyDefinition = {
	name: 'Customer order',
	slug: 'customer-order',
	lifecycles: [
		{ key: 'auth', name: 'Authentication', states: ['signed_out', 'authenticated'], initialState: 'signed_out' },
		{ key: 'checkout', name: 'Checkout', states: ['pending', 'paid'], initialState: 'pending' },
	],
	fields: [{ key: 'orderId', type: 'string', initialValue: null }],
};

describe('Journey contract', () => {
	it('creates a resettable initial state and field snapshot', () => {
		expect(createInitialJourneyRuntime(journey)).toEqual({
			state: { auth: 'signed_out', checkout: 'pending' },
			fields: { orderId: null },
		});
	});

	it('rejects lifecycle fields with invalid initial values', () => {
		const result = validateJourneyDefinition({
			...journey,
			fields: [{ key: 'orderId', type: 'string', initialValue: 1 }],
		});
		expect(result.success).toBe(false);
	});

	it('accepts declared lifecycle transitions and field writes', () => {
		expect(
			validateJourneyAction(journey, {
				name: 'Pay', method: 'POST', path: '/orders/:id/pay',
				requires: { auth: 'authenticated', checkout: 'pending' },
				transitions: { checkout: 'paid' }, setFields: { orderId: '{{params.id}}' },
				statusCode: 200, headers: {}, body: { id: '{{fields.orderId}}' }, bodyType: 'json',
			}),
		).toEqual({ success: true, data: expect.anything() });
	});

	it('rejects unknown fields and lifecycle states', () => {
		const result = validateJourneyAction(journey, {
			name: 'Bad', method: 'POST', path: '/orders/:id/pay',
			requires: { checkout: 'cancelled' }, transitions: {}, setFields: { cartId: 'x' },
			statusCode: 200, headers: {}, body: {}, bodyType: 'json',
		});
		expect(result.success).toBe(false);
	});

	it('matches route parameters without matching a different path shape', () => {
		expect(matchJourneyPath('/orders/:id/pay', '/orders/order-1/pay')).toEqual({ id: 'order-1' });
		expect(matchJourneyPath('/orders/:id/pay', '/orders/order-1/ship')).toBeNull();
	});

	it('treats malformed percent-encoded route parameters as a non-match', () => {
		expect(matchJourneyPath('/orders/:id', '/orders/%E0%A4%A')).toBeNull();
	});

	it('treats equivalent requires maps as duplicate Actions', () => {
		const action = {
			name: 'Pay', method: 'POST' as const, path: '/orders/:id/pay',
			requires: { auth: 'authenticated', checkout: 'pending' }, transitions: { checkout: 'paid' }, setFields: {},
			statusCode: 200, headers: {}, body: {}, bodyType: 'json' as const,
		};
		expect(isDuplicateJourneyAction([action], { ...action, requires: { checkout: 'pending', auth: 'authenticated' } })).toBe(true);
	});
});
