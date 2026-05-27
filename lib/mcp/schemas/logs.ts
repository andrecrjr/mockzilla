import { z } from 'zod';

export const GetLogsArgs = z.object({
	limit: z.number().int().min(1).max(500).optional().describe('Maximum number of logs to return (default 100)'),
	type: z.string().optional().describe('Filter by log type (e.g., "intercept")'),
	level: z.union([z.number(), z.string()]).optional().describe('Filter by log level (10-60 or "info", "error", etc)'),
	search: z.string().optional().describe('Text search within the message'),
});
export type GetLogsArgs = z.infer<typeof GetLogsArgs>;

export const GetRequestTraceArgs = z.object({
	reqId: z.string().describe('The unique request ID to trace (found in logs)'),
});
export type GetRequestTraceArgs = z.infer<typeof GetRequestTraceArgs>;

export const ManageLogsArgs = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('get'),
		limit: z.number().int().min(1).max(500).optional(),
		type: z.string().optional(),
		level: z.union([z.number(), z.string()]).optional(),
		search: z.string().optional(),
	}),
	z.object({
		action: z.literal('trace'),
		reqId: z.string(),
	}),
	z.object({
		action: z.literal('clear'),
	}),
]);
export type ManageLogsArgs = z.infer<typeof ManageLogsArgs>;
