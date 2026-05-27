import { z } from 'zod';

export const parseJsonOrPassthrough = (val: unknown) => {
	if (typeof val === 'string') {
		try {
			return JSON.parse(val);
		} catch {
			return val;
		}
	}
	return val;
};

export const MockVariantSchema = z.object({
	key: z.string(),
	body: z.string(),
	statusCode: z.number().int(),
	bodyType: z.enum(['json', 'text']),
});
export type MockVariantSchema = z.infer<typeof MockVariantSchema>;

export const ConditionSchema = z.object({
	type: z
		.enum(['eq', 'neq', 'exists', 'gt', 'lt', 'contains'])
		.describe(
			'Operator type: eq (equals), neq (not equals), exists (not null/undefined), gt (greater than), lt (less than), contains (array includes or string substring)',
		),
	field: z
		.string()
		.describe(
			'Path to field in context (e.g., "input.body.id", "state.status", "db.users")',
		),
	value: z.unknown().optional().describe('Value to compare against'),
});
export type ConditionSchema = z.infer<typeof ConditionSchema>;

export const EffectSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('state.set'),
		key: z.string().optional().describe('State key to set (if not using raw)'),
		value: z
			.unknown()
			.optional()
			.describe('Value to set for the key (interpolation supported)'),
		raw: z
			.record(z.unknown())
			.optional()
			.describe('Object of multiple key-value pairs to set in state'),
	}),
	z.object({
		type: z.literal('db.push'),
		table: z.string().describe('Table name in mini-database'),
		value: z
			.unknown()
			.describe('Object or value to push to the table (interpolation supported)'),
	}),
	z.object({
		type: z.literal('db.update'),
		table: z.string().describe('Table name'),
		match: z.record(z.unknown()).describe('Criteria to find rows to update'),
		set: z.record(z.unknown()).describe('Values to update in matched rows'),
	}),
	z.object({
		type: z.literal('db.remove'),
		table: z.string().describe('Table name'),
		match: z.record(z.unknown()).describe('Criteria to find rows to remove'),
	}),
	z.object({
		type: z.literal('db.clear'),
		table: z.string().describe('Table name to empty'),
	}),
]);
export type EffectSchema = z.infer<typeof EffectSchema>;

export const WorkflowScenarioSchema = z.object({
	id: z.string().describe('Unique identifier for the scenario (slug format)'),
	name: z.string().describe('Display name of the scenario'),
	description: z
		.string()
		.optional()
		.describe('Description of the scenario flow'),
});
export type WorkflowScenarioSchema = z.infer<typeof WorkflowScenarioSchema>;

export const WorkflowTransitionSchema = z.object({
	scenarioId: z
		.string()
		.describe('ID of the scenario this transition belongs to'),
	name: z.string().describe('Name of the transition step'),
	description: z
		.string()
		.optional()
		.describe('Description of what this step does'),
	path: z
		.string()
		.describe(
			'The URL path (e.g. "/users" or "/users/:id"). Supports :param syntax.',
		),
	method: z
		.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
		.describe('HTTP method for this transition'),
	conditions: z
		.preprocess(
			parseJsonOrPassthrough,
			z.union([z.record(z.unknown()), z.array(ConditionSchema)]).optional(),
		)
		.describe(
			'Rules to trigger this transition. Can be an array of Condition objects (preferred) or a key-value object (legacy). Supported operators: eq, neq, exists, gt, lt, contains. Context fields: input.body.*, input.query.*, input.params.*, input.headers.*, state.*, db.*',
		),
	effects: z
		.preprocess(
			parseJsonOrPassthrough,
			z.array(EffectSchema).optional(),
		)
		.describe(
			'Side effects to execute. Array of effect objects. Supported types: "state.set" (sets state variables), "db.push" (adds to table), "db.update" (updates rows), "db.remove" (removes rows). Examples: { "type": "state.set", "raw": { "isLoggedIn": true } }, { "type": "db.push", "table": "users", "value": "{{input.body}}" }',
		),
	response: z
		.preprocess(
			parseJsonOrPassthrough,
			z.object({
				status: z.number().int().default(200),
				body: z.unknown().optional(),
				headers: z.record(z.string()).optional(),
			}),
		)
		.describe(
			'Response configuration to return to the client. Can use interpolation like {{input.body.id}} or {{state.token}}.',
		),
	meta: z
		.preprocess(parseJsonOrPassthrough, z.record(z.unknown()).optional())
		.describe('Additional metadata'),
});
export type WorkflowTransitionSchema = z.infer<typeof WorkflowTransitionSchema>;
