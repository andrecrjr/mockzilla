import { createMcpHandler } from 'mcp-handler';
import type { NextRequest } from 'next/server';
import { registerAllTools } from '@/lib/mcp/server';

// Use mcp-handler to create the Next.js route handlers
const handler = createMcpHandler(
	(server) => {
		registerAllTools(server);
	},
	{
		serverInfo: {
			name: 'Mockzilla',
			version: '1.0.1',
		},
	},
	{
		basePath: '/api',
	},
);

export const GET = async (req: NextRequest) => handler(req);
export const POST = async (req: NextRequest) => handler(req);
export const DELETE = async (req: NextRequest) => handler(req);
export const OPTIONS = async (req: NextRequest) => handler(req);
