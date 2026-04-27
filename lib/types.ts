import type { Condition, Effect } from './workflow-types';

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

export interface MockVariant {
	key: string;
	body: string;
	statusCode: number;
	bodyType: string;
}

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
	queryParams?: Record<string, string> | null;
	variants?: MockVariant[] | null;
	wildcardRequireMatch?: boolean;
	jsonSchema?: string;
	useDynamicResponse?: boolean;
	echoRequestBody?: boolean;
	delay?: number;
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
	queryParams?: Record<string, string> | null;
	variants?: MockVariant[] | null;
	wildcardRequireMatch?: boolean;
	jsonSchema?: string;
	useDynamicResponse?: boolean;
	echoRequestBody?: boolean;
	delay?: number;
}

export interface CreateFolderRequest {
	name: string;
	description?: string;
	slug?: string;
}

export interface UpdateFolderRequest {
	name: string;
	description?: string;
	slug?: string;
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
	queryParams?: Record<string, string> | null;
	variants?: MockVariant[] | null;
	wildcardRequireMatch?: boolean;
	jsonSchema?: string;
	useDynamicResponse?: boolean;
	echoRequestBody?: boolean;
	delay?: number;
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

export interface Scenario {
	id: string;
	name: string;
	description?: string | null;
	createdAt: string;
	updatedAt?: string;
}

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

export type { Condition, Effect, MatchContext } from './workflow-types';
