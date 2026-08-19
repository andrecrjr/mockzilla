import { faker } from '@faker-js/faker';
import { replaceTemplates } from './engine/interpolation';
import { matchJourneyPath, type JourneyAction, type JourneyDefinition, type JourneyRuntime } from './journeys';

export type JourneyRequest = {
	method: string;
	path: string;
	body?: unknown;
	query?: Record<string, string>;
	headers?: Record<string, string>;
};

export type JourneyExecutionSuccess = {
	success: true;
	action: JourneyAction;
	runtime: JourneyRuntime;
	response: { statusCode: number; headers: Record<string, string>; body: unknown; bodyType: JourneyAction['bodyType'] };
};

export type JourneyExecutionConflict = {
	success: false;
	statusCode: 409;
	runtime: JourneyRuntime;
	candidates: Array<{ name: string; requires: Record<string, string> }>;
};

export type JourneyExecutionResult = JourneyExecutionSuccess | JourneyExecutionConflict;

type TemplateContext = {
	request: { body: unknown; query: Record<string, string>; headers: Record<string, string> };
	params: Record<string, string>;
	state: JourneyRuntime['state'];
	fields: JourneyRuntime['fields'];
	faker: typeof faker;
};

function hasRequiredStates(runtime: JourneyRuntime, requires: Record<string, string>): boolean {
	return Object.entries(requires).every(([key, value]) => runtime.state[key] === value);
}

function renderContext(request: JourneyRequest, params: Record<string, string>, runtime: JourneyRuntime): TemplateContext {
	return {
		request: { body: request.body, query: request.query ?? {}, headers: request.headers ?? {} },
		params,
		state: runtime.state,
		fields: runtime.fields,
		faker,
	};
}

function validateRenderedFieldValue(type: JourneyDefinition['fields'][number]['type'], value: unknown, key: string): string | number | boolean | null {
	if (value === null || typeof value === type) return value as string | number | boolean | null;
	throw new Error(`Journey field ${key} must render to ${type} or null`);
}

export function executeJourneyAction(
	definition: JourneyDefinition,
	actions: JourneyAction[],
	runtime: JourneyRuntime,
	request: JourneyRequest,
): JourneyExecutionResult {
	const pathCandidates = actions.flatMap((action) => {
		if (action.method !== request.method) return [];
		const params = matchJourneyPath(action.path, request.path);
		return params === null ? [] : [{ action, params }];
	});
	const selected = pathCandidates.find(({ action }) => hasRequiredStates(runtime, action.requires));
	if (!selected) {
		return {
			success: false,
			statusCode: 409,
			runtime,
			candidates: pathCandidates.map(({ action }) => ({ name: action.name, requires: action.requires })),
		};
	}

	const nextRuntime: JourneyRuntime = {
		state: { ...runtime.state, ...selected.action.transitions },
		fields: { ...runtime.fields },
	};
	const fieldByKey = new Map(definition.fields.map((field) => [field.key, field]));
	const writeContext = renderContext(request, selected.params, nextRuntime);
	for (const [key, template] of Object.entries(selected.action.setFields)) {
		const field = fieldByKey.get(key);
		if (!field) throw new Error(`Unknown Journey field: ${key}`);
		const rendered = replaceTemplates(template, writeContext);
		nextRuntime.fields[key] = validateRenderedFieldValue(field.type, rendered, key);
	}

	const responseContext = renderContext(request, selected.params, nextRuntime);
	const headers = Object.fromEntries(
		Object.entries(selected.action.headers).map(([key, value]) => [key, String(replaceTemplates(value, responseContext))]),
	);
	return {
		success: true,
		action: selected.action,
		runtime: nextRuntime,
		response: {
			statusCode: selected.action.statusCode,
			headers,
			body: replaceTemplates(selected.action.body, responseContext),
			bodyType: selected.action.bodyType,
		},
	};
}
