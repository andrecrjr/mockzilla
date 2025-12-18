import { faker } from '@faker-js/faker';
import jsf from 'json-schema-faker';

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
 * Resolves a JSONPath-like reference to a value in an object
 * Supports: $.field, $.nested.field, $.array[0], $.array[0].field
 *
 * @param path - JSONPath string (e.g., "$.user.name" or "$.items[0].id")
 * @param data - The object to resolve the path in
 * @returns The resolved value or undefined
 */
function resolveJSONPath(path: string, data: any): any {
	// Remove leading $. if present
	const cleanPath = path.startsWith('$.')
		? path.slice(2)
		: path.startsWith('$')
			? path.slice(1)
			: path;

	if (!cleanPath) {
		return data;
	}

	// Split by dots and brackets, handling array indices
	const parts = cleanPath.split(/\.|\[|\]/).filter(Boolean);

	let current = data;
	for (const part of parts) {
		if (current === null || current === undefined) {
			return undefined;
		}

		// Check if part is an array index
		const arrayIndex = parseInt(part, 10);
		if (!isNaN(arrayIndex)) {
			current = current[arrayIndex];
		} else {
			current = current[part];
		}
	}

	return current;
}

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
	rootData: any,
	currentData: any = rootData,
	visited = new WeakSet(),
): any {
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
			const value = resolveJSONPath('$.' + path, rootData);

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
		const processed: any = {};
		for (const key in currentData) {
			if (Object.hasOwn(currentData, key)) {
				processed[key] = deepReplaceTemplates(
					rootData,
					currentData[key],
					visited,
				);
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
 * Generates sample JSON data from a JSON Schema with support for:
 * Post-processing templates: {$.field} or {{$.field}} syntax
 *
 * @param schema - JSON Schema object
 * @returns JSON string with generated data
 */
export function generateFromSchema(schema: object): string {
	try {
		const generated = jsf.generate(schema);
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
function preprocessSchema(schema: any, visited = new WeakSet()): any {
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
		const processed: any = {};

		for (const key in schema) {
			if (Object.hasOwn(schema, key)) {
				processed[key] = preprocessSchema(schema[key], visited);
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

	const schema = JSON.parse(schemaString);
	const preprocessedSchema = preprocessSchema(schema);

	return generateFromSchema(preprocessedSchema);
}
