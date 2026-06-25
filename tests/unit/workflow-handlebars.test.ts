import { describe, expect, it, mock } from 'bun:test';
import { processWorkflowRequest } from '../../lib/engine/processor';
import type { Transition } from '../../lib/types';

// Mock DB because processor.ts uses it
mock.module('../../lib/db', () => ({
	db: {
		select: () => ({
			from: () => ({
				where: () => ({
					limit: () => Promise.resolve([]),
					execute: () => Promise.resolve([]),
				}),
				execute: () => Promise.resolve([]),
			}),
		}),
		insert: () => ({
			values: () => ({
				onConflictDoUpdate: () => Promise.resolve(),
				execute: () => Promise.resolve(),
			}),
		}),
	},
}));

describe('Workflow Handlebars Interpolation', () => {
	const transition = {
		id: 't1',
		scenarioId: 's1',
		name: 'Test Transition',
		path: '/test',
		method: 'POST',
		response: {
			status: 200,
			body: {
				greet: 'Hello {{#if $.query.name}}{{$.query.name}}{{else}}World{{/if}}!',
				count: '{{state.count}}',
				db_val: '{{#each db.users}}{{this.name}}{{#unless @last}}, {{/unless}}{{/each}}'
			}
		},
		conditions: []
	} as unknown as Transition;

	it('should interpolate using Handlebars in workflow responses', async () => {
		const result = await processWorkflowRequest(
			transition,
			{}, // params
			{}, // body
			{ name: 'Gemini' }, // query
			{} // headers
		);

		expect(result.status).toBe(200);
		const resultBody = result.body as Record<string, unknown>;
		expect(resultBody.greet).toBe('Hello Gemini!');
	});

	it('should handle fallback in #if logic', async () => {
		const result = await processWorkflowRequest(
			transition,
			{}, // params
			{}, // body
			{}, // empty query
			{} // headers
		);

		const resultBody = result.body as Record<string, unknown>;
		expect(resultBody.greet).toBe('Hello World!');
	});
});
