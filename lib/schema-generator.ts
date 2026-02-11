import { faker } from '@faker-js/faker';
import jsf from 'json-schema-faker';
import { resolvePath } from './utils/path-resolver';
import type { JsonValue } from './types';

jsf.extend('faker', () => faker);

jsf.option({
	alwaysFakeOptionals: true,
	useDefaultValue: true,
	useExamplesValue: true,
	fixedProbabilities: true,
	minItems: 1,
	maxItems: 5,
});

/**
 * Deep traverses the generated object and applies template replacement
 * This is a second-pass traversal that resolves all {$.path} references
 *
 * @param rootData - The complete generated object
 * @param currentData - Current node being processed
 * @param visited - Set to track visited objects (prevent circular refs)
 * @returns Processed data with all templates resolved
 */
function deepReplaceTemplates(
	rootData: JsonValue,
	currentData: JsonValue = rootData,
	visited = new WeakSet<object>(),
): JsonValue {
	// Prevent circular reference infinite loops
	if (currentData && typeof currentData === 'object') {
		if (visited.has(currentData)) {
			return currentData;
		}
		visited.add(currentData);
	}

	if (typeof currentData === 'string') {
		// Replace template syntax: {$.field} or {{$.field}}
		return currentData.replace(/\{\{?\$\.([\w.[\]]+)\}?\}/g, (match, path) => {
			const value = resolvePath('$.' + path, rootData);

			if (value === undefined) {
				console.warn(
					`[schema-generator] Template reference '${match}' could not be resolved`,
				);
				return match;
			}

			return String(value);
		});
	} else if (Array.isArray(currentData)) {
		return currentData.map((item) =>
			deepReplaceTemplates(rootData, item, visited),
		);
	} else if (currentData && typeof currentData === 'object') {
		// Use Record<string, JsonValue> for the processed object
		const processed: Record<string, JsonValue> = {};
		for (const key in currentData) {
			if (Object.hasOwn(currentData, key)) {
				const value = (currentData as Record<string, JsonValue>)[key];
				processed[key] = deepReplaceTemplates(rootData, value, visited);
			}
		}
		return processed;
	}

	return currentData;
}

/**
 * Validates if a string is valid JSON Schema
 */
export function validateSchema(schemaString: string): {
	valid: boolean;
	error?: string;
} {
	try {
		const schema = JSON.parse(schemaString) as Record<string, unknown>;

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
 * Generates sample JSON data from a JSON Schema with support for:
 * Post-processing templates: {$.field} or {{$.field}} syntax
 *
 * @param schema - JSON Schema object
 * @returns JSON string with generated data
 */
export function generateFromSchema(schema: object): string {
	try {
        // jsf.generate returns any, so we cast it to JsonValue
		const generated = jsf.generate(schema) as JsonValue;
		const processed = deepReplaceTemplates(generated);

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
	schema: JsonValue,
	visited = new WeakSet<object>(),
): JsonValue {
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
		const processed: Record<string, JsonValue> = {};

		for (const key in schema) {
			if (Object.hasOwn(schema, key)) {
                const value = (schema as Record<string, JsonValue>)[key];
				processed[key] = preprocessSchema(value, visited);
			}
		}
		return processed;
	}

	return schema;
}

/**
 * Generates sample JSON data from a JSON Schema string
 */
export function generateFromSchemaString(schemaString: string): string {
	const validation = validateSchema(schemaString);

	if (!validation.valid) {
		throw new Error(`Invalid schema: ${validation.error}`);
	}

	const schema = JSON.parse(schemaString) as JsonValue;
	const preprocessedSchema = preprocessSchema(schema);

    // generateFromSchema expects object, check if preprocessedSchema is object
    if (typeof preprocessedSchema !== 'object' || preprocessedSchema === null) {
        throw new Error('Schema must be an object');
    }

	return generateFromSchema(preprocessedSchema);
}
