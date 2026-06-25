import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { 
	ManageScenariosArgs, 
	ManageTransitionsArgs, 
	WorkflowControlArgs 
} from '../schemas/workflows';

export function registerWorkflowTools(server: McpServer) {
	server.registerTool(
		'manage_scenarios',
		{
			title: 'Manage Scenarios',
			description: 'CRUD operations and import/export for workflow scenarios.',
			inputSchema: ManageScenariosArgs as any,
		},
		async (args: any) => {
			const { callManageScenarios } = await import('../handlers');
			const result = await callManageScenarios(args);
			return {
				content: [{ type: 'text' as const, text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'manage_transitions',
		{
			title: 'Manage Transitions',
			description: 'CRUD operations for workflow transitions.',
			inputSchema: ManageTransitionsArgs as any,
		},
		async (args: any) => {
			const { callManageTransitions } = await import('../handlers');
			const result = await callManageTransitions(args);
			return {
				content: [{ type: 'text' as const, text: JSON.stringify(result) }],
			};
		},
	);

	server.registerTool(
		'workflow_control',
		{
			title: 'Workflow Control',
			description: 'Test, inspect, and seed workflow state.',
			inputSchema: WorkflowControlArgs as any,
		},
		async (args: any) => {
			const { callWorkflowControl } = await import('../handlers');
			const result = await callWorkflowControl(args);
			return {
				content: [{ type: 'text' as const, text: JSON.stringify(result) }],
			};
		},
	);
}
