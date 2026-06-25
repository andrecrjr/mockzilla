import { z } from 'zod';
import { 
	parseJsonOrPassthrough, 
	ConditionSchema, 
	EffectSchema, 
	WorkflowScenarioSchema, 
	WorkflowTransitionSchema 
} from './shared';

export const CreateWorkflowTransitionArgs = z.object({
	scenarioId: z.string().describe('ID or slug of the scenario'),
	name: z.string().describe('Name of the transition'),
	description: z.string().optional(),
	path: z
		.string()
		.describe(
			'The URL path (e.g. "/users" or "/users/:id"). Supports :param syntax.',
		),
	method: z
		.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
		.describe('HTTP method'),
	conditions: z
		.preprocess(
			parseJsonOrPassthrough,
			z.union([z.record(z.unknown()), z.array(ConditionSchema)]).optional(),
		)
		.describe(
			'Rules to trigger this transition.\nFormat: Array of rules (RECOMMENDED) or Object (Legacy).',
		),
	effects: z
		.preprocess(
			parseJsonOrPassthrough,
			z.array(EffectSchema).optional(),
		)
		.describe('Side effects to execute (state.set, db.push, etc).'),
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
			'Response configuration.\n\nEXAMPLE:\n{\n  "status": 201,\n  "body": { "id": "{{input.body.id}}", "status": "created" }\n}',
		),
	meta: z.preprocess(parseJsonOrPassthrough, z.record(z.unknown()).optional()),
});
export type CreateWorkflowTransitionArgs = z.infer<typeof CreateWorkflowTransitionArgs>;

export const ResetWorkflowStateArgs = z.object({
	scenarioId: z.string(),
});
export type ResetWorkflowStateArgs = z.infer<typeof ResetWorkflowStateArgs>;

export const InspectWorkflowStateArgs = z.object({
	scenarioId: z.string(),
});
export type InspectWorkflowStateArgs = z.infer<typeof InspectWorkflowStateArgs>;

export const UpdateWorkflowTransitionArgs = z.object({
	id: z.number().int().describe('ID of the transition to update'),
	name: z.string().optional(),
	description: z.string().optional(),
	path: z.string().optional(),
	method: z
		.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
		.optional(),
	conditions: z
		.preprocess(
			parseJsonOrPassthrough,
			z.union([z.record(z.unknown()), z.array(ConditionSchema)]).optional(),
		)
		.describe('Update conditions.'),
	effects: z
		.preprocess(
			parseJsonOrPassthrough,
			z.array(EffectSchema).optional(),
		)
		.describe('Update effects.'),
	response: z
		.preprocess(
			parseJsonOrPassthrough,
			z
				.object({
					status: z.number().int().default(200),
					body: z.unknown().optional(),
					headers: z.record(z.string()).optional(),
				})
				.optional(),
		)
		.describe('Update response configuration.'),
	meta: z.preprocess(parseJsonOrPassthrough, z.record(z.unknown()).optional()),
});
export type UpdateWorkflowTransitionArgs = z.infer<typeof UpdateWorkflowTransitionArgs>;

export const CreateWorkflowScenarioArgs = z.object({
	name: z
		.string()
		.describe(
			'Name of the scenario (e.g. "auth-flow"). Slug will be generated automatically if ID not provided.',
		),
	description: z.string().optional().describe('Scenario description'),
});
export type CreateWorkflowScenarioArgs = z.infer<typeof CreateWorkflowScenarioArgs>;

export const ListWorkflowScenariosArgs = z.object({
	page: z.number().int().min(1).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});
export type ListWorkflowScenariosArgs = z.infer<typeof ListWorkflowScenariosArgs>;

export const DeleteWorkflowScenarioArgs = z.object({
	id: z.string().describe('The ID (slug) of the scenario to delete.'),
});
export type DeleteWorkflowScenarioArgs = z.infer<typeof DeleteWorkflowScenarioArgs>;

export const DeleteWorkflowTransitionArgs = z.object({
	id: z.number().int().describe('The transition database ID'),
});
export type DeleteWorkflowTransitionArgs = z.infer<typeof DeleteWorkflowTransitionArgs>;

