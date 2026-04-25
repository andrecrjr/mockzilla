import { eq } from 'drizzle-orm';
import type { Transition } from '@/lib/types';
import type { MatchContext } from '../workflow-types';
import { db } from '../db';
import { scenarioState } from '../db/schema';
import { applyEffects } from './effects';
import { replaceTemplates } from './interpolation';
import { type ConditionTrace, matches } from './match';
import { type Logger, logger } from '../logger';

export async function processWorkflowRequest(
	transition: Transition,
	params: Record<string, string>,
	body: unknown,
	query: unknown,
	headers: Record<string, string> = {},
	trace?: ConditionTrace[],
	log: Logger = logger,
): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
	const scenarioId = transition.scenarioId;
	log.debug({ scenarioId, transitionId: transition.id }, 'Processing workflow request');

	// 1. Load State
	const stateRow = await db
		.select()
		.from(scenarioState)
		.where(eq(scenarioState.scenarioId, scenarioId));

	const scenarioData: MatchContext = {
		state: {},
		tables: {},
		input: { body, query, params, headers },
	};

	if (stateRow.length > 0) {
		const savedData = stateRow[0].data as {
			state?: Record<string, unknown>;
			tables?: Record<string, unknown[]>;
		};
		scenarioData.state = savedData.state || {};
		scenarioData.tables = savedData.tables || {};
		log.debug('Loaded existing scenario state');
	} else {
		// Initialize if not exists
		log.debug('Initializing new scenario state');
		await db.insert(scenarioState).values({
			scenarioId,
			data: { state: {}, tables: {} },
		});
	}

	// 2. Check Conditions
	if (transition.conditions) {
		const conditions = transition.conditions;
		log.debug('Evaluating transition conditions');
		if (!matches(conditions, scenarioData, trace)) {
			log.warn('Transition conditions not met');
			return {
				status: 400,
				headers: {},
				body: { error: 'Transition conditions not met', details: conditions, trace },
			};
		}
		log.debug('Transition conditions passed');
	}

	// 3. Apply Effects
	if (transition.effects) {
		log.debug({ effectCount: transition.effects.length }, 'Applying effects');
		applyEffects(transition.effects, scenarioData);
	}

	// 4. Save State
	log.debug('Saving scenario state');
	await db
		.insert(scenarioState)
		.values({
			scenarioId,
			data: { state: scenarioData.state, tables: scenarioData.tables },
		})
		.onConflictDoUpdate({
			target: scenarioState.scenarioId,
			set: {
				data: { state: scenarioData.state, tables: scenarioData.tables },
				updatedAt: new Date(),
			},
		});

	// 5. Return Response
	const responseConfig = transition.response as {
		status: number;
		headers?: Record<string, string>;
		body: unknown;
	};

	log.info({ status: responseConfig.status }, 'Workflow response generated');

	const { faker } = await import('@faker-js/faker');

	// Enrich context for Handlebars/Interpolation
	const context = {
		...scenarioData,
		// Support shortcuts for Handlebars
		query,
		params,
		headers,
		body,
		db: scenarioData.tables, // Support db alias
		// Support $. aliases
		$: {
			query,
			params,
			headers,
			body,
		},
		faker,
	};

	return {
		status: responseConfig.status || 200,
		headers: responseConfig.headers || { 'Content-Type': 'application/json' },
		body: replaceTemplates(responseConfig.body, context) || {},
	};
}
