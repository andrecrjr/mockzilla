import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as schemas from '../schemas';

export function registerMockTools(server: McpServer) {
	server.registerTool(
		'create_mock',
		{
			title: 'Create Mock',
			description: 'Create a mock response',
			inputSchema: schemas.CreateMockArgs,
		},
		async (args: schemas.CreateMockArgs) => {
			const { callCreateMock } = await import('../handlers');
			const result = await callCreateMock(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'list_mocks',
		{
			title: 'List Mocks',
			description: 'List mocks with pagination and optional folder filter',
			inputSchema: schemas.ListMocksArgs,
		},
		async (args: schemas.ListMocksArgs) => {
			const { callListMocks } = await import('../handlers');
			const result = await callListMocks(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'get_mock',
		{
			title: 'Get Mock',
			description: 'Get a mock by id',
			inputSchema: schemas.GetMockArgs,
		},
		async (args: schemas.GetMockArgs) => {
			const { callGetMock } = await import('../handlers');
			const result = await callGetMock(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'update_mock',
		{
			title: 'Update Mock',
			description: 'Update a mock by id',
			inputSchema: schemas.UpdateMockArgs,
		},
		async (args: schemas.UpdateMockArgs) => {
			const { callUpdateMock } = await import('../handlers');
			const result = await callUpdateMock(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'delete_mock',
		{
			title: 'Delete Mock',
			description: 'Delete a mock by id',
			inputSchema: schemas.DeleteMockArgs,
		},
		async (args: schemas.DeleteMockArgs) => {
			const { callDeleteMock } = await import('../handlers');
			const result = await callDeleteMock(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'create_schema_mock',
		{
			title: 'Create Schema Mock',
			description:
				'Create a mock using a JSON Schema with Faker directives and field interpolation',
			inputSchema: schemas.CreateSchemaMockArgs,
		},
		async (args: schemas.CreateSchemaMockArgs) => {
			const { callCreateSchemaMock } = await import('../handlers');
			const result = await callCreateSchemaMock(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'preview_mock',
		{
			title: 'Preview Mock',
			description: 'Preview the response for a mock path',
			inputSchema: schemas.PreviewMockArgs,
		},
		async (args: schemas.PreviewMockArgs) => {
			const { callPreviewMock } = await import('../handlers');
			const result = await callPreviewMock(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);
}
