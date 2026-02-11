import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSimpleTool } from '../helpers';
import { handleFindMocks, handleManageMocks, handlePreviewMock } from '../handlers/mocks';
import { FindMocksSchema, ManageMocksSchema, PreviewMockSchema } from '../schemas/mocks';

export function registerMockTools(server: McpServer) {
	registerSimpleTool(
		server,
		'find_mocks',
		{
			title: 'Find Mocks',
			description: 'List mocks with optional filtering or get a specific mock by ID.',
			inputSchema: FindMocksSchema,
		},
		handleFindMocks
	);

	registerSimpleTool(
		server,
		'manage_mocks',
		{
			title: 'Manage Mocks',
			description: 'Create, update, or delete mocks (including schema-based mocks).',
			inputSchema: ManageMocksSchema,
		},
		handleManageMocks
	);

	registerSimpleTool(
		server,
		'preview_mock',
		{
			title: 'Preview Mock',
			description: 'Preview the response for a mock path given specific inputs.',
			inputSchema: PreviewMockSchema,
		},
		handlePreviewMock
	);
}
