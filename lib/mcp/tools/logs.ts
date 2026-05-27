import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ManageLogsArgs } from '../schemas/logs';

export function registerLogTools(server: McpServer) {
	server.registerTool(
		'manage_logs',
		{
			title: 'Manage Logs',
			description: 'Retrieve, trace, and clear application logs.',
			inputSchema: ManageLogsArgs as any,
		},
		async (args: any) => {
			const { callManageLogs } = await import('../handlers');
			const result = await callManageLogs(args);
			return {
				content: [{ type: 'text' as const, text: JSON.stringify(result) }],
			};
		},
	);
}
