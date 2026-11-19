import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import * as yaml from 'yaml';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { db } from '@/lib/db';
import { folders, mockResponses, mockSubfolders } from '@/lib/db/schema';
import { generateFromSchema } from '@/lib/schema-generator';
import type { BodyType, HttpMethod, MatchType, MockVariant } from '@/lib/types';
import { deriveSubfolderMainPath } from '@/lib/mock-subfolders';
import { normalizeFolderPath } from '@/lib/utils/folder-paths';
import { joinMockPaths, normalizeAbsolutePath } from '@/lib/utils/mock-paths';
import {
	normalizeMockVariant,
	normalizeMockVariants,
} from '@/lib/utils/mock-variants';

/**
 * Query parameter added to imported error-response mocks. A request such as
 * `GET /users/1?__status=404` selects the mock generated from the spec's 404.
 */
const ERROR_STATUS_QUERY_PARAM = '__status';

const HTTP_METHODS = [
	'get',
	'post',
	'put',
	'patch',
	'delete',
	'head',
	'options',
] as const;

/**
 * Basic OpenAPI types for dereferenced spec
 */
interface OpenApiServer {
	url?: string;
	variables?: Record<string, { default?: string }>;
}

interface OpenApiSpec {
	info?: {
		title?: string;
		description?: string;
	};
	/** OpenAPI 3.x */
	servers?: OpenApiServer[];
	/** Swagger 2.0 */
	basePath?: string;
	paths?: Record<string, OpenApiPathItem>;
}

interface OpenApiParameter {
	name: string;
	in: string;
	required?: boolean;
	schema?: {
		default?: unknown;
	};
	example?: unknown;
}

type OpenApiPathItem = {
	parameters?: OpenApiParameter[];
} & Partial<Record<(typeof HTTP_METHODS)[number], OpenApiOperation>>;

interface OpenApiOperation {
	summary?: string;
	operationId?: string;
	parameters?: OpenApiParameter[];
	responses?: Record<string, OpenApiResponse>;
}

interface OpenApiMediaType {
	schema?: unknown;
	example?: unknown;
	examples?: Record<string, { value?: unknown }>;
}

interface OpenApiResponse {
	description?: string;
	content?: Record<string, OpenApiMediaType>;
	/** Swagger 2.0 */
	schema?: unknown;
	example?: unknown;
	examples?: Record<string, { value?: unknown }>;
}

type MockResponseRow = typeof mockResponses.$inferSelect;
type ImportTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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
 * Returns the path part of the spec's server URL (OpenAPI 3 `servers[0].url`,
 * with variable defaults substituted) or Swagger 2 `basePath`. Real API calls
 * include this prefix, so imported mocks are served under it too.
 */
function getServerBasePath(spec: OpenApiSpec): string {
	if (typeof spec.basePath === 'string' && spec.basePath.trim()) {
		return normalizeAbsolutePath(spec.basePath);
	}

	const server = spec.servers?.[0];
	if (!server?.url) return '/';

	const url = server.url.replace(
		/\{([^}]+)\}/g,
		(_match, name: string) => server.variables?.[name]?.default ?? '',
	);
	try {
		const { pathname } = new URL(url, 'http://placeholder.local');
		return normalizeAbsolutePath(decodeURIComponent(pathname));
	} catch {
		return '/';
	}
}

/** Parses `200`, `404`, and range keys such as `2XX` (→ 200). */
function parseStatusCode(code: string): number | null {
	if (/^[1-5]\d\d$/.test(code)) return Number.parseInt(code, 10);
	const range = /^([1-5])xx$/i.exec(code);
	return range ? Number.parseInt(range[1], 10) * 100 : null;
}

/**
 * Picks the success response: `200`, then `201`, then the first other 2xx
 * code, then a `2XX` range, then `default` (served as 200).
 */
function selectSuccessResponse(responses: Record<string, OpenApiResponse>): {
	key: string | null;
	statusCode: number;
	response?: OpenApiResponse;
} {
	const keys = Object.keys(responses);
	const key =
		['200', '201'].find((code) => code in responses) ??
		keys.find((code) => /^2\d\d$/.test(code)) ??
		keys.find((code) => /^2xx$/i.test(code)) ??
		null;

	if (key) {
		return {
			key,
			statusCode: parseStatusCode(key) ?? 200,
			response: responses[key],
		};
	}
	return { key: null, statusCode: 200, response: responses.default };
}

