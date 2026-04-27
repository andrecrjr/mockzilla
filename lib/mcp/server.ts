import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as handlers from './handlers';
import * as schemas from './schemas';

export function registerAllTools(server: McpServer) {
	// FOLDERS
	server.registerTool(
		'list_folders',
		{
			title: 'List Folders',
			description: 'List folders with pagination',
			inputSchema: schemas.ListFoldersArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callListFolders(args);
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
		async (args, _extra) => {
			const result = await handlers.callCreateFolder(args);
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
		async (args, _extra) => {
			const result = await handlers.callGetFolder(args);
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
		async (args, _extra) => {
			const result = await handlers.callUpdateFolder(args);
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
		async (args, _extra) => {
			const result = await handlers.callDeleteFolder(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	// MOCKS
	server.registerTool(
		'create_mock',
		{
			title: 'Create Mock',
			description: 'Create a mock response',
			inputSchema: schemas.CreateMockArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callCreateMock(args);
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
		async (args, _extra) => {
			const result = await handlers.callListMocks(args);
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
		async (args, _extra) => {
			const result = await handlers.callGetMock(args);
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
		async (args, _extra) => {
			const result = await handlers.callUpdateMock(args);
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
		async (args, _extra) => {
			const result = await handlers.callDeleteMock(args);
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
			inputSchema: z.object({
				name: z.string(),
				path: z.string(),
				method: z.enum([
					'GET',
					'POST',
					'PUT',
					'PATCH',
					'DELETE',
					'HEAD',
					'OPTIONS',
				]),
				statusCode: z.number().int(),
				folderSlug: z.string().nullable().optional(),
				folderId: z.string().nullable().optional(),
				jsonSchema: z.string(),
				enabled: z.boolean().optional(),
				matchType: z.enum(['exact', 'substring', 'wildcard']).optional(),
				queryParams: z.record(z.string()).nullable().optional(),
				variants: z.array(schemas.MockVariantSchema).nullable().optional(),
				wildcardRequireMatch: z.boolean().optional(),
				echoRequestBody: z.boolean().nullable().optional(),
			}),
		},
		async (args, _extra) => {
			const result = await handlers.callCreateSchemaMock(args);
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
		async (args, _extra) => {
			const result = await handlers.callPreviewMock(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	// WORKFLOWS
	server.registerTool(
		'create_workflow_transition',
		{
			title: 'Create Workflow Transition',
			description: 'Create a stateful transition for a workflow scenario',
			inputSchema: schemas.CreateWorkflowTransitionArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callCreateWorkflowTransition(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'reset_workflow_state',
		{
			title: 'Reset Workflow State',
			description: 'Reset the state and DB of a scenario',
			inputSchema: schemas.ResetWorkflowStateArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callResetWorkflowState(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'inspect_workflow_state',
		{
			title: 'Inspect Workflow State',
			description: 'View the current state and DB of a scenario',
			inputSchema: schemas.InspectWorkflowStateArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callInspectWorkflowState(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'update_workflow_transition',
		{
			title: 'Update Workflow Transition',
			description: 'Update an existing workflow transition by ID',
			inputSchema: schemas.UpdateWorkflowTransitionArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callUpdateWorkflowTransition(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'delete_workflow_transition',
		{
			title: 'Delete Workflow Transition',
			description: 'Delete a workflow transition by ID',
			inputSchema: schemas.DeleteWorkflowTransitionArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callDeleteWorkflowTransition(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'list_workflow_transitions',
		{
			title: 'List Workflow Transitions',
			description: 'List all transitions for a scenario',
			inputSchema: schemas.ListWorkflowTransitionsArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callListWorkflowTransitions(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'create_workflow_scenario',
		{
			title: 'Create Workflow Scenario',
			description:
				'Create a new container for a stateful workflow. Use this for Scenarios, NOT for simple Mock Folders. Generates a slug-based ID from the name.',
			inputSchema: schemas.CreateWorkflowScenarioArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callCreateWorkflowScenario(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'list_workflow_scenarios',
		{
			title: 'List Workflow Scenarios',
			description: 'List existing workflow scenarios.',
			inputSchema: schemas.ListWorkflowScenariosArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callListWorkflowScenarios(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'delete_workflow_scenario',
		{
			title: 'Delete Workflow Scenario',
			description: 'Delete a workflow scenario by ID.',
			inputSchema: schemas.DeleteWorkflowScenarioArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callDeleteWorkflowScenario(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'test_workflow',
		{
			title: 'Test Workflow',
			description:
				'Test a workflow transition by simulating a request to a path. This executes the full workflow logic, including checking conditions and applying side effects (updating state, modifying the mini-database).',
			inputSchema: schemas.TestWorkflowArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callTestWorkflow(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'export_workflow',
		{
			title: 'Export Workflow',
			description: 'Export one or all workflow scenarios to JSON',
			inputSchema: schemas.ExportWorkflowArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callExportWorkflow(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'import_workflow',
		{
			title: 'Import Workflow',
			description: 'Import workflow scenarios from JSON',
			inputSchema: schemas.ImportWorkflowArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callImportWorkflow(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);
	server.registerTool(
		'create_full_workflow',
		{
			title: 'Create Full Workflow',
			description: 'Create a scenario and all its transitions in a single one-shot operation.',
			inputSchema: schemas.CreateFullWorkflowArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callCreateFullWorkflow(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'evaluate_template',
		{
			title: 'Evaluate Template',
			description: 'Statelessly evaluate a template string or object using provided context to test interpolation logic.',
			inputSchema: schemas.EvaluateTemplateArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callEvaluateTemplate(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);
	server.registerTool(
		'seed_workflow_state',
		{
			title: 'Seed Workflow State',
			description: 'Directly inject state and table data into a workflow scenario to set up starting conditions.',
			inputSchema: schemas.SeedWorkflowStateArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callSeedWorkflowState(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	// LOGS
	server.registerTool(
		'get_logs',
		{
			title: 'Get Logs',
			description: 'Retrieve structured application logs with filtering and search capabilities.',
			inputSchema: schemas.GetLogsArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callGetLogs(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'get_request_trace',
		{
			title: 'Get Request Trace',
			description: 'Get the full lifecycle trace of a specific HTTP request by its ID.',
			inputSchema: schemas.GetRequestTraceArgs,
		},
		async (args, _extra) => {
			const result = await handlers.callGetRequestTrace(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'clear_logs',
		{
			title: 'Clear Logs',
			description: 'Clear all application logs.',
			inputSchema: z.object({}),
		},
		async (_args, _extra) => {
			const result = await handlers.callClearLogs();
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);
}
