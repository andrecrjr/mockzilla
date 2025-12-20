import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

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
			await client.close();
		} catch (error) {
			console.error('PGlite migration failed:', error);
			process.exit(1);
		}
	}
}

runMigrations();
