import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { NextRequest } from 'next/server';
import { registerAllTools } from '../../../lib/mcp/server';

const corsHeaders = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers':
		'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version',
	'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
	'access-control-allow-origin': '*',
	'access-control-max-age': '86400',
};

function withCors(response: Response) {
	const headers = new Headers(response.headers);
	for (const [key, value] of Object.entries(corsHeaders)) {
		headers.set(key, value);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

async function handler(req: NextRequest) {
	const server = new McpServer({
		name: 'Mockzilla',
		version: '1.0.1',
	});
	registerAllTools(server);

	const transport = new WebStandardStreamableHTTPServerTransport({
		enableJsonResponse: true,
		sessionIdGenerator: undefined,
	});

	await server.connect(transport);

	try {
		const response = await transport.handleRequest(req);
		return withCors(response);
	} finally {
		if (req.method !== 'GET') {
			await server.close();
		}
	}
}

export const GET = async (req: NextRequest) => handler(req);
export const POST = async (req: NextRequest) => handler(req);
export const DELETE = async (req: NextRequest) => handler(req);
export const OPTIONS = async () => new Response(null, { headers: corsHeaders });
