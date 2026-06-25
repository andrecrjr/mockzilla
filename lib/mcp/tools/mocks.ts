import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ManageMocksArgs } from '../schemas/mocks';

export function registerMockTools(server: McpServer) {
	server.registerTool(
		'manage_mocks',
		{
			title: 'Manage Mocks',
			description:
				'Perform CRUD and preview operations on mock responses (list, create, get, update, delete, preview).',
			inputSchema: ManageMocksArgs as any,
		},
		async (args: any) => {
			const { callManageMocks } = await import('../handlers');
			const result = await callManageMocks(args);
			return {
				content: [{ type: 'text' as const, text: JSON.stringify(result) }],
			};
		},
	);
}
