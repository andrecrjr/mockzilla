import { describe, expect, it, } from 'bun:test';

describe('lib/db/index (PGlite path)', () => {
    it('should initialize PGlite when initDb is called without URL', async () => {
        const { initDb } = await import('../../lib/db/index');
        const db = initDb();
        expect(db).toBeDefined();
    });
});
