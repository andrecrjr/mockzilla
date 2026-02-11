import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { NextRequest } from 'next/server';
import { registerFolderTools } from '@/lib/mcp/tools/folders';
import { registerMockTools } from '@/lib/mcp/tools/mocks';
import { registerWorkflowTools } from '@/lib/mcp/tools/workflows';

const server = new McpServer(
	{ name: 'Mockzilla', version: '2.0.0' },
	{ capabilities: { tools: {} } }
);

registerFolderTools(server);
registerMockTools(server);
registerWorkflowTools(server);

const mcpHandler = async (req: NextRequest) => {
	const transport = new WebStandardStreamableHTTPServerTransport();
	await server.connect(transport);
	return transport.handleRequest(req);
};

export { mcpHandler as GET, mcpHandler as POST, mcpHandler as DELETE };
