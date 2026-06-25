import * as fs from 'node:fs';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { Pool } from 'pg';
import * as schema from './schema';
import { getPgliteDataDir } from './runtime';

type DbInstance = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

let db: DbInstance;

export { getPgliteDataDir };

export async function initDb(url?: string) {
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
	// In Docker, mount a volume to /app/data for persistence.
	// In desktop builds, MOCKZILLA_DATA_DIR points at a dedicated PGlite directory.
	const dataDir = getPgliteDataDir();
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}
	const { PGlite } = await import('@electric-sql/pglite');
	const client = new PGlite(dataDir);
	return drizzlePglite(client, { schema });
}

// Initialize DB and export as a promise if needed, but for now we keep synchronous-ish export
// actually we need to handle the async nature of dynamic import
const dbPromise = initDb(process.env.DATABASE_URL);
db = await dbPromise;

// Export schema for use in queries
export { db, schema };
