import { db } from '../lib/db';
import { scenarios, transitions } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function seed() {
	console.log('🚀 Seeding Stripe Checkout Pro workflow...');

	const stripeScenario = {
		id: 'stripe-checkout-pro',
		name: 'Stripe Checkout Pro',
		description: 'Complete Stripe Checkout lifecycle with session persistence and status updates.',
	};

	// 1. Upsert scenario
	await db.insert(scenarios).values(stripeScenario).onConflictDoUpdate({
		target: scenarios.id,
		set: { name: stripeScenario.name, description: stripeScenario.description },
	});

	// 2. Clean up existing transitions for this scenario to ensure fresh seed
	await db.delete(transitions).where(eq(transitions.scenarioId, stripeScenario.id));

	// 3. Define transitions
	const stripeTransitions = [
		{
			scenarioId: stripeScenario.id,
			name: 'Create Session',
			description: 'Creates a new Stripe Checkout Session and persists it to the mini-database.',
			path: '/v1/checkout/sessions',
			method: 'POST',
			conditions: [],
			effects: [
				{
					type: 'db.push',
					table: 'sessions',
					value: {
						id: 'cs_test_{{faker "string.alphanumeric" 24}}',
						object: 'checkout.session',
						status: 'open',
						currency: 'usd',
						amount_total: 2000,
						cancel_url: '{{input.body.cancel_url}}',
						success_url: '{{input.body.success_url}}',
						payment_status: 'unpaid',
						customer_email: '{{input.body.customer_email}}',
					},
				},
			],
			response: {
				status: 200,
				body: {
					id: '{{db.sessions.[-1].id}}',
					url: 'https://checkout.stripe.com/pay/{{db.sessions.[-1].id}}',
					object: 'checkout.session',
					status: 'open',
					currency: 'usd',
					amount_total: 2000,
					cancel_url: '{{input.body.cancel_url}}',
					success_url: '{{input.body.success_url}}',
					payment_status: 'unpaid',
				},
			},
		},
		{
			scenarioId: stripeScenario.id,
			name: 'Retrieve Session',
			description: 'Retrieves a session from the mini-database by its ID.',
			path: '/v1/checkout/sessions/:id',
			method: 'GET',
			conditions: [
				{
					field: 'db.sessions',
					type: 'contains',
					value: '{{input.params.id}}',
				},
			],
			effects: [],
			response: {
				status: 200,
				body: '{{#each db.sessions}}{{#if (eq id ../input.params.id)}}{{{json this}}}{{/if}}{{/each}}',
			},
		},
		{
			scenarioId: stripeScenario.id,
			name: 'Simulate Payment',
			description: 'Simulates a successful payment for a specific session.',
			path: '/simulate/pay/:id',
			method: 'POST',
			conditions: [
				{
					field: 'db.sessions',
					type: 'contains',
					value: '{{input.params.id}}',
				},
			],
			effects: [
				{
					type: 'db.update',
					table: 'sessions',
					match: { id: '{{input.params.id}}' },
					set: { status: 'complete', payment_status: 'paid' },
				},
			],
			response: {
				status: 200,
				body: {
					status: 'paid',
					message: 'Payment simulated successfully for session {{input.params.id}}',
				},
			},
		},
		{
			scenarioId: stripeScenario.id,
			name: 'Expire Session',
			description: 'Expires an open session.',
			path: '/v1/checkout/sessions/:id/expire',
			method: 'POST',
			conditions: [
				{
					field: 'db.sessions',
					type: 'contains',
					value: '{{input.params.id}}',
				},
			],
			effects: [
				{
					type: 'db.update',
					table: 'sessions',
					match: { id: '{{input.params.id}}' },
					set: { status: 'expired' },
				},
			],
			response: {
				status: 200,
				body: '{{#each db.sessions}}{{#if (eq id ../input.params.id)}}{{{json this}}}{{/if}}{{/each}}',
			},
		},
	];

	// 4. Insert transitions
	await db.insert(transitions).values(stripeTransitions);

	console.log('✅ Seeding completed! Stripe Checkout Pro workflow is ready.');
}

seed()
	.catch((err) => {
		console.error('❌ Seeding failed:', err);
		process.exit(1);
	})
	.finally(() => {
		process.exit(0);
	});
