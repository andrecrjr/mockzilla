import { zodToJsonSchema } from 'zod-to-json-schema';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
	ManageFoldersInputSchema,
	ManageMockSubfoldersInputSchema,
} from './schemas/folders';
import { ManageLogsArgs } from './schemas/logs';
import { ManageMocksInputSchema } from './schemas/mocks';
import {
	ManageScenariosArgs,
	ManageTransitionsArgs,
	WorkflowControlArgs,
} from './schemas/workflows';
import type { z } from 'zod';

type ActionTool = {
	name: string;
	title: string;
	description: string;
	inputSchema: z.ZodType<unknown>;
};

type JsonSchema = Record<string, unknown>;

const actionTools: readonly ActionTool[] = [
	{
		name: 'manage_folders',
		title: 'Manage Folders',
		description: 'Perform CRUD operations on folders (list, create, get, update, delete).',
		inputSchema: ManageFoldersInputSchema,
	},
	{
		name: 'manage_mock_subfolders',
		title: 'Manage Mock Subfolders',
		description: 'Perform CRUD operations on mock subfolders nested inside a top-level folder.',
		inputSchema: ManageMockSubfoldersInputSchema,
	},
	{
		name: 'manage_mocks',
		title: 'Manage Mocks',
		description: 'Perform CRUD and preview operations on mock responses (list, create, get, update, delete, preview).',
		// Keep this a root object. Some MCP-to-function bridges cannot derive
		// argument types from a root `anyOf`, causing numeric inputs such as
		// `statusCode` to be serialized as strings.
		inputSchema: ManageMocksInputSchema,
	},
	{
		name: 'manage_scenarios',
		title: 'Manage Scenarios',
		description: 'CRUD operations and import/export for workflow scenarios.',
		inputSchema: ManageScenariosArgs,
	},
	{
		name: 'manage_transitions',
		title: 'Manage Transitions',
		description: 'CRUD operations for workflow transitions.',
		inputSchema: ManageTransitionsArgs,
	},
	{
		name: 'workflow_control',
		title: 'Workflow Control',
		description: 'Test, inspect, and seed workflow state.',
		inputSchema: WorkflowControlArgs,
	},
	{
		name: 'manage_logs',
		title: 'Manage Logs',
		description: 'Retrieve, trace, and clear application logs.',
		inputSchema: ManageLogsArgs,
	},
];

function isJsonSchema(value: unknown): value is JsonSchema {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addConditionalRequirement(
	schema: JsonSchema,
	action: string,
	requiredAlternatives: readonly string[][],
) {
	if (!Array.isArray(schema.anyOf)) return;
	const actionSchema = schema.anyOf.find((candidate) => {
		if (!isJsonSchema(candidate) || !isJsonSchema(candidate.properties)) {
			return false;
		}
		const actionProperty = candidate.properties.action;
		return isJsonSchema(actionProperty) && actionProperty.const === action;
	});
	if (!isJsonSchema(actionSchema)) return;

	const allOf = Array.isArray(actionSchema.allOf) ? actionSchema.allOf : [];
	actionSchema.allOf = [
		...allOf,
		{
			anyOf: requiredAlternatives.map((required) => ({ required })),
		},
	];
}

function toActionInputSchema(tool: ActionTool) {
	const schema: JsonSchema = {
		...zodToJsonSchema(tool.inputSchema, { strictUnions: true }),
		type: 'object' as const,
	};
	if (tool.name === 'manage_folders') {
		addConditionalRequirement(schema, 'get', [['id'], ['slug']]);
	}
	if (tool.name === 'manage_mocks') {
		addConditionalRequirement(schema, 'create', [['folderId'], ['folderSlug']]);
		addConditionalRequirement(schema, 'create', [['response'], ['jsonSchema']]);
	}
	return schema;
}

/**
 * MCP's high-level server serializes only Zod object schemas and loses
 * discriminated-union branches. Replace its tools/list handler so callers see
 * the action-specific required fields while tool calls retain SDK validation.
 */
export function registerActionToolListing(server: McpServer) {
	server.server.setRequestHandler(ListToolsRequestSchema, () => ({
		tools: actionTools.map((tool) => ({
			name: tool.name,
			title: tool.title,
			description: tool.description,
			inputSchema: toActionInputSchema(tool),
		})),
	}));
}
