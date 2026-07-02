import pino from 'pino';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pretty from 'pino-pretty';
import { MOCKZILLA_VERSION } from '@/lib/version';

function getEnvPath(name: string) {
	const value = process.env[name];
	return value && value.trim().length > 0 ? value : undefined;
}

function ensureWritableDirectory(directory: string) {
	try {
		fs.mkdirSync(directory, { recursive: true });
		fs.accessSync(directory, fs.constants.W_OK);
		return directory;
	} catch (_error) {
		return undefined;
	}
}

function resolveLogDir() {
	const explicitLogDir = getEnvPath('MOCKZILLA_LOG_DIR');
	const desktopDataDir =
		process.env.MOCKZILLA_DESKTOP === '1' ? getEnvPath('MOCKZILLA_DATA_DIR') : undefined;
	const candidates = [
		explicitLogDir,
		desktopDataDir ? path.resolve(desktopDataDir, '..', 'logs') : undefined,
		path.join(process.cwd(), '.logs'),
		path.join(os.tmpdir(), 'mockzilla-logs'),
	].filter((candidate): candidate is string => Boolean(candidate));

	for (const candidate of candidates) {
		const logDir = ensureWritableDirectory(candidate);
		if (logDir) {
			return logDir;
		}
	}

	return undefined;
}

const LOG_DIR = resolveLogDir();

const streams = [
	...(LOG_DIR
		? [{ stream: fs.createWriteStream(path.join(LOG_DIR, 'mockzilla.log'), { flags: 'a' }) }]
		: []),
	{
		stream: process.env.NODE_ENV === 'production' ? process.stdout : pretty({ colorize: true }),
	},
];

function getLogFile() {
	return LOG_DIR ? path.join(LOG_DIR, 'mockzilla.log') : undefined;
}

export const logger = pino(
	{
		level: process.env.LOG_LEVEL || 'info',
		base: { pid: process.pid, service: 'mockzilla', version: MOCKZILLA_VERSION },
		timestamp: pino.stdTimeFunctions.isoTime,
	},
	pino.multistream(streams)
);

export type Logger = typeof logger;

// Compatibility wrapper for intercepted requests
export function logInterceptedRequest(entry: Record<string, unknown>) {
	logger.info({
		type: 'intercept',
		...entry,
	}, `Intercepted ${entry.method} ${entry.path}`);
}

/**
 * Returns logs by reading from the log file.
 * Since it's NDJSON, we parse each line.
 */
export function getLogs(limit = 100, type?: string): Record<string, unknown>[] {
	try {
		const logFile = getLogFile();
		if (!logFile) return [];
		if (!fs.existsSync(logFile)) return [];

		const content = fs.readFileSync(logFile, 'utf8');
		const lines = content.trim().split('\n').filter(Boolean);

		let entries = lines
			.map((line) => {
				try {
					return JSON.parse(line) as Record<string, unknown>;
				} catch (_e) {
					return null;
				}
			})
			.filter((e): e is Record<string, unknown> => e !== null);

		if (type) {
			entries = entries.filter((e) => e.type === type);
		}

		// Return newest first
		return entries.reverse().slice(0, limit);
	} catch (error) {
		console.error('Failed to read logs:', error);
		return [];
	}
}

/**
 * Specifically returns all logs for a single Request ID
 */
export function getRequestTrace(reqId: string): Record<string, unknown>[] {
	try {
		const logFile = getLogFile();
		if (!logFile) return [];
		if (!fs.existsSync(logFile)) return [];

		const content = fs.readFileSync(logFile, 'utf8');
		const lines = content.trim().split('\n').filter(Boolean);

		return lines
			.map((line) => {
				try {
					return JSON.parse(line) as Record<string, unknown>;
				} catch (_e) {
					return null;
				}
			})
			.filter((e): e is Record<string, unknown> => e !== null && e.reqId === reqId);
	} catch (error) {
		console.error('Failed to trace request:', error);
		return [];
	}
}

export function clearLogs() {
	try {
		const logFile = getLogFile();
		if (!logFile) return;
		if (fs.existsSync(logFile)) {
			fs.writeFileSync(logFile, '');
		}
	} catch (error) {
		console.error('Failed to clear logs:', error);
	}
}
