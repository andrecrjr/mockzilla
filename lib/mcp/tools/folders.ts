import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import {
	ManageFoldersArgs,
	ManageMockSubfoldersArgs,
} from '../schemas/folders';

function asMcpInputSchema(schema: unknown): AnySchema {
	return schema as AnySchema;
}

export function registerFolderTools(server: McpServer) {
	server.registerTool(
		'manage_folders',
		{
			title: 'Manage Folders',
			description:
				'Perform CRUD operations on folders (list, create, get, update, delete).',
			inputSchema: asMcpInputSchema(ManageFoldersArgs),
		},
		async (args: unknown) => {
			const { callManageFolders } = await import('../handlers');
			const result = await callManageFolders(ManageFoldersArgs.parse(args));
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
			inputSchema: asMcpInputSchema(ManageMockSubfoldersArgs),
		},
		async (args: unknown) => {
			const { callManageMockSubfolders } = await import('../handlers');
			const result = await callManageMockSubfolders(
				ManageMockSubfoldersArgs.parse(args),
			);
			return {
				content: [{ type: 'text' as const, text: JSON.stringify(result) }],
			};
		},
	);
}
