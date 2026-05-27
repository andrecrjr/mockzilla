import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ManageFoldersArgs } from '../schemas/folders';

export function registerFolderTools(server: McpServer) {
	server.registerTool(
		'manage_folders',
		{
			title: 'Manage Folders',
			description: 'Perform CRUD operations on folders (list, create, get, update, delete).',
			inputSchema: ManageFoldersArgs as any,
		},
		async (args: any) => {
			const { callManageFolders } = await import('../handlers');
			const result = await callManageFolders(args);
			return {
				content: [{ type: 'text' as const, text: JSON.stringify(result) }],
			};
		},
	);
}
