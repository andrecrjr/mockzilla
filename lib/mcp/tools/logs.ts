import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { ManageLogsArgs, ManageLogsInputSchema } from '../schemas/logs';

function asMcpInputSchema(schema: unknown): AnySchema {
	return schema as AnySchema;
}

export function registerLogTools(server: McpServer) {
	server.registerTool(
		'manage_logs',
		{
			title: 'Manage Logs',
			description: 'Retrieve, trace, and clear application logs.',
			inputSchema: asMcpInputSchema(ManageLogsInputSchema),
		},
		async (args: unknown) => {
			const { callManageLogs } = await import('../handlers');
			const result = await callManageLogs(ManageLogsArgs.parse(args));
			return {
				content: [{ type: 'text' as const, text: JSON.stringify(result) }],
			};
		},
	);
}