export const ListWorkflowTransitionsArgs = z.object({
	scenarioId: z.string().describe('Scenario ID or slug'),
});
export type ListWorkflowTransitionsArgs = z.infer<typeof ListWorkflowTransitionsArgs>;

export const TestWorkflowArgs = z.object({
	scenarioId: z.string().describe('Scenario ID or slug'),
	path: z.string().describe('Request path (e.g. /login)'),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
	body: z.preprocess(parseJsonOrPassthrough, z.record(z.unknown()).optional()),
	query: z.record(z.string()).optional(),
	headers: z.preprocess(
		parseJsonOrPassthrough,
		z.record(z.string()).optional(),
	),
});
export type TestWorkflowArgs = z.infer<typeof TestWorkflowArgs>;

export const ImportWorkflowArgs = z.object({
	data: z
		.object({
			scenarios: z
				.array(WorkflowScenarioSchema)
				.describe('List of scenarios to import'),
			transitions: z
				.array(WorkflowTransitionSchema)
				.optional()
				.describe('List of transitions associated with the scenarios'),
		})
		.describe(
			'The complete workflow data structure containing scenarios and their transitions. Use this structure to generate valid import data.',
		),
});
export type ImportWorkflowArgs = z.infer<typeof ImportWorkflowArgs>;

export const ExportWorkflowArgs = z.object({
	scenarioId: z
		.string()
		.optional()
		.describe('Optional scenario ID to export only one scenario'),
});
export type ExportWorkflowArgs = z.infer<typeof ExportWorkflowArgs>;

export const CreateFullWorkflowArgs = z.object({
	name: z.string().describe('Display name of the scenario'),
	description: z.string().optional().describe('Description of the scenario flow'),
	transitions: z.array(
		z.object({
			name: z.string().describe('Name of the transition step'),
			description: z.string().optional().describe('Description of what this step does'),
			path: z.string().describe('The URL path (e.g. "/users" or "/users/:id"). Supports :param syntax.'),
			method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).describe('HTTP method for this transition'),
			conditions: z.preprocess(parseJsonOrPassthrough, z.union([z.record(z.unknown()), z.array(ConditionSchema)]).optional()).describe('Rules to trigger this transition.'),
			effects: z.preprocess(parseJsonOrPassthrough, z.array(EffectSchema).optional()).describe('Side effects to execute.'),
			response: z.preprocess(parseJsonOrPassthrough, z.object({
				status: z.number().int().default(200),
				body: z.unknown().optional(),
				headers: z.record(z.string()).optional(),
			})).describe('Response configuration.'),
			meta: z.preprocess(parseJsonOrPassthrough, z.record(z.unknown()).optional()).describe('Additional metadata'),
		})
	).describe('List of transitions to create for this scenario'),
});
export type CreateFullWorkflowArgs = z.infer<typeof CreateFullWorkflowArgs>;

export const EvaluateTemplateArgs = z.object({
	template: z.unknown().describe('The template string or object to evaluate (e.g. "Hello {{state.name}}")'),
	context: z.object({
		state: z.record(z.unknown()).optional().describe('Mock state object'),
		tables: z.record(z.array(z.unknown())).optional().describe('Mini-database tables'),
		input: z.object({
			body: z.unknown().optional(),
			query: z.record(z.string()).optional(),
			params: z.record(z.string()).optional(),
			headers: z.record(z.string()).optional(),
		}).optional().describe('Simulated request input'),
	}).optional().describe('The evaluation context'),
});
export type EvaluateTemplateArgs = z.infer<typeof EvaluateTemplateArgs>;

export const SeedWorkflowStateArgs = z.object({
	scenarioId: z.string().describe('ID or slug of the scenario'),
	state: z.record(z.unknown()).optional().describe('State object to inject'),
	tables: z.record(z.array(z.unknown())).optional().describe('Mini-database tables to inject'),
});
export type SeedWorkflowStateArgs = z.infer<typeof SeedWorkflowStateArgs>;

