import { z } from 'zod';
import { JourneyActionSchema, JourneyDefinitionSchema } from '@/lib/journeys';

const requestSchema = z.object({
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
	path: z.string().startsWith('/'),
	body: z.unknown().optional(),
	query: z.record(z.string()).optional(),
	headers: z.record(z.string()).optional(),
});

const journeySlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const ManageJourneysArgs = z.discriminatedUnion('action', [
	z.object({ action: z.literal('list') }),
	z.object({ action: z.literal('create'), journey: JourneyDefinitionSchema }),
	z.object({ action: z.literal('get'), slug: journeySlugSchema }),
	z.object({ action: z.literal('update'), slug: journeySlugSchema, name: z.string().min(1), description: z.string().optional() }),
	z.object({ action: z.literal('delete'), slug: journeySlugSchema }),
	z.object({ action: z.literal('list_actions'), slug: journeySlugSchema }),
	z.object({ action: z.literal('create_action'), slug: journeySlugSchema, journeyAction: JourneyActionSchema }),
	z.object({ action: z.literal('update_action'), slug: journeySlugSchema, actionId: z.string().uuid(), journeyAction: JourneyActionSchema }),
	z.object({ action: z.literal('delete_action'), slug: journeySlugSchema, actionId: z.string().uuid() }),
	z.object({ action: z.literal('run'), slug: journeySlugSchema, request: requestSchema }),
	z.object({ action: z.literal('reset'), slug: journeySlugSchema }),
]);
export type ManageJourneysArgs = z.infer<typeof ManageJourneysArgs>;

export const ManageJourneysInputSchema = z.object({
	action: z.enum(['list', 'create', 'get', 'update', 'delete', 'list_actions', 'create_action', 'update_action', 'delete_action', 'run', 'reset']),
	slug: journeySlugSchema.optional(),
	actionId: z.string().uuid().optional(),
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	journey: JourneyDefinitionSchema.optional(),
	journeyAction: JourneyActionSchema.optional(),
	request: requestSchema.optional(),
});
export type ManageJourneysInputSchema = z.infer<typeof ManageJourneysInputSchema>;
