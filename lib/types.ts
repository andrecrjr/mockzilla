export type HttpMethod =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'PATCH'
	| 'DELETE'
	| 'HEAD'
	| 'OPTIONS';
export type MatchType = 'exact' | 'substring' | 'wildcard';
export type BodyType = 'json' | 'text';

export interface Folder {
	id: string;
	name: string;
	slug: string;
	description?: string;
	isExtension?: boolean;
	meta?: Record<string, unknown>;
	createdAt: string;
	updatedAt?: string;
}

export interface Mock {
	id: string;
	name: string;
	path: string;
	method: HttpMethod;
	response: string;
	statusCode: number;
	folderId: string;
	matchType?: MatchType;
	bodyType?: BodyType;
	enabled?: boolean;
	jsonSchema?: string;
	useDynamicResponse?: boolean;
	echoRequestBody?: boolean;
	createdAt: string;
	updatedAt?: string;
}

export interface CreateMockRequest {
	name: string;
	path: string;
	method: HttpMethod;
	response: string;
	statusCode: number;
	folderId: string;
	matchType?: MatchType;
	bodyType?: BodyType;
	enabled?: boolean;
	jsonSchema?: string;
	useDynamicResponse?: boolean;
	echoRequestBody?: boolean;
}

export interface CreateFolderRequest {
	name: string;
	description?: string;
}

export interface UpdateFolderRequest {
	name: string;
	description?: string;
	meta?: Record<string, unknown>;
}

export interface UpdateMockRequest {
	name: string;
	path: string;
	method: HttpMethod;
	response: string;
	statusCode: number;
	matchType?: MatchType;
	bodyType?: BodyType;
	enabled?: boolean;
	jsonSchema?: string;
	useDynamicResponse?: boolean;
	echoRequestBody?: boolean;
}

export interface ExportData {
	folders: Folder[];
	mocks: Mock[];
	exportedAt: string;
}

export interface LegacyImportFormat {
	groups?: Array<{
		id: string;
		name: string;
		description?: string;
	}>;
	rules?: Array<{
		id: string;
		name: string;
		pattern: string;
		matchType?: MatchType;
		enabled?: boolean;
		bodyType?: BodyType;
		group?: string;
		statusCode: number;
		body: string;
	}>;
}

export type { MatchContext, Condition, Effect } from './engine/match';

export interface Scenario {
	id: string;
	name: string;
	description?: string | null;
	createdAt: string;
	updatedAt?: string;
}

import type { Condition, Effect } from './engine/match';

export interface Transition {
	id: number;
	scenarioId: string;
	name: string;
	description?: string | null;
	path: string;
	method: string;
	conditions: Condition[] | Record<string, unknown>;
	effects: Effect[];
	response: { status: number; body: unknown };
	meta?: Record<string, unknown>;
	createdAt: string;
	updatedAt?: string;
}

export interface WorkflowExportData {
	version: number;
	exportedAt: string;
	scenarios: Scenario[];
	transitions: Transition[];
}
