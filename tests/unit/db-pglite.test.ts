import { describe, expect, it, mock } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

describe('lib/db/index (PGlite path)', () => {
    it('should initialize PGlite when initDb is called without URL', async () => {
        const { initDb } = await import('../../lib/db/index');
        const db = initDb();
        expect(db).toBeDefined();
    });
});
