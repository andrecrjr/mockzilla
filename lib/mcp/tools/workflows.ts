import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as schemas from '../schemas';

export function registerWorkflowTools(server: McpServer) {
	server.registerTool(
		'create_workflow_transition',
		{
			title: 'Create Workflow Transition',
			description: 'Create a stateful transition for a workflow scenario',
			inputSchema: schemas.CreateWorkflowTransitionArgs,
		},
		async (args: schemas.CreateWorkflowTransitionArgs) => {
			const { callCreateWorkflowTransition } = await import('../handlers');
			const result = await callCreateWorkflowTransition(args);
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
		async (args: schemas.ResetWorkflowStateArgs) => {
			const { callResetWorkflowState } = await import('../handlers');
			const result = await callResetWorkflowState(args);
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
		async (args: schemas.InspectWorkflowStateArgs) => {
			const { callInspectWorkflowState } = await import('../handlers');
			const result = await callInspectWorkflowState(args);
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
		async (args: schemas.UpdateWorkflowTransitionArgs) => {
			const { callUpdateWorkflowTransition } = await import('../handlers');
			const result = await callUpdateWorkflowTransition(args);
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
		async (args: schemas.DeleteWorkflowTransitionArgs) => {
			const { callDeleteWorkflowTransition } = await import('../handlers');
			const result = await callDeleteWorkflowTransition(args);
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
		async (args: schemas.ListWorkflowTransitionsArgs) => {
			const { callListWorkflowTransitions } = await import('../handlers');
			const result = await callListWorkflowTransitions(args);
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
		async (args: schemas.CreateWorkflowScenarioArgs) => {
			const { callCreateWorkflowScenario } = await import('../handlers');
			const result = await callCreateWorkflowScenario(args);
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
		async (args: schemas.ListWorkflowScenariosArgs) => {
			const { callListWorkflowScenarios } = await import('../handlers');
			const result = await callListWorkflowScenarios(args);
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
		async (args: schemas.DeleteWorkflowScenarioArgs) => {
			const { callDeleteWorkflowScenario } = await import('../handlers');
			const result = await callDeleteWorkflowScenario(args);
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
		async (args: schemas.TestWorkflowArgs) => {
			const { callTestWorkflow } = await import('../handlers');
			const result = await callTestWorkflow(args);
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
		async (args: schemas.ExportWorkflowArgs) => {
			const { callExportWorkflow } = await import('../handlers');
			const result = await callExportWorkflow(args);
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
		async (args: schemas.ImportWorkflowArgs) => {
			const { callImportWorkflow } = await import('../handlers');
			const result = await callImportWorkflow(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'create_full_workflow',
		{
			title: 'Create Full Workflow',
			description:
				'Create a scenario and all its transitions in a single one-shot operation.',
			inputSchema: schemas.CreateFullWorkflowArgs,
		},
		async (args: schemas.CreateFullWorkflowArgs) => {
			const { callCreateFullWorkflow } = await import('../handlers');
			const result = await callCreateFullWorkflow(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'evaluate_template',
		{
			title: 'Evaluate Template',
			description:
				'Statelessly evaluate a template string or object using provided context to test interpolation logic.',
			inputSchema: schemas.EvaluateTemplateArgs,
		},
		async (args: schemas.EvaluateTemplateArgs) => {
			const { callEvaluateTemplate } = await import('../handlers');
			const result = await callEvaluateTemplate(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'seed_workflow_state',
		{
			title: 'Seed Workflow State',
			description:
				'Directly inject state and table data into a workflow scenario to set up starting conditions.',
			inputSchema: schemas.SeedWorkflowStateArgs,
		},
		async (args: schemas.SeedWorkflowStateArgs) => {
			const { callSeedWorkflowState } = await import('../handlers');
			const result = await callSeedWorkflowState(args);
			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
			};
		},
	);
}
