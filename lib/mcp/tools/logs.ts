import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as schemas from '../schemas';

export function registerLogTools(server: McpServer) {
	server.registerTool(
		'get_logs',
		{
			title: 'Get Logs',
			description:
				'Retrieve structured application logs with filtering and search capabilities.',
			inputSchema: schemas.GetLogsArgs,
		},
		async (args: schemas.GetLogsArgs) => {
			const { callGetLogs } = await import('../handlers');
			const result = await callGetLogs(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'get_request_trace',
		{
			title: 'Get Request Trace',
			description:
				'Get the full lifecycle trace of a specific HTTP request by its ID.',
			inputSchema: schemas.GetRequestTraceArgs,
		},
		async (args: schemas.GetRequestTraceArgs) => {
			const { callGetRequestTrace } = await import('../handlers');
			const result = await callGetRequestTrace(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'clear_logs',
		{
			title: 'Clear Logs',
			description: 'Clear all application logs.',
			inputSchema: z.object({}),
		},
		async () => {
			const { callClearLogs } = await import('../handlers');
			const result = await callClearLogs();
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);
}
