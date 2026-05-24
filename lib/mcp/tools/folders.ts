import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as schemas from '../schemas';

export function registerFolderTools(server: McpServer) {
	server.registerTool(
		'list_folders',
		{
			title: 'List Folders',
			description: 'List folders with pagination',
			inputSchema: schemas.ListFoldersArgs,
		},
		async (args: schemas.ListFoldersArgs) => {
			const { callListFolders } = await import('../handlers');
			const result = await callListFolders(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'create_folder',
		{
			title: 'Create Folder',
			description: 'Create a folder to group mocks',
			inputSchema: schemas.CreateFolderArgs,
		},
		async (args: schemas.CreateFolderArgs) => {
			const { callCreateFolder } = await import('../handlers');
			const result = await callCreateFolder(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'get_folder',
		{
			title: 'Get Folder',
			description: 'Get a folder by id or slug',
			inputSchema: schemas.GetFolderArgs,
		},
		async (args: schemas.GetFolderArgs) => {
			const { callGetFolder } = await import('../handlers');
			const result = await callGetFolder(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'update_folder',
		{
			title: 'Update Folder',
			description: 'Update a folder by id',
			inputSchema: schemas.UpdateFolderArgs,
		},
		async (args: schemas.UpdateFolderArgs) => {
			const { callUpdateFolder } = await import('../handlers');
			const result = await callUpdateFolder(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'delete_folder',
		{
			title: 'Delete Folder',
			description: 'Delete a folder by id',
			inputSchema: schemas.DeleteFolderArgs,
		},
		async (args: schemas.DeleteFolderArgs) => {
			const { callDeleteFolder } = await import('../handlers');
			const result = await callDeleteFolder(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);
}
