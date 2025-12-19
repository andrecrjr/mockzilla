import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import * as schema from './schema';
import fs from 'node:fs';

import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgliteDatabase } from 'drizzle-orm/pglite';

let db: NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

if (process.env.DATABASE_URL) {
	// Create PostgreSQL connection pool
	const pool = new Pool({
		connectionString: process.env.DATABASE_URL,
		max: 20,
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 2000,
	});

	// Create Drizzle instance with schema
	db = drizzlePg(pool, { schema });
} else {
	console.log('DATABASE_URL not set, falling back to PGlite');
	// Create PGlite instance with persistent storage
	// In Docker, mount a volume to /app/data for persistence
	const dataDir = './data';
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}
	const client = new PGlite(dataDir);
	db = drizzlePglite(client, { schema });
}

// Export schema for use in queries
export { db, schema };
