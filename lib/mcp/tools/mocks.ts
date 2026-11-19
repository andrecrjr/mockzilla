import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import {
	ManageMocksArgs,
	ManageMocksInputSchema,
} from '../schemas/mocks';

function asMcpInputSchema(schema: unknown): AnySchema {
	return schema as AnySchema;
}

export function registerMockTools(server: McpServer) {
	server.registerTool(
		'manage_mocks',
		{
			title: 'Manage Mocks',
			description:
				'Perform CRUD and preview operations on mock responses (list, create, get, update, delete, preview).',
			inputSchema: asMcpInputSchema(ManageMocksInputSchema),
		},
		async (args: unknown) => {
			const { callManageMocks } = await import('../handlers');
			const result = await callManageMocks(ManageMocksArgs.parse(args));
			return {
				content: [{ type: 'text' as const, text: JSON.stringify(result) }],
			};
		},
	);
}
