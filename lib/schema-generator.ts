import { faker } from '@faker-js/faker';
import jsf from 'json-schema-faker';

/**
 * Context for storing generated values that can be referenced later
 * Used by custom formats (x-store-as, x-ref)
 */
interface GenerationContext {
	storedValues: Map<string, any>;
}

// Global context for current generation (reset on each generate call)
let generationContext: GenerationContext = {
	storedValues: new Map(),
};

// Configure json-schema-faker to use faker.js
jsf.extend('faker', () => faker);

// Configure default options
jsf.option({
	alwaysFakeOptionals: true,
	useDefaultValue: true,
	useExamplesValue: true,
	fixedProbabilities: true,
	minItems: 1,
	maxItems: 5,
});

/**
 * Custom format: x-store-as
 * When a field has format: "x-store-as", it generates a UUID and stores it
 * NOTE: This requires using the format field, e.g.:
 * { "type": "string", "format": "x-store-as", "x-key": "userId" }
 *
 * However, a simpler approach is to let json-schema-faker handle generation
 * and use post-processing. This format is kept for explicit control.
 */
jsf.format('x-store-as', (schema: any) => {
	const key = schema['x-key'] || schema['x-store-as'];
	let value: any;

	// Generate value based on the schema's format or faker directive
	if (schema.format === 'uuid' || !key) {
		value = faker.string.uuid();
	} else if (schema.faker) {
		// Support faker.js methods like "person.fullName"
		const fakerPath = schema.faker.split('.');
		let fakerFn: any = faker;
		for (const part of fakerPath) {
			fakerFn = fakerFn[part];
		}
		value = typeof fakerFn === 'function' ? fakerFn() : fakerFn;
	} else if (schema.type === 'string') {
		value = faker.lorem.word();
	} else {
		value = faker.string.alphanumeric(10);
	}

	// Store the value
	if (key) {
		generationContext.storedValues.set(key, value);
	}

	return value;
});

/**
 * Custom format: x-ref
 * Retrieves a previously stored value by key
 *
 * Example:
 * { "type": "string", "format": "x-ref", "x-key": "userId" }
 */
jsf.format('x-ref', (schema: any) => {
	const key = schema['x-key'] || schema['x-ref'];
	if (!key) {
		console.warn('[schema-generator] x-ref format requires x-key property');
		return '[missing-ref-key]';
	}

	const value = generationContext.storedValues.get(key);
	if (value === undefined) {
		console.warn(`[schema-generator] Reference '${key}' not found in context`);
		return `[ref:${key}-not-found]`;
	}

	return value;
});

/**
 * Custom format: x-template
 * String template with variable interpolation
 * Variables are referenced as {{key}} or {key}
 *
 * Example:
 * { "type": "string", "format": "x-template", "template": "Hello {{userName}}!" }
 */
jsf.format('x-template', (schema: any) => {
	const template = schema['template'] || schema['x-template'];
	if (!template || typeof template !== 'string') {
		return '[invalid-template]';
	}

	// Replace {{key}} and {key} with stored values
	return template.replace(/\{\{?(\w+)\}?\}/g, (match, key) => {
		const value = generationContext.storedValues.get(key);
		if (value === undefined) {
			console.warn(
				`[schema-generator] Template variable '${key}' not found in context`,
			);
			return `[${key}-not-found]`;
		}
		return String(value);
	});
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
 * Post-processes generated data to replace template strings
 * Supports {$.path} and {{$.path}} syntax for referencing other fields
 *
 * @param data - The generated data object
 * @returns The data with templates replaced
 */
function processTemplates(data: any, visited = new WeakSet()): any {
	// Prevent circular reference infinite loops
	if (data && typeof data === 'object') {
		if (visited.has(data)) {
			return data;
		}
		visited.add(data);
	}

	// Handle different data types
	if (typeof data === 'string') {
		// Replace template syntax: {$.field} or {{$.field}}
		// Regex: matches {$.path} or {{$.path}} where path can include dots, brackets, and numbers
		return data.replace(/\{\{?\$\.([\w.[\]]+)\}?\}/g, (match, path) => {
			const value = resolveJSONPath('$.' + path, data);

			if (value === undefined) {
				console.warn(
					`[schema-generator] Template reference '${match}' could not be resolved`,
				);
				return match; // Keep original if not found
			}

			return String(value);
		});
	} else if (Array.isArray(data)) {
		return data.map((item) => processTemplates(item, visited));
	} else if (data && typeof data === 'object') {
		const processed: any = {};
		for (const key in data) {
			if (Object.hasOwn(data, key)) {
				processed[key] = processTemplates(data[key], visited);
			}
		}
		return processed;
	}

	return data;
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
 * 1. Custom formats: x-store-as, x-ref, x-template
 * 2. Post-processing templates: {$.field} or {{$.field}} syntax
 *
 * @param schema - JSON Schema object
 * @returns JSON string with generated data
 */
export function generateFromSchema(schema: object): string {
	try {
		// Reset generation context for each new generation
		generationContext = {
			storedValues: new Map(),
		};

		// Generate data using json-schema-faker
		const generated = jsf.generate(schema);

		// Post-process to replace template strings with actual values
		const processed = deepReplaceTemplates(generated);

		return JSON.stringify(processed, null, 2);
	} catch (error) {
		throw new Error(
			`Failed to generate from schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
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
	return generateFromSchema(schema);
}