/** Error responses (4xx/5xx, including `4XX` ranges) to import as their own mocks. */
function selectErrorResponses(
	responses: Record<string, OpenApiResponse>,
): Array<{ statusCode: number; response: OpenApiResponse }> {
	const byStatus = new Map<number, OpenApiResponse>();
	for (const [code, response] of Object.entries(responses)) {
		const statusCode = parseStatusCode(code);
		if (statusCode === null || statusCode < 400) continue;
		// An exact code (404) wins over a range (4XX) that maps to the same status.
		if (!byStatus.has(statusCode) || /^\d+$/.test(code)) {
			byStatus.set(statusCode, response);
		}
	}
	return [...byStatus.entries()]
		.sort(([a], [b]) => a - b)
		.map(([statusCode, response]) => ({ statusCode, response }));
}

function isJsonMediaType(mediaType: string): boolean {
	const base = mediaType.split(';')[0].trim().toLowerCase();
	return (
		base === '*/*' || base === 'application/json' || /[/+]json$/.test(base)
	);
}

/**
 * Chooses the media type to mock: `application/json`, then any other JSON
 * type (`application/problem+json`, `*\/*`), then `text/*`. Swagger 2.0
 * responses keep their schema and examples on the response itself.
 */
function selectMediaContent(response: OpenApiResponse | undefined): {
	media: OpenApiMediaType;
	bodyType: BodyType;
} {
	if (!response) return { media: {}, bodyType: 'json' };

	const content = response.content;
	if (content && Object.keys(content).length > 0) {
		const types = Object.keys(content);
		const jsonType =
			types.find((type) => type.split(';')[0].trim() === 'application/json') ??
			types.find(isJsonMediaType);
		if (jsonType) return { media: content[jsonType] ?? {}, bodyType: 'json' };

		const textType = types.find((type) =>
			type.toLowerCase().startsWith('text/'),
		);
		if (textType) return { media: content[textType] ?? {}, bodyType: 'text' };

		return { media: {}, bodyType: 'json' };
	}

	return {
		media: {
			schema: response.schema,
			example: response.example,
			examples: response.examples,
		},
		bodyType: 'json',
	};
}

/** Operation parameters override path-level parameters with the same name and location. */
function mergeParameters(
	pathParameters: OpenApiParameter[] | undefined,
	operationParameters: OpenApiParameter[] | undefined,
): OpenApiParameter[] {
	const merged = new Map<string, OpenApiParameter>();
	for (const parameter of [
		...(pathParameters ?? []),
		...(operationParameters ?? []),
	]) {
		if (!parameter?.name || !parameter.in) continue;
		merged.set(`${parameter.in}:${parameter.name}`, parameter);
	}
	return [...merged.values()];
}

/**
 * Required query parameters become match filters with a `*` value: the key
 * must be present, any value matches. Optional parameters are not filters.
 */
function getRequiredQueryParams(
	parameters: OpenApiParameter[],
): Record<string, string> {
	const queryParams: Record<string, string> = {};
	for (const parameter of parameters) {
		if (parameter.in === 'query' && parameter.required === true) {
			queryParams[parameter.name] = '*';
		}
	}
	return queryParams;
}

/**
 * External `$ref`s are not fetched (see POST), so they stay in the
 * dereferenced spec. Replace them with an empty schema so generation still
 * works; returns how many were removed.
 */
function stripUnresolvedRefs(
	value: unknown,
	visited = new WeakSet<object>(),
): number {
	if (!value || typeof value !== 'object' || visited.has(value)) return 0;
	visited.add(value);

	let removed = 0;
	const entries = Array.isArray(value)
		? value.entries()
		: Object.entries(value as Record<string, unknown>);
	for (const [key, child] of entries) {
		if (
			child &&
			typeof child === 'object' &&
			!Array.isArray(child) &&
			typeof (child as { $ref?: unknown }).$ref === 'string'
		) {
			(value as Record<string | number, unknown>)[key] = {};
			removed++;
		} else {
			removed += stripUnresolvedRefs(child, visited);
		}
	}
	return removed;
}

