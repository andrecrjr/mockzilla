import { type NextRequest, NextResponse } from 'next/server';
import * as yaml from 'yaml';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { db } from '@/lib/db';
import { folders, mockResponses, mockSubfolders } from '@/lib/db/schema';
import { generateFromSchema } from '@/lib/schema-generator';
import type { HttpMethod, MatchType } from '@/lib/types';
import { deriveSubfolderMainPath } from '@/lib/mock-subfolders';

/**
 * Basic OpenAPI types for dereferenced spec
 */
interface OpenApiSpec {
	info?: {
		title?: string;
		description?: string;
	};
	paths?: Record<string, Record<string, OpenApiOperation>>;
}

interface OpenApiOperation {
	summary?: string;
	operationId?: string;
	parameters?: Array<{
		name: string;
		in: string;
		schema?: {
			default?: unknown;
		};
		example?: unknown;
	}>;
	responses?: Record<string, OpenApiResponse>;
}

interface OpenApiResponse {
	description?: string;
	content?: Record<
		string,
		{
			schema?: unknown;
			example?: unknown;
			examples?: Record<string, { value?: unknown }>;
		}
	>;
	schema?: unknown;
	example?: unknown;
	examples?: Record<string, { value?: unknown }>;
}

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

function splitPathSegments(path: string): string[] {
	return path.split('/').filter(Boolean);
}

function isPathParameterSegment(segment: string): boolean {
	return segment.includes('{') && segment.includes('}');
}

function canUseSegmentAsSubfolderSlug(segment: string): boolean {
	return generateSlug(segment) === segment;
}

function getStaticSubfolderSegments(path: string): string[] {
	const segments = splitPathSegments(path);
	if (segments.length < 2) return [];

	const firstParameterIndex = segments.findIndex(isPathParameterSegment);
	const subfolderSegments =
		firstParameterIndex === -1
			? segments.slice(0, -1)
			: segments.slice(0, firstParameterIndex);

	const safeSubfolderSegments: string[] = [];
	for (const segment of subfolderSegments) {
		if (!canUseSegmentAsSubfolderSlug(segment)) break;
		safeSubfolderSegments.push(segment);
	}

	return safeSubfolderSegments;
}

function getRelativeMockPath(
	path: string,
	subfolderSegments: string[],
): string {
	const segments = splitPathSegments(path);
	const relativeSegments = segments.slice(subfolderSegments.length);
	return relativeSegments.length > 0 ? `/${relativeSegments.join('/')}` : '/';
}

/**
 * Safe JSON stringify that handles circular references by returning undefined for cyclic nodes.
 */
function safeStringify(obj: unknown): string {
	const cache = new WeakSet();
	return JSON.stringify(
		obj,
		(_key, value) => {
			if (typeof value === 'object' && value !== null) {
				if (cache.has(value)) {
					return;
				}
				cache.add(value);
			}
			return value;
		},
		2,
	);
}

/**
 * Recursively adds maxItems: 3 to array schemas that don't have it,
 * ensuring the generated mock data is not overly heavy.
 * Includes circular reference protection.
 */
function limitArrayItems(
	schema: unknown,
	visited = new WeakSet<object>(),
): unknown {
	if (!schema || typeof schema !== 'object' || schema === null) return schema;

	if (visited.has(schema)) return schema;
	visited.add(schema);

	// Handle standard schema or nested objects
	if (Array.isArray(schema)) {
		return schema.map((item) => limitArrayItems(item, visited));
	}

	const obj = { ...(schema as Record<string, unknown>) };

	if (obj.type === 'array' && obj.maxItems === undefined) {
		obj.maxItems = 3;
	}

	for (const key of Object.keys(obj)) {
		obj[key] = limitArrayItems(obj[key], visited);
	}

	return obj;
}

/**
 * Creates a basic fallback object from a schema if generation fails.
 * Ensures the response looks like a real API without extra fields.
 * Includes circular reference protection.
 */
