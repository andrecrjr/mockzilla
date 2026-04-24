import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { logger, logInterceptedRequest, getLogs, getRequestTrace, clearLogs } from '../../lib/logger';
import fs from 'node:fs';
import path from 'node:path';

const LOG_DIR = path.join(process.cwd(), '.logs');
const LOG_FILE = path.join(LOG_DIR, 'mockzilla.log');

// Helper to wait for pino to flush
const flushLogs = () => new Promise(resolve => setTimeout(resolve, 100));

describe('lib/logger', () => {
    beforeEach(async () => {
        clearLogs();
        await flushLogs();
    });

    afterEach(async () => {
        clearLogs();
        await flushLogs();
    });

    it('logInterceptedRequest should write a log entry', async () => {
        const entry = {
            method: 'GET',
            path: '/test',
            reqId: 'test-req-id'
        };
        
        logInterceptedRequest(entry);
        await flushLogs();
        
        const logs = getLogs();
        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0]).toMatchObject({
            type: 'intercept',
            method: 'GET',
            path: '/test',
            reqId: 'test-req-id'
        });
    });

    it('getLogs should return limited number of logs', async () => {
        for (let i = 0; i < 5; i++) {
            logger.info({ type: 'test', index: i }, 'test message');
        }
        await flushLogs();
        
        const logs = getLogs(3);
        expect(logs.length).toBe(3);
        // Should be newest first
        expect(logs[0].index).toBe(4);
    });

    it('getLogs should filter by type', async () => {
        logger.info({ type: 'type-a' }, 'msg a');
        logger.info({ type: 'type-b' }, 'msg b');
        await flushLogs();
        
        const logsA = getLogs(10, 'type-a');
        expect(logsA.length).toBe(1);
        expect(logsA[0].type).toBe('type-a');
    });

    it('getRequestTrace should return logs for specific reqId', async () => {
        const reqId = 'trace-this';
        logger.info({ reqId, step: 1 }, 'step 1');
        logger.info({ reqId: 'other', step: 1 }, 'other 1');
        logger.info({ reqId, step: 2 }, 'step 2');
        await flushLogs();
        
        const trace = getRequestTrace(reqId);
        expect(trace.length).toBe(2);
        expect(trace[0].step).toBe(1);
        expect(trace[1].step).toBe(2);
    });

    it('clearLogs should truncate the log file', async () => {
        logger.info('some log');
        await flushLogs();
        expect(fs.existsSync(LOG_FILE)).toBe(true);
        expect(fs.readFileSync(LOG_FILE, 'utf8').length).toBeGreaterThan(0);
        
        clearLogs();
        expect(fs.existsSync(LOG_FILE)).toBe(true);
        expect(fs.readFileSync(LOG_FILE, 'utf8').length).toBe(0);
    });

    it('getLogs should handle non-existent log file', () => {
        clearLogs();
        const logs = getLogs();
        expect(logs).toEqual([]);
    });

    it('getLogs should handle malformed JSON lines', async () => {
        const logFile = path.join(LOG_DIR, 'mockzilla.log');
        fs.appendFileSync(logFile, '{"valid": "json"}\n{invalid json}\n{"another": "valid"}\n');
        
        const logs = getLogs();
        // Should only contain valid entries
        expect(logs.some(l => l.valid === 'json')).toBe(true);
        expect(logs.some(l => l.another === 'valid')).toBe(true);
    });

    it('getRequestTrace should handle malformed JSON lines', async () => {
        const logFile = path.join(LOG_DIR, 'mockzilla.log');
        const reqId = 'malformed-test';
        fs.appendFileSync(logFile, `{"reqId": "${reqId}", "step": 1}\n{invalid}\n{"reqId": "${reqId}", "step": 2}\n`);
        
        const trace = getRequestTrace(reqId);
        expect(trace.length).toBe(2);
        expect(trace[0].step).toBe(1);
        expect(trace[1].step).toBe(2);
    });
});
