import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

async function runMigrations() {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		console.error('DATABASE_URL environment variable is not set');
		process.exit(1);
	}

	console.log('Connecting to database...');

	const { Pool } = pg;
	const pool = new Pool({ connectionString: databaseUrl, max: 1 });

	try {
		const db = drizzle(pool);

		console.log('Running migrations...');
		await migrate(db, { migrationsFolder: './drizzle/migrations' });

		console.log('Migrations completed successfully!');
	} catch (error) {
		console.error('Migration failed:', error);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

runMigrations();
