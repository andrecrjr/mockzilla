import { z } from 'zod';

export const ListFoldersArgs = z.object({
	page: z.number().int().min(1).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});

export const CreateFolderArgs = z.object({
	name: z.string(),
	description: z.string().optional(),
});

export const GetFolderArgs = z
	.object({ id: z.string().optional(), slug: z.string().optional() })
	.refine((v) => !!v.id || !!v.slug, { message: 'id or slug is required' });

export const UpdateFolderArgs = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
});

export const DeleteFolderArgs = z.object({ id: z.string() });

export const MockVariantSchema = z.object({
	key: z.string(),
	body: z.string(),
	statusCode: z.number().int(),
	bodyType: z.enum(['json', 'text']),
});

export const CreateMockArgs = z.object({
	name: z.string().describe('The name of the mock'),
	path: z.string().describe('The endpoint path (e.g. /api/users)'),
	method: z
		.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
		.describe('HTTP method'),
	statusCode: z.number().int().describe('HTTP status code to return'),
	folderId: z
		.string()
		.optional()
		.describe('The ID of the parent folder (required if folderSlug not provided)'),
	folderSlug: z
		.string()
		.optional()
		.describe(
			'The slug of the parent folder (alternative to folderId, e.g. "my-folder")',
		),
	response: z.string().describe('The response body (JSON string or text)'),
	matchType: z
		.enum(['exact', 'substring', 'wildcard'])
		.optional()
		.describe('Matching strategy for the path'),
	bodyType: z
		.enum(['json', 'text'])
		.optional()
		.describe('Content type of the response'),
	enabled: z.boolean().optional().describe('Whether the mock is active'),
	queryParams: z
		.record(z.string())
		.nullable()
		.optional()
		.describe('Query parameters to match'),
	variants: z
		.array(MockVariantSchema)
		.nullable()
		.optional()
		.describe('Wildcard capture variants'),
	wildcardRequireMatch: z
		.boolean()
		.optional()
		.describe('If true, 404 if no variant matches'),
	jsonSchema: z
		.string()
		.nullable()
		.optional()
		.describe('JSON Schema for dynamic generation'),
	useDynamicResponse: z
		.boolean()
		.nullable()
		.optional()
		.describe('Enable faker-based dynamic data'),
	echoRequestBody: z
		.boolean()
		.nullable()
		.optional()
		.describe('Echo the request body back to the client'),
	delay: z
		.number()
		.int()
		.optional()
		.describe('Response delay in milliseconds'),
});

export const PreviewMockArgs = z.object({
	folderSlug: z.string(),
	path: z.string(),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
	contentType: z.string().nullable().optional(),
	queryParams: z.record(z.string()).nullable().optional(),
	headers: z.record(z.string()).nullable().optional(),
	bodyText: z.string().nullable().optional(),
	bodyJson: z.record(z.unknown()).nullable().optional(),
});

export const ListMocksArgs = z.object({
	folderId: z.string().optional().describe('Filter by folder ID'),
	folderSlug: z
		.string()
		.optional()
		.describe('Filter by folder slug (e.g. "my-folder")'),
	page: z.number().int().min(1).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});

export const GetMockArgs = z.object({ id: z.string().describe('The mock ID') });

export const UpdateMockArgs = z.object({
	id: z.string().describe('The ID of the mock to update'),
	name: z.string().describe('The name of the mock'),
	path: z.string().describe('The endpoint path (e.g. /api/users)'),
	method: z
		.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
		.describe('HTTP method'),
	statusCode: z.number().int().describe('HTTP status code to return'),
	response: z.string().describe('The response body (JSON string or text)'),
	matchType: z
		.enum(['exact', 'substring', 'wildcard'])
		.optional()
		.describe('Matching strategy for the path'),
	bodyType: z
		.enum(['json', 'text'])
		.optional()
		.describe('Content type of the response'),
	enabled: z.boolean().optional().describe('Whether the mock is active'),
	queryParams: z
		.record(z.string())
		.nullable()
		.optional()
		.describe('Query parameters to match'),
	variants: z
		.array(MockVariantSchema)
		.nullable()
		.optional()
		.describe('Wildcard capture variants'),
	wildcardRequireMatch: z
		.boolean()
		.optional()
		.describe('If true, 404 if no variant matches'),
	jsonSchema: z
		.string()
		.nullable()
		.optional()
		.describe('JSON Schema for dynamic generation'),
	useDynamicResponse: z
		.boolean()
		.nullable()
		.optional()
		.describe('Enable faker-based dynamic data'),
	echoRequestBody: z
		.boolean()
		.nullable()
		.optional()
		.describe('Echo the request body back to the client'),
	delay: z
		.number()
		.int()
		.optional()
		.describe('Response delay in milliseconds'),
});

export const DeleteMockArgs = z.object({ id: z.string() });

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

// Helper to parse JSON strings or pass through objects
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

export const ResetWorkflowStateArgs = z.object({
	scenarioId: z.string(),
});

export const InspectWorkflowStateArgs = z.object({
	scenarioId: z.string(),
});

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

export const CreateWorkflowScenarioArgs = z.object({
	name: z
		.string()
		.describe(
			'Name of the scenario (e.g. "auth-flow"). Slug will be generated automatically if ID not provided.',
		),
	description: z.string().optional().describe('Scenario description'),
});

export const ListWorkflowScenariosArgs = z.object({
	page: z.number().int().min(1).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});

export const DeleteWorkflowScenarioArgs = z.object({
	id: z.string().describe('The ID (slug) of the scenario to delete.'),
});

export const DeleteWorkflowTransitionArgs = z.object({
	id: z.number().int().describe('The transition database ID'),
});

export const ListWorkflowTransitionsArgs = z.object({
	scenarioId: z.string().describe('Scenario ID or slug'),
});

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

export const WorkflowScenarioSchema = z.object({
	id: z.string().describe('Unique identifier for the scenario (slug format)'),
	name: z.string().describe('Display name of the scenario'),
	description: z
		.string()
		.optional()
		.describe('Description of the scenario flow'),
});

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

export const ExportWorkflowArgs = z.object({
	scenarioId: z
		.string()
		.optional()
		.describe('Optional scenario ID to export only one scenario'),
});

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

export const SeedWorkflowStateArgs = z.object({
	scenarioId: z.string().describe('ID or slug of the scenario'),
	state: z.record(z.unknown()).optional().describe('State object to inject'),
	tables: z.record(z.array(z.unknown())).optional().describe('Mini-database tables to inject'),
});

// LOG SCHEMAS
export const GetLogsArgs = z.object({
	limit: z.number().int().min(1).max(500).optional().describe('Maximum number of logs to return (default 100)'),
	type: z.string().optional().describe('Filter by log type (e.g., "intercept")'),
	level: z.union([z.number(), z.string()]).optional().describe('Filter by log level (10-60 or "info", "error", etc)'),
	search: z.string().optional().describe('Text search within the message'),
});

export const GetRequestTraceArgs = z.object({
	reqId: z.string().describe('The unique request ID to trace (found in logs)'),
});
