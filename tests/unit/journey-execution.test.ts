import { describe, expect, it } from 'bun:test';
import { executeJourneyAction } from '@/lib/journey-execution';
import type { JourneyAction, JourneyDefinition, JourneyRuntime } from '@/lib/journeys';

const definition: JourneyDefinition = {
	name: 'Customer order', slug: 'customer-order',
	lifecycles: [
		{ key: 'auth', name: 'Authentication', states: ['signed_out', 'authenticated'], initialState: 'signed_out' },
		{ key: 'checkout', name: 'Checkout', states: ['pending', 'paid'], initialState: 'pending' },
	],
	fields: [{ key: 'orderId', type: 'string', initialValue: null }],
};

const pay: JourneyAction = {
	name: 'Pay', method: 'POST', path: '/orders/:id/pay',
	requires: { auth: 'authenticated', checkout: 'pending' }, transitions: { checkout: 'paid' }, setFields: { orderId: '{{params.id}}' },
	statusCode: 200, headers: { 'x-checkout': '{{state.checkout}}' }, body: { id: '{{fields.orderId}}', state: '{{state.checkout}}' }, bodyType: 'json',
};

const runtime: JourneyRuntime = { state: { auth: 'authenticated', checkout: 'pending' }, fields: { orderId: null } };

describe('Journey Action execution', () => {
	it('matches route parameters, mutates atomically, and renders the resulting state', () => {
		const result = executeJourneyAction(definition, [pay], runtime, { method: 'POST', path: '/orders/order-1/pay' });

		expect(result).toEqual({
			success: true, action: pay,
			runtime: { state: { auth: 'authenticated', checkout: 'paid' }, fields: { orderId: 'order-1' } },
			response: { statusCode: 200, headers: { 'x-checkout': 'paid' }, body: { id: 'order-1', state: 'paid' }, bodyType: 'json' },
		});
		expect(runtime).toEqual({ state: { auth: 'authenticated', checkout: 'pending' }, fields: { orderId: null } });
	});

	it('returns candidate requirements and current state when no Action is available', () => {
		const result = executeJourneyAction(definition, [pay], { ...runtime, state: { ...runtime.state, auth: 'signed_out' } }, { method: 'POST', path: '/orders/order-1/pay' });

		expect(result).toEqual({
			success: false, statusCode: 409,
			runtime: { state: { auth: 'signed_out', checkout: 'pending' }, fields: { orderId: null } },
			candidates: [{ name: 'Pay', requires: { auth: 'authenticated', checkout: 'pending' } }],
		});
	});

	it('carries declared fields across a multi-Lifecycle branch', () => {
		const ship: JourneyAction = {
			...pay,
			name: 'Ship',
			path: '/orders/:id/ship',
			requires: { auth: 'authenticated', checkout: 'paid' },
			transitions: {},
			setFields: {},
			body: { orderId: '{{fields.orderId}}', checkout: '{{state.checkout}}' },
		};
		const paid = executeJourneyAction(definition, [pay, ship], runtime, { method: 'POST', path: '/orders/order-1/pay' });
		if (!paid.success) throw new Error('Expected the pay Action to be selected');

		const shipped = executeJourneyAction(definition, [pay, ship], paid.runtime, { method: 'POST', path: '/orders/order-1/ship' });
		expect(shipped).toMatchObject({
			success: true,
			runtime: { state: { auth: 'authenticated', checkout: 'paid' }, fields: { orderId: 'order-1' } },
			response: { body: { orderId: 'order-1', checkout: 'paid' } },
		});
	});

	it('rejects a field write that does not render to the declared scalar type', () => {
		const numericDefinition: JourneyDefinition = { ...definition, fields: [{ key: 'orderId', type: 'number', initialValue: null }] };
		expect(() => executeJourneyAction(numericDefinition, [pay], runtime, { method: 'POST', path: '/orders/order-1/pay' })).toThrow('Journey field orderId must render to number or null');
	});
});
