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
			expect(Array.isArray(tool.inputSchema.anyOf)).toBe(true);
		}

		const createMock = actionVariant(
			byName.get('manage_mocks')?.inputSchema as JsonSchema,
			'create',
		);
		expect((createMock.properties as JsonSchema).statusCode).toMatchObject({
			type: 'integer',
		});
		expect(createMock.required).toEqual([
			'action',
			'name',
			'path',
			'method',
			'statusCode',
		]);
		expect(createMock.allOf).toMatchObject([
			{ anyOf: [{ required: ['folderId'] }, { required: ['folderSlug'] }] },
			{ anyOf: [{ required: ['response'] }, { required: ['jsonSchema'] }] },
		]);
		expect((createMock.properties as JsonSchema).delay).toMatchObject({
			type: 'integer',
		minimum: 0,
		});
		expect((createMock.properties as JsonSchema).statusCode).toMatchObject({
		minimum: 200,
		maximum: 599,
	});

		const listFolders = actionVariant(
			byName.get('manage_folders')?.inputSchema as JsonSchema,
			'list',
		);
		expect((listFolders.properties as JsonSchema).page).toMatchObject({
			type: 'integer',
		});
		const getFolder = actionVariant(
			byName.get('manage_folders')?.inputSchema as JsonSchema,
			'get',
		);
		expect(getFolder.allOf).toMatchObject([
			{ anyOf: [{ required: ['id'] }, { required: ['slug'] }] },
		]);
		const listLogs = actionVariant(
			byName.get('manage_logs')?.inputSchema as JsonSchema,
			'get',
		);
		expect((listLogs.properties as JsonSchema).limit).toMatchObject({
			type: 'integer',
		});
	});
});
