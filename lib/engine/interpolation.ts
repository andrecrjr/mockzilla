import { resolvePath } from '../utils/path-resolver';
import { compileHandlebars } from './handlebars';

export type InterpolationContext = {
	input?: {
		body?: unknown;
		query?: unknown;
		params?: Record<string, string>;
		headers?: Record<string, string>;
	};
	state?: Record<string, unknown>;
	tables?: Record<string, unknown[]>;
	// For schema-generator compatibility
	[key: string]: unknown;
};

/**
 * Applies template replacement to a string or object using provided context.
 * Uses a hybrid approach:
 * 1. If string is valid JSON, parses and interpolates using the type-preserving engine.
 * 2. If parsing fails or is plain text, uses Handlebars for logic and blocks.
 */
export function replaceTemplates(
	data: unknown,
	context: Record<string, unknown> = {},
): unknown {
	if (data === null || data === undefined) return data;

	let stringified: string;
	let isObject = false;

	if (typeof data === 'string') {
		stringified = data;
	} else if (typeof data === 'object') {
		stringified = JSON.stringify(data);
		isObject = true;
	} else {
		return data;
	}

	// If it contains Handlebars blocks (e.g. {{#if}}, {{/if}}, {{#each}}) or helpers (with spaces/quotes or known helper names), 
	// we should use Handlebars directly on the whole string.
	const knownHelpers = /\{\{\s*(now|math|faker|and|or|not|default|dateAdd|dateSub|dateFormat|filter|sort|slice|join|slugify|truncate|currency|toFixed|json)\b/;
	if (stringified.includes('{{#') || stringified.includes('{{/') || /\{\{\s*[^}]*[\s'"][^}]*\}\}/.test(stringified) || knownHelpers.test(stringified)) {
		const result = compileHandlebars(stringified, context);
		try {
			return JSON.parse(result);
		} catch {
			return result;
		}
	}

	// If it was an object but had no Handlebars blocks, use the recursive interpolate engine
	if (isObject) {
		return interpolate(data, context);
	}

	// It's a string without Handlebars blocks
	try {
		// Attempt to parse as JSON first for type preservation (for strings that are actually JSON)
		const parsed = JSON.parse(stringified);
		
		if (parsed === null || typeof parsed !== 'object') {
			return interpolate(stringified, context);
		}

		return interpolate(parsed, context);
	} catch {
		// Not JSON or parsing failed, just interpolate as string
		return interpolate(stringified, context);
	}
}

/**
 * Robust interpolation supporting:
 * 1. Simple path access: {{state.user.name}} or {$.query.id}
 * 2. Relational DB access: {{db.users[0].id}}
 * 3. Basic arithmetic: {{state.count + 1}} or {{3 - db.items.length}}
 * 4. Type preservation: returns raw type if template is the entire string
 */
export function interpolate(
	value: unknown,
	context: InterpolationContext,
): unknown {
	if (typeof value !== 'string') {
		// Deep interpolation for objects/arrays
		if (value && typeof value === 'object') {
			if (Array.isArray(value)) {
				return value.map((v) => interpolate(v, context));
			}
			const result: Record<string, unknown> = {};
			for (const k in value) {
				if (Object.hasOwn(value, k)) {
					result[k] = interpolate(
						(value as Record<string, unknown>)[k],
						context,
					);
				}
			}
			return result;
		}
		return value;
	}

	const trimmed = value.trim();

	// Check for "exact match" templates to preserve types
	// Supports both {{...}} and {$. ...} / {$ ...}
	const exactMatch =
		trimmed.match(/^\{\{\s*(.+?)\s*\}\}$/) ||
		trimmed.match(/^\{\s*\$\.(.+?)\s*\}$/);

	if (exactMatch) {
		const path = exactMatch[1].trim();
		const resolved = resolveTemplatePath(path, context);
		return resolved !== undefined ? resolved : value;
	}

	// Handle embedded templates: "Hello {{user.name}}, your ID is {$.query.id}"
	return value.replace(
		/\{\{\s*(.+?)\s*\}\}|\{\s*\$\.(.+?)\s*\}/g,
		(match, p1, p2) => {
			const path = (p1 || p2).trim();
			const resolved = resolveTemplatePath(path, context);
			return resolved !== undefined ? String(resolved) : match;
		},
	);
}

function resolveTemplatePath(
	path: string,
	context: InterpolationContext,
): unknown {
	// 1. Handle Arithmetic: {{state.count + 1}}
	const mathMatch = path.match(/^(.+?)\s*([+-])\s*(.+?)$/);
	if (mathMatch) {
		const leftRaw = mathMatch[1].trim();
		const operator = mathMatch[2];
		const rightRaw = mathMatch[3].trim();

		const left = resolveSinglePath(leftRaw, context);
		const right = resolveSinglePath(rightRaw, context);

		const leftNum =
			typeof left === 'number' ? left : parseInt(String(left), 10);
		const rightNum =
			typeof right === 'number' ? right : parseInt(String(right), 10);

		if (!Number.isNaN(leftNum) && !Number.isNaN(rightNum)) {
			return operator === '+' ? leftNum + rightNum : leftNum - rightNum;
		}
	}

	return resolveSinglePath(path, context);
}

function resolveSinglePath(
	path: string,
	context: InterpolationContext,
): unknown {
	let lookupPath = path;
	let args: unknown;
	let _hasArgs = false;

	// Detect function call with arguments: faker.number.int({"min": 1})
	const callMatch = lookupPath.match(/^(.*?)\((.*)\)$/);
	if (callMatch) {
		lookupPath = callMatch[1].trim();
		const argsString = callMatch[2].trim();
		if (argsString) {
			_hasArgs = true;
			try {
				args = JSON.parse(argsString);
			} catch {
				// Fallback for simple values
				if (/^-?\d+\.?\d*$/.test(argsString)) {
					args = Number(argsString);
				} else {
					args = argsString.replace(/^["']|["']$/g, '');
				}
			}
		}
	}

	// 1. Handle Literals (Numeric)
	if (/^-?\d+\.?\d*$/.test(lookupPath)) {
		return Number(lookupPath);
	}

	// 2. Handle Literals (Quoted Strings)
	if (/^["'](.*)["']$/.test(lookupPath)) {
		return lookupPath.replace(/^["']|["']$/g, '');
	}

	// 3. Normalize "db" -> "tables"
	if (lookupPath.startsWith('db.') || lookupPath === 'db') {
		lookupPath = lookupPath.replace(/^db/, 'tables');
	}

	// 4. If path starts with $. (JSONPath style), normalize it for resolvePath
	if (lookupPath.startsWith('$.')) {
		lookupPath = lookupPath.substring(2);
	}

	// 5. Try resolving from root (context.state, context.tables, context.input)
	const direct = resolvePath(lookupPath, context);
	if (direct !== undefined) {
		return typeof direct === 'function' ? direct(args) : direct;
	}

	// 6. Fallback for schema-generator: check context directly (where query/params might be at root)
	// Some tools might pass flattened context where query/params are top-level
	return resolvePath(lookupPath, context);
}
