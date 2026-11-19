import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import {
	ManageScenariosArgs,
	ManageScenariosInputSchema,
	ManageTransitionsArgs,
	ManageTransitionsInputSchema,
	WorkflowControlArgs,
	WorkflowControlInputSchema,
} from '../schemas/workflows';

function asMcpInputSchema(schema: unknown): AnySchema {
	return schema as AnySchema;
}

export function registerWorkflowTools(server: McpServer) {
	server.registerTool(
		'manage_scenarios',
		{
			title: 'Manage Scenarios',
			description: 'CRUD operations and import/export for workflow scenarios.',
			inputSchema: asMcpInputSchema(ManageScenariosInputSchema),
		},
		async (args: unknown) => {
			const { callManageScenarios } = await import('../handlers');
			const result = await callManageScenarios(ManageScenariosArgs.parse(args));
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
			inputSchema: asMcpInputSchema(ManageTransitionsInputSchema),
		},
		async (args: unknown) => {
			const { callManageTransitions } = await import('../handlers');
			const result = await callManageTransitions(ManageTransitionsArgs.parse(args));
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
			inputSchema: asMcpInputSchema(WorkflowControlInputSchema),
		},
		async (args: unknown) => {
			const { callWorkflowControl } = await import('../handlers');
			const result = await callWorkflowControl(WorkflowControlArgs.parse(args));
			return {
				content: [{ type: 'text' as const, text: JSON.stringify(result) }],
			};
		},
	);
}
