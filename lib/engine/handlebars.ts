import { faker } from '@faker-js/faker';
import Handlebars from 'handlebars';
import { format, add, sub, parseISO } from 'date-fns';

// Register Helpers
Handlebars.registerHelper('faker', (path: string, ...args: unknown[]) => {
	args.pop(); // options
	const callArgs = args.length > 0 ? args : [];

	// Handle dot-notated paths like internet.email
	const parts = path.split('.');
	let current: unknown = faker;

	for (const part of parts) {
		if (current === null || typeof current !== 'object' || !(part in current)) {
			return `{{faker path "${path}" not found}}`;
		}
		current = (current as Record<string, unknown>)[part];
	}

	if (typeof current === 'function') {
		return current(...callArgs);
	}
	return current;
});

Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('neq', (a, b) => a !== b);
Handlebars.registerHelper('gt', (a, b) => a > b);
Handlebars.registerHelper('lt', (a, b) => a < b);
Handlebars.registerHelper('gte', (a, b) => a >= b);
Handlebars.registerHelper('lte', (a, b) => a <= b);

Handlebars.registerHelper('math', (lvalue, operator, rvalue) => {
	lvalue = parseFloat(lvalue);
	rvalue = parseFloat(rvalue);

	return {
		'+': lvalue + rvalue,
		'-': lvalue - rvalue,
		'*': lvalue * rvalue,
		'/': lvalue / rvalue,
		'%': lvalue % rvalue,
	}[operator as string];
});

Handlebars.registerHelper('json', (context) => {
	return JSON.stringify(context);
});

// --- Advanced Logic ---
Handlebars.registerHelper('and', (...args) => {
	return args.slice(0, -1).every(Boolean);
});

Handlebars.registerHelper('or', (...args) => {
	return args.slice(0, -1).some(Boolean);
});

Handlebars.registerHelper('not', (val) => {
	return !val;
});

Handlebars.registerHelper('default', (val, def) => {
	return val !== undefined && val !== null && val !== '' ? val : def;
});

// --- Temporal (Time) ---
Handlebars.registerHelper('now', () => {
	return new Date().toISOString();
});

Handlebars.registerHelper('dateAdd', (dateStr, amount, unit) => {
	try {
		const date = dateStr === 'now' ? new Date() : parseISO(dateStr);
		const duration = { [unit]: Number(amount) };
		return add(date, duration).toISOString();
	} catch (_e) {
		return dateStr;
	}
});

Handlebars.registerHelper('dateSub', (dateStr, amount, unit) => {
	try {
		const date = dateStr === 'now' ? new Date() : parseISO(dateStr);
		const duration = { [unit]: Number(amount) };
		return sub(date, duration).toISOString();
	} catch (_e) {
		return dateStr;
	}
});

Handlebars.registerHelper('dateFormat', (dateStr, pattern) => {
	try {
		const date = dateStr === 'now' ? new Date() : parseISO(dateStr);
		return format(date, pattern);
	} catch (_e) {
		return dateStr;
	}
});

// --- Collection Wizards ---
Handlebars.registerHelper('filter', (arr, key, val) => {
	if (!Array.isArray(arr)) return [];
	return arr.filter((item) => item[key] === val);
});

Handlebars.registerHelper('sort', (arr, key, order = 'asc') => {
	if (!Array.isArray(arr)) return [];
	return [...arr].sort((a, b) => {
		if (a[key] < b[key]) return order === 'desc' ? 1 : -1;
		if (a[key] > b[key]) return order === 'desc' ? -1 : 1;
		return 0;
	});
});

Handlebars.registerHelper('slice', (arr, start, end) => {
	if (!Array.isArray(arr)) return [];
	// Handle Handlebars options object being passed as the last argument
	const endIndex = typeof end === 'object' ? undefined : end;
	return arr.slice(start, endIndex);
});

Handlebars.registerHelper('join', (arr, sep) => {
	if (!Array.isArray(arr)) return '';
	// Handle Handlebars options object
	const separator = typeof sep === 'object' ? ',' : sep;
	return arr.join(separator);
});

// --- String & Number Stylists ---
Handlebars.registerHelper('slugify', (str) => {
	if (typeof str !== 'string') return '';
	return str
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/[\s_-]+/g, '-')
		.replace(/^-+|-+$/g, '');
});

Handlebars.registerHelper('truncate', (str, len) => {
	if (typeof str !== 'string') return '';
	if (str.length > len) {
		return `${str.substring(0, len)}...`;
	}
	return str;
});

Handlebars.registerHelper('currency', (num, curr = 'USD', locale = 'en-US') => {
	// Handle Handlebars options object
	const c = typeof curr === 'object' ? 'USD' : curr;
	const l = typeof locale === 'object' ? 'en-US' : locale;
	try {
		return new Intl.NumberFormat(l, { style: 'currency', currency: c }).format(
			Number(num),
		);
	} catch (_e) {
		return String(num);
	}
});

Handlebars.registerHelper('toFixed', (num, digits = 2) => {
	// Handle Handlebars options object
	const d = typeof digits === 'object' ? 2 : digits;
	return Number(num).toFixed(d);
});

/**
 * Compiles and executes a Handlebars template with the provided context.
 */
export function compileHandlebars(
	template: string,
	context: Record<string, unknown>,
): string {
	try {
		const compiled = Handlebars.compile(template);
		const result = compiled(context);
		return result;
	} catch (error) {
		console.error('[Handlebars] Compilation failed:', error);
		return template;
	}
}
