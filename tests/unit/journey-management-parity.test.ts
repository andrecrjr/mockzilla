import { describe, expect, it } from 'bun:test';
import { validateJourneyAction } from '@/lib/journeys';
import { ManageJourneysArgs } from '@/lib/mcp/schemas/journeys';
import type { JourneyDefinition } from '@/lib/journeys';

const journey: JourneyDefinition = {
	name: 'Checkout', slug: 'checkout',
	lifecycles: [{ key: 'payment', name: 'Payment', states: ['pending', 'paid'], initialState: 'pending' }],
	fields: [],
};

describe('Journey HTTP/MCP validation parity', () => {
	it('rejects an undeclared Lifecycle state through the shared Action contract', () => {
		const journeyAction = {
			name: 'Pay', method: 'POST' as const, path: '/pay', requires: { payment: 'unknown' }, transitions: {}, setFields: {}, statusCode: 200, headers: {}, body: {}, bodyType: 'json' as const,
		};
		expect(validateJourneyAction(journey, journeyAction).success).toBe(false);
		expect(ManageJourneysArgs.safeParse({ action: 'create_action', slug: journey.slug, journeyAction }).success).toBe(true);
	});

	it('rejects malformed Action input before it can reach either transport', () => {
		const journeyAction = { name: 'Pay', method: 'POST', path: 'missing-leading-slash', requires: {}, transitions: {}, setFields: {}, statusCode: 200, headers: {}, body: {} };
		expect(validateJourneyAction(journey, journeyAction).success).toBe(false);
		expect(ManageJourneysArgs.safeParse({ action: 'create_action', slug: journey.slug, journeyAction }).success).toBe(false);
	});
});
