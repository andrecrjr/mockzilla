import { type NextRequest, NextResponse } from 'next/server';
import * as yaml from 'yaml';
import { db } from '@/lib/db';
import { folders, mockResponses } from '@/lib/db/schema';
import { generateFromSchema } from '@/lib/schema-generator';
import type { HttpMethod, MatchType } from '@/lib/types';

function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');
}

function convertOpenApiPathToMockzilla(path: string): {
	endpoint: string;
	matchType: string;
} {
	// Convert /users/{id} to /users/*
	if (path.includes('{')) {
		const endpoint = path.replace(/\{[^}]+\}/g, '*');
		return { endpoint, matchType: 'wildcard' };
	}
	return { endpoint: path, matchType: 'exact' };
}

/**
 * Recursively adds maxItems: 3 to array schemas that don't have it,
 * ensuring the generated mock data is not overly heavy.
 */
function limitArrayItems(schema: unknown): unknown {
	if (!schema || typeof schema !== 'object' || schema === null) return schema;

	// Handle standard schema or nested objects
	if (Array.isArray(schema)) {
		return schema.map((item) => limitArrayItems(item));
	}

	const obj = { ...(schema as Record<string, unknown>) };

	if (obj.type === 'array' && obj.maxItems === undefined) {
		obj.maxItems = 3;
	}

	for (const key of Object.keys(obj)) {
		obj[key] = limitArrayItems(obj[key]);
	}

	return obj;
}

/**
 * Creates a basic fallback object from a schema if generation fails.
 * Ensures the response looks like a real API without extra fields.
 */
function generateFallbackResponse(
	schema: Record<string, unknown> | null | undefined,
): unknown {
	if (!schema) return {};

	const type = schema.type as string | undefined;

	if (schema.default !== undefined) return schema.default;
	if (schema.example !== undefined) return schema.example;

	switch (type) {
		case 'string':
			if (schema.format === 'date-time') return new Date().toISOString();
			if (schema.format === 'date')
				return new Date().toISOString().split('T')[0];
			if (schema.enum && Array.isArray(schema.enum)) return schema.enum[0];
			return '';
		case 'number':
		case 'integer':
			return 0;
		case 'boolean':
			return false;
		case 'array':
			return schema.items
				? [generateFallbackResponse(schema.items as Record<string, unknown>)]
				: [];
		default:
			if (schema.properties && typeof schema.properties === 'object') {
				const obj: Record<string, unknown> = {};
				for (const [key, prop] of Object.entries(schema.properties)) {
					obj[key] = generateFallbackResponse(prop as Record<string, unknown>);
				}
				return obj;
			}
			return {};
	}
}

