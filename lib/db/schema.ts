import {
	boolean,
	foreignKey,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
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

export const bodyTypeEnum = pgEnum('body_type', ['json', 'text']);

// Tables
export const folders = pgTable('folders', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	description: text('description'),
	meta: jsonb('meta').default({}),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at'),
});

export const mockSubfolders = pgTable(
	'mock_subfolders',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		folderId: uuid('folder_id')
			.notNull()
			.references(() => folders.id, { onDelete: 'cascade' }),
		parentId: uuid('parent_id'),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
		mainPath: text('main_path').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at'),
	},
	(table) => ({
		folderMainPathUnique: uniqueIndex(
			'mock_subfolders_folder_main_path_unique',
		).on(table.folderId, table.mainPath),
		parentReference: foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: 'mock_subfolders_parent_id_mock_subfolders_id_fk',
		}).onDelete('cascade'),
		siblingSlugUnique: uniqueIndex('mock_subfolders_sibling_slug_unique').on(
			table.folderId,
			table.parentId,
			table.slug,
		),
	}),
);

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
	mockFolderId: uuid('mock_folder_id').references(() => mockSubfolders.id, {
		onDelete: 'set null',
	}),
	matchType: text('match_type').default('exact'),
	bodyType: bodyTypeEnum('body_type').default('json'),
	enabled: boolean('enabled').default(true).notNull(),
	queryParams: jsonb('query_params'),
	variants: jsonb('variants'),
	wildcardRequireMatch: boolean('wildcard_require_match').default(false),
	jsonSchema: text('json_schema'),
	useDynamicResponse: boolean('use_dynamic_response').default(false).notNull(),
	echoRequestBody: boolean('echo_request_body').default(false).notNull(),
	delay: integer('delay').default(0).notNull(),
	meta: jsonb('meta').default({}),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at'),
});

// Relations removed to fix TS compilation hang.
// Workflow Tables
export const transitions = pgTable('transitions', {
	id: serial('id').primaryKey(),
	scenarioId: text('scenario_id').notNull(),
	name: text('name').notNull(),
	description: text('description'),
	path: text('path').notNull(),
	method: text('method').notNull(),
	conditions: jsonb('conditions').default({}),
	effects: jsonb('effects').default([]),
	response: jsonb('response').notNull(),
	meta: jsonb('meta').default({}),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at'),
});

export const scenarioState = pgTable('scenario_state', {
	scenarioId: text('scenario_id').primaryKey(),
	data: jsonb('data').default({ tables: {}, state: {} }).notNull(),
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