function generateFallbackResponse(
	schema: Record<string, unknown> | null | undefined,
	visited = new WeakSet<object>(),
): unknown {
	if (!schema) return {};

	if (visited.has(schema)) return {};
	visited.add(schema);

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
				? [
						generateFallbackResponse(
							schema.items as Record<string, unknown>,
							visited,
						),
					]
				: [];
		default:
			if (schema.properties && typeof schema.properties === 'object') {
				const obj: Record<string, unknown> = {};
				for (const [key, prop] of Object.entries(schema.properties)) {
					obj[key] = generateFallbackResponse(
						prop as Record<string, unknown>,
						visited,
					);
				}
				return obj;
			}
			return {};
	}
}

/**
 * Processes OpenAPI paths and methods, creating mock responses in the database.
 * This is the "wiring" logic that converts the dereferenced spec into Mockzilla records.
 */
async function processOpenApiPaths(
	spec: OpenApiSpec,
	folderId: string,
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<{ mocksCount: number; subfoldersCount: number }> {
	let mocksCount = 0;
	let subfoldersCount = 0;
	const subfolderIdByMainPath = new Map<string, string>();

	if (!spec.paths) return { mocksCount: 0, subfoldersCount: 0 };

	async function ensureSubfolder(
		name: string,
		parentId: string | null,
		parentMainPath: string | null,
	): Promise<{ id: string; mainPath: string; created: boolean }> {
		const slug = generateSlug(name);
		if (!slug) {
			throw new Error(`Invalid subfolder segment: ${name}`);
		}

		const mainPath = deriveSubfolderMainPath(parentMainPath, slug);
		const cachedId = subfolderIdByMainPath.get(mainPath);
		if (cachedId) return { id: cachedId, mainPath, created: false };

		const [row] = await tx
			.insert(mockSubfolders)
			.values({
				folderId,
				parentId,
				name,
				slug,
				mainPath,
			})
			.onConflictDoUpdate({
				target: [mockSubfolders.folderId, mockSubfolders.mainPath],
				set: {
					parentId,
					name,
					slug,
					updatedAt: new Date(),
				},
			})
			.returning();

		subfolderIdByMainPath.set(mainPath, row.id);
		return {
			id: row.id,
			mainPath: row.mainPath,
			created: row.updatedAt === null,
		};
	}

	async function ensureSubfolderPath(
		segments: string[],
	): Promise<string | null> {
		let parentId: string | null = null;
		let parentMainPath: string | null = null;
		let lastId: string | null = null;

		for (const segment of segments) {
			const result = await ensureSubfolder(segment, parentId, parentMainPath);
			if (result.created) subfoldersCount++;
			parentId = result.id;
			parentMainPath = result.mainPath;
			lastId = result.id;
		}

		return lastId;
	}

	for (const [path, methods] of Object.entries(spec.paths)) {
		for (const [method, operation] of Object.entries(methods)) {
			if (
				!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(
					method.toLowerCase(),
				)
			) {
				continue;
			}

			const op = operation;
			// Normalize path: remove trailing slash for consistency
			const normalizedPath =
				path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
			const subfolderSegments = getStaticSubfolderSegments(normalizedPath);
			const mockFolderId = await ensureSubfolderPath(subfolderSegments);
			const relativePath = getRelativeMockPath(
				normalizedPath,
				subfolderSegments,
			);
			const { endpoint, matchType } =
				convertOpenApiPathToMockzilla(relativePath);

			// Try to find a successful response (200, 201, or first 2xx)
			const responses = op.responses || {};
			const successCode =
				Object.keys(responses).find((code) => code.startsWith('2')) || '200';
			const successResponse = responses[successCode] || responses.default;

			const jsonContent = successResponse?.content?.['application/json'];
			// Support both OpenAPI 3.x (jsonContent.schema) and Swagger 2.0 (successResponse.schema)
			const schema = jsonContent?.schema || successResponse?.schema;
			const examples = jsonContent?.examples || successResponse?.examples;
			const example = jsonContent?.example || successResponse?.example;

			// Extract query parameters
			const queryParams: Record<string, unknown> = {};
			if (op.parameters) {
				for (const param of op.parameters) {
					if (param.in === 'query') {
						queryParams[param.name] =
							param.schema?.default ?? param.example ?? '';
					}
				}
			}

			let responseBody = '{}';
			let jsonSchema = null;
			let useDynamicResponse = false;
			let echoRequestBody = false;

			const isWriteMethod = ['POST', 'PUT', 'PATCH'].includes(
				method.toUpperCase(),
			);
			let variants = null;

			if (schema) {
				// With $RefParser, schemas are already dereferenced, so no need to manual component injection
				try {
					const limitedSchema = limitArrayItems(schema) as Record<
						string,
						unknown
					>;
					responseBody = generateFromSchema(limitedSchema);
				} catch (genError) {
					console.error(
						`[API] Generation error for ${method.toUpperCase()} ${path}:`,
						genError,
					);
					responseBody = JSON.stringify(
						generateFallbackResponse(schema as Record<string, unknown>),
						null,
						2,
					);
				}
				// Use safeStringify to prevent crashes on circular references
				jsonSchema = safeStringify(schema);
			} else if (examples && typeof examples === 'object') {
				const firstExampleKey = Object.keys(examples)[0];
				const firstExample = examples[firstExampleKey];
				responseBody = JSON.stringify(
					firstExample.value || firstExample,
					null,
					2,
				);
			} else if (example !== undefined) {
				responseBody = JSON.stringify(example, null, 2);
			} else if (isWriteMethod) {
				echoRequestBody = true;
			}

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
				name: op.summary || op.operationId || `${method.toUpperCase()} ${path}`,
				endpoint,
				method: method.toUpperCase() as HttpMethod,
				statusCode: Number.parseInt(successCode, 10) || 200,
				response: responseBody,
				folderId,
				mockFolderId,
				matchType: matchType as MatchType,
				bodyType: 'json',
				enabled: true,
				queryParams: Object.keys(queryParams).length > 0 ? queryParams : null,
				variants,
				jsonSchema,
				useDynamicResponse,
				echoRequestBody,
			});

			mocksCount++;
		}
	}

	return { mocksCount, subfoldersCount };
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

		// Use $RefParser to dereference the spec, resolving all internal and external references.
		// This is the core of our robust, spec-driven logic.
		let dereferencedSpec: OpenApiSpec;
		try {
			// We pass a dummy base URL to prevent errors in some environments (like happy-dom)
			// that can't resolve a base for a root object.
			dereferencedSpec = (await $RefParser.dereference(
				'http://mockzilla.local/',
				parsedSpec as Record<string, unknown>,
				{},
			)) as OpenApiSpec;
		} catch (refError) {
			console.error('[API] Dereference error:', refError);
			return NextResponse.json(
				{
					error: `Failed to resolve references in specification: ${(refError as Error).message}`,
				},
				{ status: 400 },
			);
		}

		const info = dereferencedSpec.info || {};
		const folderName = info.title || 'Imported OpenAPI';
		const folderSlug = generateSlug(folderName);
		const folderDescription =
			info.description || `Imported from OpenAPI spec: ${folderName}`;

		let folderId = '';
		let importedCount = 0;
		let importedSubfoldersCount = 0;

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

			folderId = newFolder.id;
			const importResult = await processOpenApiPaths(
				dereferencedSpec,
				folderId,
				tx,
			);
			importedCount = importResult.mocksCount;
			importedSubfoldersCount = importResult.subfoldersCount;
		});

		return NextResponse.json({
			success: true,
			folderId,
			importedCount,
			importedSubfoldersCount,
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
