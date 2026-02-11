import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSimpleTool } from '../helpers';
import { handleFindWorkflow, handleManageWorkflow, handleTestWorkflow, handleImportExport } from '../handlers/workflows';
import { FindWorkflowSchema, ManageWorkflowSchema, TestWorkflowSchema, ImportExportSchema } from '../schemas/workflows';

export function registerWorkflowTools(server: McpServer) {
	registerSimpleTool(
		server,
		'find_workflow',
		{
			title: 'Find Workflow',
			description: 'List scenarios, transitions, or inspect state.',
			inputSchema: FindWorkflowSchema,
		},
		handleFindWorkflow
	);

	registerSimpleTool(
		server,
		'manage_workflow',
		{
			title: 'Manage Workflow',
			description: 'Create, update, delete scenarios and transitions, or reset state.',
			inputSchema: ManageWorkflowSchema,
		},
		handleManageWorkflow
	);

	registerSimpleTool(
		server,
		'test_workflow',
		{
			title: 'Test Workflow',
			description: 'Test a workflow transition by simulating a request.',
			inputSchema: TestWorkflowSchema,
		},
		handleTestWorkflow
	);

	registerSimpleTool(
		server,
		'import_export',
		{
			title: 'Import/Export Workflows',
			description: 'Import or export workflow scenarios and transitions.',
			inputSchema: ImportExportSchema,
		},
		handleImportExport
	);
}