export const ManageScenariosArgs = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('list'),
		page: z.number().int().min(1).optional(),
		limit: z.number().int().min(1).max(100).optional(),
	}),
	z.object({
		action: z.literal('create'),
		name: z.string(),
		description: z.string().optional(),
	}),
	z.object({
		action: z.literal('delete'),
		id: z.string(),
	}),
	z.object({
		action: z.literal('export'),
		scenarioId: z.string().optional(),
	}),
	z.object({
		action: z.literal('import'),
		data: z.object({
			scenarios: z.array(WorkflowScenarioSchema),
			transitions: z.array(WorkflowTransitionSchema).optional(),
		}),
	}),
]);
export type ManageScenariosArgs = z.infer<typeof ManageScenariosArgs>;

export const ManageTransitionsArgs = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('list'),
		scenarioId: z.string(),
	}),
	z.object({
		action: z.literal('create'),
		scenarioId: z.string(),
		name: z.string(),
		description: z.string().optional(),
		path: z.string(),
		method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
		conditions: z.preprocess(parseJsonOrPassthrough, z.union([z.record(z.unknown()), z.array(ConditionSchema)]).optional()),
		effects: z.preprocess(parseJsonOrPassthrough, z.array(EffectSchema).optional()),
		response: z.preprocess(parseJsonOrPassthrough, z.object({
			status: z.number().int().default(200),
			body: z.unknown().optional(),
			headers: z.record(z.string()).optional(),
		})),
		meta: z.preprocess(parseJsonOrPassthrough, z.record(z.unknown()).optional()),
	}),
	z.object({
		action: z.literal('update'),
		id: z.number().int(),
		name: z.string().optional(),
		description: z.string().optional(),
		path: z.string().optional(),
		method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).optional(),
		conditions: z.preprocess(parseJsonOrPassthrough, z.union([z.record(z.unknown()), z.array(ConditionSchema)]).optional()),
		effects: z.preprocess(parseJsonOrPassthrough, z.array(EffectSchema).optional()),
		response: z.preprocess(parseJsonOrPassthrough, z.object({
			status: z.number().int().default(200),
			body: z.unknown().optional(),
			headers: z.record(z.string()).optional(),
		}).optional()),
		meta: z.preprocess(parseJsonOrPassthrough, z.record(z.unknown()).optional()),
	}),
	z.object({
		action: z.literal('delete'),
		id: z.number().int(),
	}),
	z.object({
		action: z.literal('create_full'),
		name: z.string(),
		description: z.string().optional(),
		transitions: z.array(z.object({
			name: z.string(),
			description: z.string().optional(),
			path: z.string(),
			method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
			conditions: z.preprocess(parseJsonOrPassthrough, z.union([z.record(z.unknown()), z.array(ConditionSchema)]).optional()),
			effects: z.preprocess(parseJsonOrPassthrough, z.array(EffectSchema).optional()),
			response: z.preprocess(parseJsonOrPassthrough, z.object({
				status: z.number().int().default(200),
				body: z.unknown().optional(),
				headers: z.record(z.string()).optional(),
			})),
			meta: z.preprocess(parseJsonOrPassthrough, z.record(z.unknown()).optional()),
		})),
	}),
]);
export type ManageTransitionsArgs = z.infer<typeof ManageTransitionsArgs>;

export const WorkflowControlArgs = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('reset'),
		scenarioId: z.string(),
	}),
	z.object({
		action: z.literal('inspect'),
		scenarioId: z.string(),
	}),
	z.object({
		action: z.literal('seed'),
		scenarioId: z.string(),
		state: z.record(z.unknown()).optional(),
		tables: z.record(z.array(z.unknown())).optional(),
	}),
	z.object({
		action: z.literal('test'),
		scenarioId: z.string(),
		path: z.string(),
		method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
		body: z.preprocess(parseJsonOrPassthrough, z.record(z.unknown()).optional()),
		query: z.record(z.string()).optional(),
		headers: z.preprocess(parseJsonOrPassthrough, z.record(z.string()).optional()),
	}),
	z.object({
		action: z.literal('evaluate_template'),
		template: z.unknown(),
		context: z.object({
			state: z.record(z.unknown()).optional(),
			tables: z.record(z.array(z.unknown())).optional(),
			input: z.object({
				body: z.unknown().optional(),
				query: z.record(z.string()).optional(),
				params: z.record(z.string()).optional(),
				headers: z.record(z.string()).optional(),
			}).optional(),
		}).optional(),
	}),
]);
export type WorkflowControlArgs = z.infer<typeof WorkflowControlArgs>;