function getFirstExample(
	examples: Record<string, { value?: unknown }> | undefined,
): unknown {
	if (!examples || typeof examples !== 'object') return undefined;
	const first = Object.values(examples)[0];
	if (first === undefined) return undefined;
	return first && typeof first === 'object' && 'value' in first
		? first.value
		: first;
}

/** Builds the stored response for one OpenAPI response object. */
function buildResponseBody(
	response: OpenApiResponse | undefined,
	options: { echoWhenEmpty: boolean },
): {
	response: string;
	bodyType: BodyType;
	jsonSchema: string | null;
	echoRequestBody: boolean;
} {
	const { media, bodyType } = selectMediaContent(response);
	const schema = media.schema;
	const example =
		media.example !== undefined
			? media.example
			: getFirstExample(media.examples);

	if (bodyType === 'text') {
		let text = typeof example === 'string' ? example : '';
		if (!text && schema) {
			try {
				const generated: unknown = JSON.parse(
					generateFromSchema(
						limitArrayItems(schema) as Record<string, unknown>,
					),
				);
				text =
					typeof generated === 'string' ? generated : JSON.stringify(generated);
			} catch {
				text = '';
			}
		}
		return {
			response: text,
			bodyType,
			jsonSchema: null,
			echoRequestBody: false,
		};
	}

	if (schema) {
		let body: string;
		try {
			body = generateFromSchema(
				limitArrayItems(schema) as Record<string, unknown>,
			);
		} catch (genError) {
			console.error('[API] Generation error during OpenAPI import:', genError);
			body = JSON.stringify(
				generateFallbackResponse(schema as Record<string, unknown>),
				null,
				2,
			);
		}
		// Use safeStringify to prevent crashes on circular references
		return {
			response: body,
			bodyType,
			jsonSchema: safeStringify(schema),
			echoRequestBody: false,
		};
	}

	if (example !== undefined) {
		return {
			response: JSON.stringify(example, null, 2),
			bodyType,
			jsonSchema: null,
			echoRequestBody: false,
		};
	}

	return {
		response: '{}',
		bodyType,
		jsonSchema: null,
		echoRequestBody: options.echoWhenEmpty,
	};
}

/**
 * Identity used to match an imported operation with a mock from an earlier
 * import of the same spec. Error mocks also carry their `__status` value.
 */
function getImportIdentity(mock: {
	method: string;
	endpoint: string;
	mockFolderId: string | null;
	queryParams: unknown;
}): string {
	const queryParams =
		mock.queryParams && typeof mock.queryParams === 'object'
			? (mock.queryParams as Record<string, unknown>)
			: {};
	const status = queryParams[ERROR_STATUS_QUERY_PARAM];
	return [
		mock.method,
		mock.endpoint,
		mock.mockFolderId ?? '',
		typeof status === 'string' ? status : '',
	].join(' ');
}

/**
 * Re-import keeps variants the user added for specific captures and replaces
 * only the fallback. A fallback the user switched to Dynamic Response keeps
 * its schema and dynamic mode.
 */
function mergeImportedVariants(
	existing: MockVariant[] | null,
	imported: MockVariant[] | null,
	endpoint: string,
): MockVariant[] | null {
	if (!imported) return existing && existing.length > 0 ? existing : null;
	const previous = normalizeMockVariants(existing, endpoint) ?? [];
	const previousFallback = previous.find((variant) => variant.isFallback);
	const specific = previous.filter((variant) => !variant.isFallback);

	const merged = imported.map((variant) => {
		const normalized = normalizeMockVariant(variant, endpoint);
		if (normalized.isFallback && previousFallback?.useDynamicResponse) {
			return {
				...normalized,
				jsonSchema: previousFallback.jsonSchema,
				useDynamicResponse: true,
				bodyType: 'json' as const,
			};
		}
		return normalized;
	});
	return [...specific, ...merged];
}

/**
 * Processes OpenAPI paths and methods, creating mock responses in the database.
 * This is the "wiring" logic that converts the dereferenced spec into Mockzilla records.
 */
