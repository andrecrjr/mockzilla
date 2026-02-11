import { generateFromSchema } from './schema-generator';
import type { ExportData, Folder, Mock, HttpMethod } from './types';

interface OpenAPIV3Document {
	openapi: string;
	info: {
		title: string;
		version: string;
		description?: string;
	};
	paths: Record<string, Record<string, unknown>>;
}

/**
 * Type guard to check if the data follows OpenAPI V3 structure
 */
export function isOpenApiFormat(data: unknown): data is OpenAPIV3Document {
	if (typeof data !== 'object' || data === null) return false;

	const doc = data as Record<string, unknown>;
	return (
		typeof doc.openapi === 'string' &&
		typeof doc.info === 'object' &&
		doc.info !== null &&
		typeof (doc.info as Record<string, unknown>).title === 'string' &&
		typeof doc.paths === 'object' &&
		doc.paths !== null
	);
}

function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');
}

/**
 * Converts OpenAPI V3 Document to Mockzilla ExportData format
 */
export async function convertOpenApiToMockzilla(
	doc: OpenAPIV3Document,
): Promise<ExportData> {
	const folderId = crypto.randomUUID();
	const folderName = doc.info.title || 'Imported OpenAPI';
	const folderSlug = generateSlug(folderName);

	const folder: Folder = {
		id: folderId,
		name: folderName,
		slug: folderSlug,
		description: doc.info.description || `Imported from OpenAPI v${doc.info.version}`,
		createdAt: new Date().toISOString(),
	};

	const mocks: Mock[] = [];

	for (const [path, pathItem] of Object.entries(doc.paths)) {
		if (typeof pathItem !== 'object' || pathItem === null) continue;

		for (const [method, operation] of Object.entries(pathItem)) {
			// Skip path-level parameters or other non-method fields
			const validMethods = [
				'get',
				'post',
				'put',
				'patch',
				'delete',
				'head',
				'options',
			];
			if (!validMethods.includes(method.toLowerCase())) continue;

			const op = operation as Record<string, unknown>;
			const responses = op.responses as Record<string, unknown> | undefined;
			if (!responses) continue;

			// Find the first 2xx response
			const successCode = Object.keys(responses).find((code) =>
				code.startsWith('2'),
			);
			if (!successCode) continue;

			const responseObj = responses[successCode] as Record<string, unknown>;
			const content = responseObj.content as Record<string, unknown> | undefined;
			const jsonContent = content?.['application/json'] as
				| Record<string, unknown>
				| undefined;
			const schema = jsonContent?.schema;

			let initialResponse = '{}';
			let jsonSchemaString: string | undefined = undefined;

			if (schema && typeof schema === 'object') {
				try {
					jsonSchemaString = JSON.stringify(schema);
					initialResponse = generateFromSchema(schema);
				} catch (error) {
					console.error(`[OpenAPI Import] Failed to generate sample for ${path}:`, error);
					initialResponse = '{"error": "Failed to generate initial response from schema"}';
				}
			}

			mocks.push({
				id: crypto.randomUUID(),
				name: (op.operationId as string) || `${method.toUpperCase()} ${path}`,
				path: path,
				method: method.toUpperCase() as HttpMethod,
				response: initialResponse,
				statusCode: parseInt(successCode, 10) || 200,
				folderId: folderId,
				matchType: 'exact',
				bodyType: 'json',
				enabled: true,
				jsonSchema: jsonSchemaString,
				useDynamicResponse: !!jsonSchemaString,
				createdAt: new Date().toISOString(),
			});
		}
	}

	return {
		folders: [folder],
		mocks: mocks,
		exportedAt: new Date().toISOString(),
	};
}
