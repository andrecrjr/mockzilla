import type { JsonValue } from '../types';

/**
 * Resolves a JSONPath-like reference to a value in an object
 * Supports: $.field, $.nested.field, $.array[0], $.array[0].field, array[0], field
 *
 * @param path - JSONPath string (e.g., "$.user.name", "users[0].id", "db.users[0]")
 * @param data - The object to resolve the path in
 * @returns The resolved value or undefined
 */
export function resolvePath(path: string, data: JsonValue): JsonValue | undefined {
	// Remove leading $. if present (for JSONPath compatibility)
	const cleanPath = path.startsWith('$.')
		? path.slice(2)
		: path.startsWith('$')
			? path.slice(1)
			: path;

	if (!cleanPath) {
		return data;
	}

	// Split by dots and brackets, handling array indices
	// Matches: dot or open bracket or close bracket
	const parts = cleanPath.split(/\.|\[|\]/).filter(Boolean);

	let current: JsonValue | undefined = data;
	for (const part of parts) {
		if (current === null || current === undefined) {
			return undefined;
		}

		// Check if part is an array index
		const arrayIndex = parseInt(part, 10);
		if (!Number.isNaN(arrayIndex)) {
            // Check if current is an array
            if (Array.isArray(current)) {
			    current = current[arrayIndex];
            } else {
                return undefined;
            }
		} else {
            // Check if current is an object (and not null/array)
            if (typeof current === 'object' && !Array.isArray(current) && current !== null) {
			    current = (current as Record<string, JsonValue>)[part];
            } else {
                return undefined;
            }
		}
	}

	return current;
}
