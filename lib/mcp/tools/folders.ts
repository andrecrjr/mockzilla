import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
	ManageFoldersArgs,
	ManageMockSubfoldersArgs,
	type ManageMockSubfoldersArgs as ManageMockSubfoldersArgsType,
} from '../schemas/folders';

export function registerFolderTools(server: McpServer) {
	server.registerTool(
		'manage_folders',
		{
			title: 'Manage Folders',
			description:
				'Perform CRUD operations on folders (list, create, get, update, delete).',
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

	server.registerTool(
		'manage_mock_subfolders',
		{
			title: 'Manage Mock Subfolders',
			description:
				'Perform CRUD operations on mock subfolders nested inside a top-level folder.',
			inputSchema: ManageMockSubfoldersArgs,
		},
		async (args: ManageMockSubfoldersArgsType) => {
			const { callManageMockSubfolders } = await import('../handlers');
			const result = await callManageMockSubfolders(args);
			return {
				content: [{ type: 'text' as const, text: JSON.stringify(result) }],
			};
		},
	);
}
