import { faker } from '@faker-js/faker';
import jsf from 'json-schema-faker';

jsf.extend('faker', () => faker);
jsf.extend('x-faker', () => faker);

const DEFAULT_MAX_ITEMS = 1000;
const envMaxItems = process.env.MOCKZILLA_MAX_ITEMS
	? parseInt(process.env.MOCKZILLA_MAX_ITEMS, 10)
	: DEFAULT_MAX_ITEMS;
const MAX_ITEMS = Number.isNaN(envMaxItems) ? DEFAULT_MAX_ITEMS : envMaxItems;

jsf.option({
	alwaysFakeOptionals: true,
	useDefaultValue: true,
	useExamplesValue: true,
	fixedProbabilities: true,
	minItems: 1,
	maxItems: MAX_ITEMS,
	fillProperties: false,
});

import { interpolate } from './engine/interpolation';

/**
 * Applies template replacement to a string or object using provided context
 */
export function replaceTemplates(
	data: unknown,
	context: Record<string, unknown> = {},
): unknown {
	return interpolate(data, context);
}

/**
 * Generates sample JSON data from a JSON Schema with support for:
 * Post-processing templates: {$.field} or {{$.field}} syntax
 *
 * @param schema - JSON Schema object
 * @returns JSON string with generated data
 */
export function generateFromSchema(
	schema: object,
	context: Record<string, unknown> = {},
): string {
	try {
		const generated = jsf.generate(schema);

		// Merge generated data with context for template resolution
		// The context (e.g. request query params) takes precedence if there are naming collisions
		const rootData = {
			...generated,
			...context,
		};

		const processed = interpolate(generated, rootData);

		return JSON.stringify(processed, null, 2);
	} catch (error) {
		throw new Error(
			`Failed to generate from schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Pre-processes the schema to handle special cases before generation
 * Ensures that pattern fields containing template syntax are preserved as-is,
 * instead of being treated as regular expressions by json-schema-faker.
 */
function preprocessSchema(
	schema: unknown,
	visited = new WeakSet<object>(),
): unknown {
	// Prevent circular reference infinite loops
	if (schema && typeof schema === 'object') {
		if (visited.has(schema)) {
			return schema;
		}
		visited.add(schema);
	}

	if (Array.isArray(schema)) {
		return schema.map((item) => preprocessSchema(item, visited));
	} else if (schema && typeof schema === 'object') {
		const processed: Record<string, unknown> = {};

		for (const key in schema) {
			if (Object.hasOwn(schema, key)) {
				processed[key] = preprocessSchema(
					(schema as Record<string, unknown>)[key],
					visited,
				);
			}
		}
		return processed;
	}

	return schema;
}

/**
 * Validates if a string is valid JSON Schema
 */
export function validateSchema(schemaString: string): {
	valid: boolean;
	error?: string;
} {
	try {
		const schema = JSON.parse(schemaString);

		// Basic validation - check if it has type or properties
		if (!schema.type && !schema.properties && !schema.$ref) {
			return {
				valid: false,
				error:
					"Schema must have at least a 'type', 'properties', or '$ref' field",
			};
		}

		return { valid: true };
	} catch (error) {
		return {
			valid: false,
			error: error instanceof Error ? error.message : 'Invalid JSON',
		};
	}
}

/**
 * Generates sample JSON data from a JSON Schema string
 */
export function generateFromSchemaString(schemaString: string): string {
	const validation = validateSchema(schemaString);

	if (!validation.valid) {
		throw new Error(`Invalid schema: ${validation.error}`);
	}

	const schema = JSON.parse(schemaString);
	const preprocessedSchema = preprocessSchema(schema);

	return generateFromSchema(preprocessedSchema as object);
}
