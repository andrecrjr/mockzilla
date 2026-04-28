import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { sql } from 'drizzle-orm';
import pg from 'pg';

async function seedProduction(db) {
	if (process.env.NODE_ENV !== 'production' && process.env.FORCE_SEED !== 'true')
		return;

	console.log('Checking for production seed...');

	try {
		// 1. Upsert scenario
		await db.execute(sql`
      INSERT INTO scenarios (id, name, description) 
      VALUES ('stripe-checkout-pro', 'Stripe Checkout Pro', 'Complete Stripe Checkout lifecycle with session persistence and status updates.')
      ON CONFLICT (id) DO NOTHING;
    `);

		// 2. Check if transitions already exist
		const result = await db.execute(
			sql`SELECT count(*) as count FROM transitions WHERE scenario_id = 'stripe-checkout-pro'`,
		);
		const count = Number.parseInt(result.rows[0].count);

		if (count === 0) {
			console.log('Seeding Stripe transitions...');
			const transitions = [
				{
					name: 'Create Session',
					path: '/v1/checkout/sessions',
					method: 'POST',
					effects: JSON.stringify([
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
					]),
					response: JSON.stringify({
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
					}),
				},
				{
					name: 'Retrieve Session',
					path: '/v1/checkout/sessions/:id',
					method: 'GET',
					conditions: JSON.stringify([
						{
							field: 'db.sessions',
							type: 'contains',
							value: '{{input.params.id}}',
						},
					]),
					response: JSON.stringify({
						status: 200,
						body: '{{#each db.sessions}}{{#if (eq id ../input.params.id)}}{{{json this}}}{{/if}}{{/each}}',
					}),
				},
				{
					name: 'Simulate Payment',
					path: '/simulate/pay/:id',
					method: 'POST',
					conditions: JSON.stringify([
						{
							field: 'db.sessions',
							type: 'contains',
							value: '{{input.params.id}}',
						},
					]),
					effects: JSON.stringify([
						{
							type: 'db.update',
							table: 'sessions',
							match: { id: '{{input.params.id}}' },
							set: { status: 'complete', payment_status: 'paid' },
						},
					]),
					response: JSON.stringify({
						status: 200,
						body: {
							status: 'paid',
							message:
								'Payment simulated successfully for session {{input.params.id}}',
						},
					}),
				},
			];

			for (const t of transitions) {
				await db.execute(sql`
          INSERT INTO transitions (scenario_id, name, path, method, conditions, effects, response)
          VALUES ('stripe-checkout-pro', ${t.name}, ${t.path}, ${t.method}, 
                  ${t.conditions || '[]'}::jsonb, 
                  ${t.effects || '[]'}::jsonb, 
                  ${t.response}::jsonb)
        `);
			}
			console.log('✅ Stripe seed completed!');
		} else {
			console.log('Stripe seed already exists, skipping.');
		}
	} catch (error) {
		console.error('Failed to seed production database:', error);
	}
}

async function runMigrations() {
	const databaseUrl = process.env.DATABASE_URL;

	if (databaseUrl) {
		const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
		console.log(`Connecting to PostgreSQL database with URL: ${maskedUrl}`);
		const { Pool } = pg;
		const pool = new Pool({ connectionString: databaseUrl, max: 1 });

		try {
			const db = drizzlePg(pool);
			console.log('Running PostgreSQL migrations...');
			await migratePg(db, { migrationsFolder: './drizzle/migrations' });
			console.log('PostgreSQL migrations completed successfully!');
			await seedProduction(db);
		} catch (error) {
			console.error('PostgreSQL migration failed:', error);
			process.exit(1);
		} finally {
			await pool.end();
		}
	} else {
		console.log('DATABASE_URL not set, running PGlite migrations...');
		try {
			// In Docker, mount a volume to /app/data for persistence
			const dataDir = './data';
			const fs = await import('node:fs');
			if (!fs.existsSync(dataDir)) {
				fs.mkdirSync(dataDir, { recursive: true });
			}
			const client = new PGlite(dataDir);
			const db = drizzlePglite(client);
			console.log('Running PGlite migrations...');
			await migratePglite(db, { migrationsFolder: './drizzle/migrations' });
			console.log('PGlite migrations completed successfully!');
			await seedProduction(db);
			await client.close();
		} catch (error) {
			console.error('PGlite migration failed:', error);
			process.exit(1);
		}
	}
}

runMigrations();