interface ImportResult {
	mocksCount: number;
	updatedCount: number;
	skippedCount: number;
	subfoldersCount: number;
}

async function processOpenApiPaths(
	spec: OpenApiSpec,
	folderId: string,
	tx: ImportTx,
): Promise<ImportResult> {
	let mocksCount = 0;
	let updatedCount = 0;
	let skippedCount = 0;
	let subfoldersCount = 0;
	const subfolderIdByMainPath = new Map<string, string>();

	if (!spec.paths) {
		return {
			mocksCount: 0,
			updatedCount: 0,
			skippedCount: 0,
			subfoldersCount: 0,
		};
	}

	// Mocks from earlier imports of this folder, matched by getImportIdentity so a
	// re-import updates them instead of adding duplicates.
	const existingRows = (await tx
		.select()
		.from(mockResponses)
		.where(eq(mockResponses.folderId, folderId))) as MockResponseRow[];
	const existingByIdentity = new Map<string, MockResponseRow>();
	for (const row of existingRows) {
		if (!row?.id || !row.method || typeof row.endpoint !== 'string') continue;
		const identity = getImportIdentity(row);
		if (!existingByIdentity.has(identity))
			existingByIdentity.set(identity, row);
	}
	const importedIdentities = new Set<string>();
	const basePath = getServerBasePath(spec);

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

	interface ImportedMock {
		name: string;
		endpoint: string;
		method: HttpMethod;
		statusCode: number;
		response: string;
		mockFolderId: string | null;
		matchType: MatchType;
		bodyType: BodyType;
		queryParams: Record<string, string> | null;
		variants: MockVariant[] | null;
		jsonSchema: string | null;
		echoRequestBody: boolean;
	}

	/** Inserts a new mock, or updates the one from an earlier import. */
	async function saveImportedMock(mock: ImportedMock): Promise<void> {
		const identity = getImportIdentity(mock);
		// Two operations can map to the same mock (e.g. `/users/{id}` and
		// `/users/{name}` both become `/users/*`); keep the first.
		if (importedIdentities.has(identity)) {
			skippedCount++;
			return;
		}
		importedIdentities.add(identity);

		const existing = existingByIdentity.get(identity);
		if (!existing) {
			await tx.insert(mockResponses).values({
				...mock,
				folderId,
				enabled: true,
				useDynamicResponse: false,
			});
			mocksCount++;
			return;
		}

		// Spec-derived fields are refreshed. User settings (enabled, delay, proxy
		// meta, dynamic mode, and specific variants) are kept.
		const keepsDynamicSchema =
			existing.useDynamicResponse === true && mock.jsonSchema === null;
		await tx
			.update(mockResponses)
			.set({
				name: mock.name,
				statusCode: mock.statusCode,
				response: mock.response,
				matchType: mock.matchType,
				bodyType: existing.useDynamicResponse ? 'json' : mock.bodyType,
				queryParams: mock.queryParams,
				variants: mergeImportedVariants(
					existing.variants as MockVariant[] | null,
					mock.variants,
					mock.endpoint,
				),
				jsonSchema: keepsDynamicSchema ? existing.jsonSchema : mock.jsonSchema,
				echoRequestBody: mock.echoRequestBody,
				updatedAt: new Date(),
			})
			.where(eq(mockResponses.id, existing.id));
		updatedCount++;
	}

	for (const [path, pathItem] of Object.entries(spec.paths)) {
		if (!pathItem || typeof pathItem !== 'object') continue;

		// Normalize path: remove trailing slash, then add the server base path.
		const specPath =
			path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
		const normalizedPath =
			basePath === '/' ? specPath : joinMockPaths(basePath, specPath);
		const subfolderSegments = getStaticSubfolderSegments(normalizedPath);
		const relativePath = getRelativeMockPath(normalizedPath, subfolderSegments);
		const { endpoint, matchType } = convertOpenApiPathToMockzilla(relativePath);
		let mockFolderId: string | null | undefined;

		for (const method of HTTP_METHODS) {
			const op = pathItem[method];
			if (!op || typeof op !== 'object') continue;

			// Create subfolders only for paths that have at least one operation.
			if (mockFolderId === undefined) {
				mockFolderId = await ensureSubfolderPath(subfolderSegments);
			}

			const httpMethod = method.toUpperCase() as HttpMethod;
			const name = op.summary || op.operationId || `${httpMethod} ${path}`;
			const responses = op.responses || {};
			const success = selectSuccessResponse(responses);
			const body = buildResponseBody(success.response, {
				echoWhenEmpty: ['POST', 'PUT', 'PATCH'].includes(httpMethod),
			});

			const requiredQueryParams = getRequiredQueryParams(
				mergeParameters(pathItem.parameters, op.parameters),
			);
			const hasQueryParams = Object.keys(requiredQueryParams).length > 0;

			const variants: MockVariant[] | null =
				matchType === 'wildcard'
					? [
							{
								key: '*',
								captures: [],
								isFallback: true,
								body: body.response,
								statusCode: success.statusCode,
								bodyType: body.bodyType,
							},
						]
					: null;

			await saveImportedMock({
				name,
				endpoint,
				method: httpMethod,
				statusCode: success.statusCode,
				response: body.response,
				mockFolderId,
				matchType: matchType as MatchType,
				bodyType: body.bodyType,
				queryParams: hasQueryParams ? requiredQueryParams : null,
				variants: normalizeMockVariants(variants, endpoint),
				jsonSchema: body.jsonSchema,
				echoRequestBody: body.echoRequestBody,
			});

			// Each 4xx/5xx response becomes a sibling mock selected with
			// `?__status=<code>`. The required query row outscores the base mock.
			for (const error of selectErrorResponses(responses)) {
				const errorBody = buildResponseBody(error.response, {
					echoWhenEmpty: false,
				});
				await saveImportedMock({
					name: `${name} (${error.statusCode})`,
					endpoint,
					method: httpMethod,
					statusCode: error.statusCode,
					response: errorBody.response,
					mockFolderId,
					matchType: matchType as MatchType,
					bodyType: errorBody.bodyType,
					queryParams: {
						...requiredQueryParams,
						[ERROR_STATUS_QUERY_PARAM]: String(error.statusCode),
					},
					variants: null,
					jsonSchema: errorBody.jsonSchema,
					echoRequestBody: false,
				});
			}
		}
	}

	return { mocksCount, updatedCount, skippedCount, subfoldersCount };
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

		// Use $RefParser to dereference internal (`#/...`) references. External
		// references are NOT resolved: following them would make the server fetch
		// arbitrary URLs or files named by the uploaded spec (SSRF). They are
		// replaced with empty schemas below and reported as a warning.
		let dereferencedSpec: OpenApiSpec;
		let unresolvedRefCount = 0;
		try {
			// We pass a dummy base URL to prevent errors in some environments (like happy-dom)
			// that can't resolve a base for a root object.
			dereferencedSpec = (await $RefParser.dereference(
				'http://mockzilla.local/',
				parsedSpec as Record<string, unknown>,
				{ resolve: { external: false } },
			)) as OpenApiSpec;
			unresolvedRefCount = stripUnresolvedRefs(dereferencedSpec.paths);
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
		const folderSlug = normalizeFolderPath(folderName);
		const folderDescription =
			info.description || `Imported from OpenAPI spec: ${folderName}`;

		let folderId = '';
		let importedCount = 0;
		let updatedCount = 0;
		let skippedCount = 0;
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
			updatedCount = importResult.updatedCount;
			skippedCount = importResult.skippedCount;
			importedSubfoldersCount = importResult.subfoldersCount;
		});

		const warnings: string[] = [];
		if (unresolvedRefCount > 0) {
			warnings.push(
				`${unresolvedRefCount} external $ref(s) were not resolved and were replaced with empty schemas. Inline or bundle external references before importing.`,
			);
		}
		if (skippedCount > 0) {
			warnings.push(
				`${skippedCount} operation(s) mapped to the same mock as an earlier operation and were skipped.`,
			);
		}

		return NextResponse.json({
			success: true,
			folderId,
			importedCount,
			updatedCount,
			skippedCount,
			importedSubfoldersCount,
			warnings,
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
