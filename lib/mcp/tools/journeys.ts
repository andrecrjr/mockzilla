import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { ManageJourneysArgs, ManageJourneysInputSchema } from '../schemas/journeys';

function asMcpInputSchema(schema: unknown): AnySchema {
	return schema as AnySchema;
}

export function registerJourneyTools(server: McpServer) {
	server.registerTool('manage_journeys', {
		title: 'Manage Journeys',
		description: 'Manage Journey definitions, Actions, execution, and reset using the Journey state model.',
		inputSchema: asMcpInputSchema(ManageJourneysInputSchema),
	}, async (args: unknown) => {
		const { callManageJourneys } = await import('../handlers');
		const result = await callManageJourneys(ManageJourneysArgs.parse(args));
		return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
	});
}
