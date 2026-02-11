import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { NextRequest } from 'next/server';
import { registerFolderTools } from '@/lib/mcp/tools/folders';
import { registerMockTools } from '@/lib/mcp/tools/mocks';
import { registerWorkflowTools } from '@/lib/mcp/tools/workflows';

// Initialize server once when module loads
const server = new McpServer(
  { name: 'Mockzilla', version: '2.0.0' },
  { capabilities: { tools: {} } }
);

registerFolderTools(server);
registerMockTools(server);
registerWorkflowTools(server);

const mcpHandler = async (req: NextRequest) => {
  // Create a new transport for each request since we're in a serverless environment
  const transport = new WebStandardStreamableHTTPServerTransport();
  await server.connect(transport);

  try {
    return transport.handleRequest(req);
  } catch (error) {
    console.error('MCP Handler Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

export { mcpHandler as GET, mcpHandler as POST, mcpHandler as DELETE };
