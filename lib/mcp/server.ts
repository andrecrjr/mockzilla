import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerFolderTools } from './tools/folders';
import { registerMockTools } from './tools/mocks';
import { registerWorkflowTools } from './tools/workflows';
import { registerLogTools } from './tools/logs';

/**
 * Registers all MCP tools for Mockzilla.
 * Decomposed into modular registration functions to prevent type explosion
 * and TSC memory exhaustion/hangs.
 */
export function registerAllTools(server: McpServer) {
	registerFolderTools(server);
	registerMockTools(server);
	registerWorkflowTools(server);
	registerLogTools(server);
}
