import { z } from 'zod';
import { parseJsonOrPassthrough } from '../helpers';

const ConditionSchema = z.object({
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

const TransitionConditionsSchema = z
	.preprocess(
		parseJsonOrPassthrough,
		z.union([z.record(z.string(), z.unknown()), z.array(ConditionSchema)]).optional(),
	)
	.describe(
		'Rules to trigger transition. Supported Types: eq, neq, exists, gt, lt, contains.',
	);

const TransitionEffectsSchema = z
	.preprocess(
		parseJsonOrPassthrough,
		z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]).optional(),
	)
	.describe(
		'Side effects to execute. Supported Actions: state.set, db.push, db.update, db.remove.',
	);

const TransitionResponseSchema = z
	.preprocess(parseJsonOrPassthrough, z.record(z.string(), z.unknown()).optional())
	.describe(
		'Response configuration. Interpolation supported for values: {{input.*}}, {{state.*}}, {{db.*}}',
	);

export const FindWorkflowSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('list_scenarios'),
		page: z.number().int().min(1).optional(),
		limit: z.number().int().min(1).max(100).optional(),
	}),
	z.object({
		action: z.literal('list_transitions'),
		scenarioId: z.string(),
	}),
	z.object({
		action: z.literal('inspect_state'),
		scenarioId: z.string(),
	}),
]);

export const ManageWorkflowSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('create_scenario'),
		name: z.string(),
		description: z.string().optional(),
	}),
	z.object({
		action: z.literal('delete_scenario'),
		id: z.string(),
	}),
	z.object({
		action: z.literal('create_transition'),
		scenarioId: z.string(),
		name: z.string(),
		description: z.string().optional(),
		path: z.string(),
		method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
		conditions: TransitionConditionsSchema,
		effects: TransitionEffectsSchema,
		response: z
			.preprocess(parseJsonOrPassthrough, z.record(z.string(), z.unknown()))
			.describe('Response configuration (required for creation)'),
		meta: z.preprocess(parseJsonOrPassthrough, z.record(z.string(), z.unknown()).optional()),
	}),
	z.object({
		action: z.literal('update_transition'),
		id: z.number().int(),
		name: z.string().optional(),
		description: z.string().optional(),
		path: z.string().optional(),
		method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).optional(),
		conditions: TransitionConditionsSchema,
		effects: TransitionEffectsSchema,
		response: TransitionResponseSchema,
		meta: z.preprocess(parseJsonOrPassthrough, z.record(z.string(), z.unknown()).optional()),
	}),
	z.object({
		action: z.literal('delete_transition'),
		id: z.number().int(),
	}),
	z.object({
		action: z.literal('reset_state'),
		scenarioId: z.string(),
	}),
]);

export const TestWorkflowSchema = z.object({
	scenarioId: z.string(),
	path: z.string(),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
	body: z.preprocess(parseJsonOrPassthrough, z.record(z.string(), z.unknown()).optional()),
	query: z.record(z.string(), z.string()).optional(),
	headers: z.preprocess(
		parseJsonOrPassthrough,
		z.record(z.string(), z.string()).optional(),
	),
});

export const ImportExportSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('import'),
		data: z.record(z.string(), z.unknown()).describe('The complete workflow data structure'),
	}),
	z.object({
		action: z.literal('export'),
		scenarioId: z.string().optional(),
	}),
]);

export type FindWorkflowArgs = z.infer<typeof FindWorkflowSchema>;
export type ManageWorkflowArgs = z.infer<typeof ManageWorkflowSchema>;
export type TestWorkflowArgs = z.infer<typeof TestWorkflowSchema>;
export type ImportExportArgs = z.infer<typeof ImportExportSchema>;
