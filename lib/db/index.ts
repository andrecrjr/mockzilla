import * as fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { Pool } from 'pg';
import * as schema from './schema';

type DbInstance = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

let db: DbInstance;

export function initDb(url?: string) {
	if (url) {
		// Create PostgreSQL connection pool
		const pool = new Pool({
			connectionString: url,
			max: 20,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000,
		});

		// Create Drizzle instance with schema
		return drizzlePg(pool, { schema });
	}

	console.log('DATABASE_URL not set, falling back to PGlite');
	// Create PGlite instance with persistent storage
	// In Docker, mount a volume to /app/data for persistence
	const dataDir = './data';
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}
	const client = new PGlite(dataDir);
	return drizzlePglite(client, { schema });
}

db = initDb(process.env.DATABASE_URL);

// Export schema for use in queries
export { db, schema };
