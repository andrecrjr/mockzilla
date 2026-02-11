import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSimpleTool } from '../helpers';
import { handleFindFolders, handleManageFolders } from '../handlers/folders';
import { FindFoldersSchema, ManageFoldersSchema } from '../schemas/folders';

export function registerFolderTools(server: McpServer) {
	registerSimpleTool(
		server,
		'find_folders',
		{
			title: 'Find Folders',
			description: 'List folders with pagination or get a specific folder by ID/slug.',
			inputSchema: FindFoldersSchema,
		},
		handleFindFolders
	);

	registerSimpleTool(
		server,
		'manage_folders',
		{
			title: 'Manage Folders',
			description: 'Create, update, or delete folders.',
			inputSchema: ManageFoldersSchema,
		},
		handleManageFolders
	);
}
