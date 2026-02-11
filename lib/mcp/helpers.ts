import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { folders, mockResponses } from '@/lib/db/schema';

/**
 * Generates a URL-friendly slug from a name string
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

/**
 * Parses a numeric value from a string or returns a default
 */
export function parseNumber(val: string | number | undefined | null, defaultValue: number): number {
  if (val === undefined || val === null) return defaultValue;
  const parsed = Number(val);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parse JSON or return the original value
 */
export function parseJsonOrPassthrough(data: unknown): unknown {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

/**
 * Helper to register a tool with standard response mapping and error handling
 */
export function registerSimpleTool<
	T extends z.ZodTypeAny,
	R
>(
	server: McpServer,
	name: string,
	config: { title: string; description: string; inputSchema: T },
	handler: (args: z.infer<T>) => Promise<R>
) {
	// We use unknown cast as a bridge between local zod and SDK's zod-compat types.
	// This avoids the "any" keyword while satisfying the structural requirements of registerTool.
	type RegisterToolConfig = Parameters<McpServer['registerTool']>[1];
	const inputSchema = config.inputSchema as unknown as NonNullable<RegisterToolConfig['inputSchema']>;

	// By casting the entire config and the callback, we bypass the generic inference 
	// that causes structural mismatch between different Zod versions.
	server.registerTool(
		name,
		{
			title: config.title,
			description: config.description,
			inputSchema,
		} as unknown as Parameters<McpServer['registerTool']>[1],
		(async (args: unknown) => {
			const typedArgs = args as z.infer<T>;
			try {
				const result = await handler(typedArgs);
				return {
					content: [
						{
							type: 'text' as const,
							text: JSON.stringify(result, null, 2),
						},
					],
				};
			} catch (error) {
				return {
					isError: true,
					content: [
						{
							type: 'text' as const,
							text: error instanceof Error ? error.message : String(error),
						},
					],
				};
			}
		}) as unknown as Parameters<McpServer['registerTool']>[2]
	);
}

/**
 * Standardize folder response for consistency
 */
export function toFolderResponse(row: typeof folders.$inferSelect | null | undefined) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Standardize mock response for consistency
 */
export function toMockResponse(row: typeof mockResponses.$inferSelect | null | undefined) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    endpoint: row.endpoint,
    method: row.method,
    statusCode: row.statusCode,
    enabled: row.enabled,
    matchType: row.matchType,
    bodyType: row.bodyType,
    useDynamicResponse: row.useDynamicResponse,
    echoRequestBody: row.echoRequestBody,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