export async function POST(request: NextRequest) {
	try {
		const { spec } = await request.json();

		if (!spec) {
			return NextResponse.json(
				{ error: 'No OpenAPI specification provided' },
				{ status: 400 },
			);
		}

		let parsedSpec: Record<string, unknown>;
		try {
			parsedSpec = yaml.parse(spec) as Record<string, unknown>;
		} catch (_e) {
			return NextResponse.json(
				{
					error:
						'Failed to parse specification. Ensure it is valid YAML or JSON.',
				},
				{ status: 400 },
			);
		}

		const info = (parsedSpec.info as Record<string, unknown>) || {};
		const folderName = (info.title as string) || 'Imported OpenAPI';
		const folderSlug = generateSlug(folderName);
		const folderDescription =
			(info.description as string) ||
			`Imported from OpenAPI spec: ${folderName}`;

		const results = {
			mocks: 0,
			folderId: '',
		};

		await db.transaction(async (tx) => {
			const [newFolder] = await tx
				.insert(folders)
				.values({
					name: folderName,
					slug: folderSlug,
					description: folderDescription,
				})
				.onConflictDoUpdate({
					target: folders.slug,
					set: {
						name: folderName,
						description: folderDescription,
						updatedAt: new Date(),
					},
				})
				.returning();

			results.folderId = newFolder.id;

			if (parsedSpec.paths) {
				for (const [path, methods] of Object.entries(
					parsedSpec.paths as Record<string, unknown>,
				)) {
					for (const [method, operation] of Object.entries(
						methods as Record<string, unknown>,
					)) {
						if (
							![
								'get',
								'post',
								'put',
								'patch',
								'delete',
								'head',
								'options',
							].includes(method.toLowerCase())
						) {
							continue;
						}

						const op = operation as Record<string, unknown>;
						// Normalize path: remove trailing slash for consistency
						const normalizedPath =
							path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
						const { endpoint, matchType } =
							convertOpenApiPathToMockzilla(normalizedPath);

						// Try to find a successful response (200, 201, or first 2xx)
						const successCode =
							Object.keys((op.responses as Record<string, unknown>) || {}).find(
								(code) => code.startsWith('2'),
							) || '200';
						const successResponse =
							(op.responses as Record<string, unknown>)?.[successCode] ||
							(op.responses as Record<string, unknown>)?.default;
						const jsonContent = (successResponse as Record<string, unknown>)
							?.content as Record<string, unknown>;
						const applicationJson = jsonContent?.['application/json'] as Record<
							string,
							unknown
						>;
						const schema = applicationJson?.schema;
						const examples = applicationJson?.examples;
						const example = applicationJson?.example;

						// Extract query parameters
						const queryParams: Record<string, string> = {};
						if (op.parameters) {
							for (const param of op.parameters as Record<string, unknown>[]) {
								if (param.in === 'query') {
									queryParams[param.name as string] =
										((param.schema as Record<string, unknown>)
											?.default as string) ||
										(param.example as string) ||
										'';
								}
							}
						}

						// Basic response body if no schema is found
						let responseBody = '{}';
						let jsonSchema = null;
						let useDynamicResponse = false;
						let echoRequestBody = false;

						const isWriteMethod = ['POST', 'PUT', 'PATCH'].includes(
							method.toUpperCase(),
						);
						let variants = null;

						if (schema) {
							// Include components in the schema to resolve $refs
							const fullSchema = {
								...(schema as Record<string, unknown>),
								components: parsedSpec.components,
							};

							try {
								// Optimize schema for lighter generation
								const limitedSchema = limitArrayItems(fullSchema) as Record<
									string,
									unknown
								>;
								// Pre-generate the response payload instead of setting useDynamicResponse: true
								// This makes the UI much faster by avoiding heavy JSON generation on every load
								responseBody = generateFromSchema(limitedSchema);
							} catch (genError) {
								console.error(
									`[API] Generation error for ${method.toUpperCase()} ${path}:`,
									genError,
								);
								// Fallback to a basic but clean structure if generation fails
								responseBody = JSON.stringify(
									generateFallbackResponse(
										fullSchema as Record<string, unknown>,
									),
									null,
									2,
								);
							}

							// We store the original schema for reference/manual editing,
							// but keep useDynamicResponse: false to ensure immediate speed.
							jsonSchema = JSON.stringify(fullSchema);
						} else if (examples && typeof examples === 'object') {
							// If we have examples but no schema, use the first example
							const firstExampleKey = Object.keys(examples)[0];
							const firstExample = (examples as Record<string, unknown>)[
								firstExampleKey
							] as Record<string, unknown>;
							responseBody = JSON.stringify(
								firstExample.value || firstExample,
								null,
								2,
							);
						} else if (example !== undefined) {
							// If we have a single example
							responseBody = JSON.stringify(example, null, 2);
						} else if (isWriteMethod) {
							// If it's a POST/PUT/PATCH and we have no response schema to generate from,
							// enable echoing the request body as a sensible default.
							echoRequestBody = true;
						}

						// For wildcard mocks, create a default catch-all variant
						if (matchType === 'wildcard') {
							variants = [
								{
									key: '*',
									body: responseBody,
									statusCode: Number.parseInt(successCode, 10) || 200,
									bodyType: 'json',
								},
							];
						}

						await tx.insert(mockResponses).values({
							name:
								(op.summary as string) ||
								(op.operationId as string) ||
								`${method.toUpperCase()} ${path}`,
							endpoint,
							method: method.toUpperCase() as HttpMethod,
							statusCode: Number.parseInt(successCode, 10) || 200,
							response: responseBody,
							folderId: newFolder.id,
							matchType: matchType as MatchType,
							bodyType: 'json',
							enabled: true,
							queryParams:
								Object.keys(queryParams).length > 0 ? queryParams : null,
							variants,
							jsonSchema,
							useDynamicResponse,
							echoRequestBody,
						});

						results.mocks++;
					}
				}
			}
		});

		return NextResponse.json({
			success: true,
			folderId: results.folderId,
			importedCount: results.mocks,
		});
	} catch (error: unknown) {
		console.error('[API] OpenAPI Import error:', error);
		return NextResponse.json(
			{
				error:
					(error as Error).message || 'Failed to import OpenAPI specification',
			},
			{ status: 500 },
		);
	}
}
