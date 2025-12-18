import { relations } from 'drizzle-orm';
import {
	boolean,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core';

// Enums
export const httpMethodEnum = pgEnum('http_method', [
	'GET',
	'POST',
	'PUT',
	'PATCH',
	'DELETE',
	'HEAD',
	'OPTIONS',
]);

export const matchTypeEnum = pgEnum('match_type', ['exact', 'substring']);

export const bodyTypeEnum = pgEnum('body_type', ['json', 'text']);

// Tables
export const folders = pgTable('folders', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	description: text('description'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at'),
});

export const mockResponses = pgTable('mock_responses', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	endpoint: text('endpoint').notNull(),
	method: httpMethodEnum('method').notNull().default('GET'),
	statusCode: integer('status_code').notNull().default(200),
	response: text('response').notNull(),
	folderId: uuid('folder_id')
		.notNull()
		.references(() => folders.id, { onDelete: 'cascade' }),
	matchType: matchTypeEnum('match_type').default('exact'),
	bodyType: bodyTypeEnum('body_type').default('json'),
	enabled: boolean('enabled').default(true).notNull(),
	jsonSchema: text('json_schema'),
	useDynamicResponse: boolean('use_dynamic_response').default(false).notNull(),
	echoRequestBody: boolean('echo_request_body').default(false).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at'),
});

// Relations
export const foldersRelations = relations(folders, ({ many }) => ({
	mocks: many(mockResponses),
}));

export const mockResponsesRelations = relations(mockResponses, ({ one }) => ({
	folder: one(folders, {
		fields: [mockResponses.folderId],
		references: [folders.id],
	}),
}));
// Workflow Tables
export const transitions = pgTable('transitions', {
	id: serial('id').primaryKey(),
	scenarioId: text('scenario_id').notNull(),
	name: text('name').notNull(),
	description: text('description'),
	path: text('path').notNull(),
	method: text('method').notNull(),
	conditions: jsonb('conditions').default('{}'),
	effects: jsonb('effects').default('[]'),
	response: jsonb('response').notNull(),
	meta: jsonb('meta').default('{}'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at'),
});

export const scenarioState = pgTable('scenario_state', {
	scenarioId: text('scenario_id').primaryKey(),
	data: jsonb('data').default('{"tables": {}, "state": {}}').notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Scenarios table for explicit scenario management
export const scenarios = pgTable('scenarios', {
	id: text('id').primaryKey(), // slug-based ID
	name: text('name').notNull(),
	description: text('description'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at'),
});

