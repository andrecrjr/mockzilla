import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterEach, describe, expect, it } from 'bun:test';
import { registerAllTools } from '../../lib/mcp/server';

const connections: Array<{ client: Client; server: McpServer }> = [];

type JsonSchema = Record<string, unknown>;

afterEach(async () => {
	await Promise.all(
		connections.splice(0).flatMap(({ client, server }) => [
			client.close(),
			server.close(),
		]),
	);
});

async function listRegisteredTools() {
	const server = new McpServer({ name: 'test-server', version: '1.0.0' });
	registerAllTools(server);

	const client = new Client({ name: 'test-client', version: '1.0.0' });
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	await Promise.all([
		server.connect(serverTransport),
		client.connect(clientTransport),
	]);
	connections.push({ client, server });

	return client.listTools();
}

async function connectedClient() {
	const server = new McpServer({ name: 'test-server', version: '1.0.0' });
	registerAllTools(server);

	const client = new Client({ name: 'test-client', version: '1.0.0' });
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	await Promise.all([
		server.connect(serverTransport),
		client.connect(clientTransport),
	]);
	connections.push({ client, server });
	return client;
}

function contentText(content: unknown) {
	if (!Array.isArray(content)) return '';

	return content
		.map((block) => {
			if (
				typeof block === 'object' &&
				block !== null &&
				'type' in block &&
				block.type === 'text' &&
				'text' in block &&
				typeof block.text === 'string'
			) {
				return block.text;
			}
			return '';
		})
		.filter(Boolean)
		.join('\n');
}

function actionVariant(schema: JsonSchema, action: string): JsonSchema {
	const variants = schema.anyOf;
	expect(Array.isArray(variants)).toBe(true);
	const variant = (variants as JsonSchema[]).find((candidate) => {
		const properties = candidate.properties as JsonSchema | undefined;
		return properties?.action &&
			(properties.action as JsonSchema).const === action;
	});
	expect(variant).toBeDefined();
	return variant as JsonSchema;
}

describe('MCP tool schemas', () => {
	it('publishes action-specific typed inputs for every manager tool', async () => {
		const { tools } = await listRegisteredTools();
		const byName = new Map(tools.map((tool) => [tool.name, tool]));
		expect(tools).toHaveLength(7);
		for (const tool of tools) {
			expect(tool.inputSchema.type).toBe('object');
			if (
				tool.name !== 'manage_mocks' &&
				tool.name !== 'manage_folders' &&
				tool.name !== 'manage_mock_subfolders'
			) {
				expect(Array.isArray(tool.inputSchema.anyOf)).toBe(true);
			}
		}

		const manageMocks = byName.get('manage_mocks')?.inputSchema as JsonSchema;
		expect(manageMocks.type).toBe('object');
		expect(manageMocks.anyOf).toBeUndefined();
		expect((manageMocks.properties as JsonSchema).statusCode).toMatchObject({
			type: 'integer',
		});

		for (const toolName of ['manage_folders', 'manage_mock_subfolders']) {
			const inputSchema = byName.get(toolName)?.inputSchema as JsonSchema;
			expect(inputSchema.type).toBe('object');
			expect(inputSchema.anyOf).toBeUndefined();
			expect(inputSchema.required).toEqual(['action']);
		}
		expect(manageMocks.required).toEqual(['action']);
		expect((manageMocks.properties as JsonSchema).delay).toMatchObject({
			type: 'integer',
			minimum: 0,
		});
		expect((manageMocks.properties as JsonSchema).statusCode).toMatchObject({
			minimum: 200,
			maximum: 599,
		});

		const manageFolders = byName.get('manage_folders')
			?.inputSchema as JsonSchema;
		expect((manageFolders.properties as JsonSchema).page).toMatchObject({
			type: 'integer',
		});
		const listLogs = actionVariant(
			byName.get('manage_logs')?.inputSchema as JsonSchema,
			'get',
		);
		expect((listLogs.properties as JsonSchema).limit).toMatchObject({
			type: 'integer',
		});
	});

	it('keeps statusCode numeric through an MCP tool call', async () => {
		const client = await connectedClient();
		const baseArguments = {
			action: 'create',
			name: 'schema-audit',
			path: '/schema-audit',
			method: 'GET',
		};

		const numericResult = await client.callTool({
			name: 'manage_mocks',
			arguments: { ...baseArguments, statusCode: 200 },
		});
		expect(numericResult.isError).toBe(true);
		expect(contentText(numericResult.content)).not.toContain(
			'Expected number, received string',
		);
		expect(contentText(numericResult.content)).toContain(
			'folderId or folderSlug is required',
		);

		const stringResult = await client.callTool({
			name: 'manage_mocks',
			arguments: { ...baseArguments, statusCode: '200' },
		});
		expect(stringResult.isError).toBe(true);
		expect(contentText(stringResult.content)).toContain(
			'Expected number, received string',
		);
	});
});
