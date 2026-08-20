import { z } from 'zod';
import type { HttpMethod } from './types';

const keySchema = z.string().regex(/^[a-z][a-zA-Z0-9]*$/);
const scalarTypeSchema = z.enum(['string', 'number', 'boolean']);
const scalarValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const JourneyLifecycleSchema = z.object({
	key: keySchema,
	name: z.string().min(1),
	states: z.array(z.string().min(1)).min(1),
	initialState: z.string().min(1),
}).superRefine((value, context) => {
	if (!value.states.includes(value.initialState)) context.addIssue({ code: z.ZodIssueCode.custom, message: 'initialState must be declared in states', path: ['initialState'] });
	if (new Set(value.states).size !== value.states.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'states must be unique', path: ['states'] });
});

export const JourneyFieldSchema = z.object({
	key: keySchema,
	type: scalarTypeSchema,
	initialValue: scalarValueSchema,
}).superRefine((value, context) => {
	if (value.initialValue !== null && typeof value.initialValue !== value.type) context.addIssue({ code: z.ZodIssueCode.custom, message: 'initialValue must match field type or be null', path: ['initialValue'] });
});

export const JourneyDefinitionSchema = z.object({
	name: z.string().min(1), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().optional(),
	lifecycles: z.array(JourneyLifecycleSchema).min(1), fields: z.array(JourneyFieldSchema).default([]),
}).superRefine((value, context) => {
	for (const collection of ['lifecycles', 'fields'] as const) {
		const keys = value[collection].map((item) => item.key);
		if (new Set(keys).size !== keys.length) context.addIssue({ code: z.ZodIssueCode.custom, message: `${collection} keys must be unique`, path: [collection] });
	}
});

export const JourneyActionSchema = z.object({
	name: z.string().min(1), method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']), path: z.string().regex(/^\//),
	requires: z.record(z.string()).default({}), transitions: z.record(z.string()).default({}), setFields: z.record(z.string()).default({}),
	statusCode: z.number().int().min(100).max(599), headers: z.record(z.string()).default({}), body: z.unknown(), bodyType: z.enum(['json', 'text']).default('json'),
});
export type JourneyDefinition = z.infer<typeof JourneyDefinitionSchema>;
export type JourneyAction = z.infer<typeof JourneyActionSchema>;
export type JourneyRuntime = { state: Record<string, string>; fields: Record<string, string | number | boolean | null> };

export function validateJourneyDefinition(input: unknown) { return JourneyDefinitionSchema.safeParse(input); }
export function createInitialJourneyRuntime(input: JourneyDefinition): JourneyRuntime {
	const definition = JourneyDefinitionSchema.parse(input);
	return { state: Object.fromEntries(definition.lifecycles.map((lifecycle) => [lifecycle.key, lifecycle.initialState])), fields: Object.fromEntries(definition.fields.map((field) => [field.key, field.initialValue])) };
}
export function validateJourneyAction(definitionInput: JourneyDefinition, input: unknown) {
	const action = JourneyActionSchema.safeParse(input);
	if (!action.success) return action;
	const definition = JourneyDefinitionSchema.parse(definitionInput);
	const lifecycleByKey = new Map(definition.lifecycles.map((lifecycle) => [lifecycle.key, lifecycle]));
	const fieldByKey = new Map(definition.fields.map((field) => [field.key, field]));
	for (const [key, state] of Object.entries({ ...action.data.requires, ...action.data.transitions })) {
		if (!lifecycleByKey.get(key)?.states.includes(state)) return { success: false as const, error: new z.ZodError([{ code: z.ZodIssueCode.custom, message: `Unknown lifecycle state: ${key}.${state}`, path: ['requires', key] }]) };
	}
	for (const key of Object.keys(action.data.setFields)) if (!fieldByKey.has(key)) return { success: false as const, error: new z.ZodError([{ code: z.ZodIssueCode.custom, message: `Unknown Journey field: ${key}`, path: ['setFields', key] }]) };
	return action;
}
export function matchJourneyPath(pattern: string, path: string): Record<string, string> | null {
	const names: string[] = [];
	const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:([A-Za-z][A-Za-z0-9_]*)/g, (_match, name: string) => { names.push(name); return '([^/]+)'; });
	const result = new RegExp(`^${escaped}$`).exec(path);
	if (!result) return null;
	try {
		return Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(result[index + 1])]));
	} catch {
		return null;
	}
}
export function isDuplicateJourneyAction(existing: JourneyAction[], candidate: JourneyAction): boolean {
	const normalize = (requires: Record<string, string>) => JSON.stringify(Object.entries(requires).sort(([a], [b]) => a.localeCompare(b)));
	return existing.some((action) => action.method === candidate.method && action.path === candidate.path && normalize(action.requires) === normalize(candidate.requires));
}
export const journeyHttpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
