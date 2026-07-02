'use client';

import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
	ResponseConfig,
	type QueryParamField,
} from '@/components/mock-response-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
import { validateSchema } from '@/lib/schema-generator';
import type {
	Folder,
	HttpMethod,
	MatchType,
	MockSubfolder,
	MockVariant,
} from '@/lib/types';
import { joinMockPaths, splitPathSearchParams } from '@/lib/utils/mock-paths';

type MockFormValues = {
	name: string;
	path: string;
	method: HttpMethod;
	statusCode: string;
	folderId?: string;
	mockFolderId?: string | null;
	response: string;
	matchType?: MatchType;
	queryParams?: Record<string, string> | null;
	jsonSchema?: string;
	useDynamicResponse?: boolean;
	echoRequestBody?: boolean;
	delay?: string;
	variants?: MockVariant[] | null;
	wildcardRequireMatch?: boolean;
	meta?: Record<string, unknown>;
};

interface MockEditorProps {
	mode: 'create' | 'edit';
	folders?: Folder[];
	mockSubfolders?: MockSubfolder[];
	defaultFolderId?: string;
	defaultMockFolderId?: string | null;
	initial?: Partial<MockFormValues>;
	initialRevision?: string;
	showFolderSelect?: boolean;
	submitLabel?: string;
	previewSlug?: string;
	isSubmitting?: boolean;
	onCancel?: () => void;
	onDuplicate?: () => void;
	onSubmit: (values: MockFormValues) => Promise<void>;
}

const HTTP_METHODS: HttpMethod[] = [
	'GET',
	'POST',
	'PUT',
	'PATCH',
	'DELETE',
	'HEAD',
	'OPTIONS',
];

const ECHO_REQUEST_BODY_METHODS: HttpMethod[] = ['POST', 'PUT', 'PATCH'];

const STATUS_CODES = [
	{ value: '200', label: '200 - OK' },
	{ value: '201', label: '201 - Created' },
	{ value: '202', label: '202 - Accepted' },
	{ value: '204', label: '204 - No Content' },
	{ value: '400', label: '400 - Bad Request' },
	{ value: '401', label: '401 - Unauthorized' },
	{ value: '403', label: '403 - Forbidden' },
	{ value: '404', label: '404 - Not Found' },
	{ value: '405', label: '405 - Method Not Allowed' },
	{ value: '409', label: '409 - Conflict' },
	{ value: '422', label: '422 - Unprocessable Entity' },
	{ value: '500', label: '500 - Internal Server Error' },
	{ value: '502', label: '502 - Bad Gateway' },
	{ value: '503', label: '503 - Service Unavailable' },
];

const createQueryParamField = (
	key: string,
	value: string,
	index: number,
): QueryParamField => ({
	id: `query-param-initial-${index}`,
	key,
	value,
});

const createQueryParamId = () => {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return `query-param-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

function mergeQueryParamFields(
	current: QueryParamField[],
	incoming: Record<string, string>,
): QueryParamField[] {
	const next = current.map((param) => ({ ...param }));
	const indexByKey = new Map<string, number>();

	next.forEach((param, index) => {
		const key = param.key.trim();
		if (key) indexByKey.set(key, index);
	});

	for (const [key, value] of Object.entries(incoming)) {
		const trimmedKey = key.trim();
		if (!trimmedKey) continue;
		const existingIndex = indexByKey.get(trimmedKey);
		if (existingIndex === undefined) {
			indexByKey.set(trimmedKey, next.length);
			next.push({ id: createQueryParamId(), key: trimmedKey, value });
		} else {
			next[existingIndex] = {
				...next[existingIndex],
				key: trimmedKey,
				value,
			};
		}
	}

	return next;
}

function getEndpointInputParts(value: string) {
	const trimmed = value.trim();
	if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
		try {
			const url = new URL(trimmed);
			return splitPathSearchParams(`${url.pathname}${url.search}`);
		} catch {
			return splitPathSearchParams(value);
		}
	}
	return splitPathSearchParams(value);
}

export function MockEditor({
	mode,
	folders = [],
	mockSubfolders = [],
	defaultFolderId,
	defaultMockFolderId = null,
	initial,
	initialRevision,
	showFolderSelect,
	submitLabel,
	previewSlug,
	isSubmitting,
	onCancel,
	onDuplicate,
	onSubmit,
}: MockEditorProps) {
	const [name, setName] = useState(initial?.name ?? '');
	const [path, setPath] = useState(initial?.path ?? '');
	const [method, setMethod] = useState<HttpMethod>(initial?.method ?? 'GET');
	const [statusCode, setStatusCode] = useState<string>(
		initial?.statusCode ?? '200',
	);
	const [folderId, setFolderId] = useState<string>(
		initial?.folderId ?? defaultFolderId ?? '',
	);
	const [mockFolderId, setMockFolderId] = useState<string>(
		initial?.mockFolderId ?? defaultMockFolderId ?? 'root',
	);
	const [delay, setDelay] = useState<string>(
		initial?.delay ? String(initial.delay) : '0',
	);
	const [proxyTargetUrl, setProxyTargetUrl] = useState<string>(
		(initial?.meta as { proxyTargetUrl?: string } | null)?.proxyTargetUrl ?? '',
	);

	const [activeTab, setActiveTab] = useState<'manual' | 'schema' | 'advanced'>(
		initial?.jsonSchema ? 'schema' : 'manual',
	);
	const [response, setResponse] = useState(initial?.response ?? '');
	const [jsonSchema, setJsonSchema] = useState(initial?.jsonSchema ?? '');
	const [useDynamicResponse, setUseDynamicResponse] = useState<boolean>(
		Boolean(initial?.useDynamicResponse),
	);
	const [echoRequestBody, setEchoRequestBody] = useState<boolean>(
		Boolean(initial?.echoRequestBody),
	);
	const [matchType, setMatchType] = useState<MatchType>(
		(initial?.matchType as MatchType) ?? 'exact',
	);
	const [queryParams, setQueryParams] = useState<QueryParamField[]>(() => {
		const qp = initial?.queryParams as
			| Record<string, string>
			| null
			| undefined;
		if (!qp) return [];
		return Object.entries(qp).map(([key, value], index) =>
			createQueryParamField(key, value, index),
		);
	});
	const [variants, setVariants] = useState<MockVariant[]>(
		(initial?.variants as MockVariant[] | null | undefined) ?? [],
	);
	const [wildcardRequireMatch, setWildcardRequireMatch] = useState<boolean>(
		Boolean(initial?.wildcardRequireMatch),
	);
	const hydratedRevisionRef = useRef<string | null>(null);
	const hasHydratedInitialRef = useRef(false);

	useEffect(() => {
		if (mode !== 'edit' || !initial) return;
		if (initialRevision) {
			if (hydratedRevisionRef.current === initialRevision) return;
			hydratedRevisionRef.current = initialRevision;
		} else if (hasHydratedInitialRef.current) {
			return;
		}

		hasHydratedInitialRef.current = true;
		setName(initial.name ?? '');
		setPath(initial.path ?? '');
		setMethod((initial.method ?? 'GET') as HttpMethod);
		setStatusCode(String(initial.statusCode ?? '200'));
		setFolderId(initial.folderId ?? defaultFolderId ?? '');
		setMockFolderId(initial.mockFolderId ?? defaultMockFolderId ?? 'root');
		setResponse(initial.response ?? '');
		setJsonSchema(initial.jsonSchema ?? '');
		setUseDynamicResponse(Boolean(initial.useDynamicResponse));
		setEchoRequestBody(Boolean(initial.echoRequestBody));
		setDelay(initial.delay ? String(initial.delay) : '0');
		setProxyTargetUrl(
			(initial.meta as { proxyTargetUrl?: string } | null)?.proxyTargetUrl ??
				'',
		);
		setMatchType((initial.matchType as MatchType) ?? 'exact');
		const qp = initial.queryParams as Record<string, string> | null | undefined;
		setQueryParams(
			qp
				? Object.entries(qp).map(([key, value], index) =>
						createQueryParamField(key, value, index),
					)
				: [],
		);
		setVariants((initial.variants as MockVariant[] | null | undefined) ?? []);
		setWildcardRequireMatch(Boolean(initial.wildcardRequireMatch));
		setActiveTab(initial.jsonSchema ? 'schema' : 'manual');
	}, [initial, initialRevision, mode, defaultFolderId, defaultMockFolderId]);

	const origin = typeof window !== 'undefined' ? window.location.origin : '';
	const selectedFolder = useMemo(() => {
		return folders.find((f) => f.id === (folderId || defaultFolderId || ''));
	}, [folders, folderId, defaultFolderId]);
	const selectedMockSubfolder = useMemo(() => {
		if (!mockFolderId || mockFolderId === 'root') return null;
		return (
			mockSubfolders.find((subfolder) => subfolder.id === mockFolderId) ?? null
		);
	}, [mockSubfolders, mockFolderId]);

	const previewUrl = useMemo(() => {
		const baseSlug = previewSlug ?? selectedFolder?.slug;
		if (!baseSlug) return null;
		if (!path.startsWith('/') || path.length <= 1) return null;
		const effectivePath = joinMockPaths(
			selectedMockSubfolder?.mainPath ?? '/',
			path,
		);
		return `${origin}/api/mock/${baseSlug}${effectivePath}`;
	}, [
		origin,
		previewSlug,
		selectedFolder?.slug,
		selectedMockSubfolder?.mainPath,
		path,
	]);

	const showFolder =
		showFolderSelect ?? (mode === 'create' && !defaultFolderId);
	const submitText =
		submitLabel ??
		(mode === 'create' ? 'Create Mock Endpoint' : 'Save Changes');

	const buildQueryParams = (): Record<string, string> | null => {
		return buildQueryParamsFromFields(queryParams);
	};

	const buildQueryParamsFromFields = (
		fields: QueryParamField[],
	): Record<string, string> | null => {
		const entries = fields
			.map((param) => [param.key.trim(), param.value] as const)
			.filter(([key]) => key.length > 0);
		return entries.length > 0 ? Object.fromEntries(entries) : null;
	};

	const buildQueryParamsString = (): string => {
		const qp = buildQueryParams();
		if (!qp) return '';
		const params = new URLSearchParams(qp);
		const serialized = params.toString();
		return serialized ? `?${serialized}` : '';
	};
	const isEchoRequestBodyEnabled =
		ECHO_REQUEST_BODY_METHODS.includes(method) && echoRequestBody;

	const extractPathQueryParams = () => {
		if (!path.includes('?')) return;
		const parsed = getEndpointInputParts(path);
		setPath(parsed.path);
		if (Object.keys(parsed.queryParams).length > 0) {
			setQueryParams((current) =>
				mergeQueryParamFields(current, parsed.queryParams),
			);
			setActiveTab('advanced');
		}
	};

	const handlePathPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
		const pasted = event.clipboardData.getData('text');
		if (!pasted.includes('?')) return;

		event.preventDefault();
		const parsed = getEndpointInputParts(pasted);
		setPath(parsed.path);
		if (Object.keys(parsed.queryParams).length > 0) {
			setQueryParams((current) =>
				mergeQueryParamFields(current, parsed.queryParams),
			);
			setActiveTab('advanced');
		}
	};

	const validateBeforeSubmit = (pathToValidate = path): boolean => {
		if (showFolder && !folderId) {
			toast.error('Error', { description: 'Please select a folder' });
			return false;
		}
		if (!pathToValidate.startsWith('/')) {
			toast.error('Error', { description: 'Path must start with /' });
			return false;
		}
		if (!isEchoRequestBodyEnabled) {
			try {
				if (useDynamicResponse) {
					const validation = validateSchema(jsonSchema);
					if (!validation.valid) {
						throw new Error(validation.error || 'Invalid JSON Schema');
					}
					JSON.parse(jsonSchema);
				} else {
					JSON.parse(response);
				}
			} catch {
				toast.error('Error', { description: 'Please provide valid JSON' });
				return false;
			}
		}
		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const parsedPath = path.includes('?') ? getEndpointInputParts(path) : null;
		const submitQueryParams = parsedPath
			? mergeQueryParamFields(queryParams, parsedPath.queryParams)
			: queryParams;
		const submitPath = parsedPath?.path ?? path;
		if (!validateBeforeSubmit(submitPath)) return;

		let formattedPath = submitPath.trim();
		if (formattedPath.length > 1 && formattedPath.endsWith('/')) {
			formattedPath = formattedPath.slice(0, -1);
		}

		const values: MockFormValues = {
			name,
			path: formattedPath,
			method,
			statusCode,
			folderId: folderId || defaultFolderId,
			mockFolderId: mockFolderId === 'root' ? null : mockFolderId,
			response,
			matchType,
			queryParams: buildQueryParamsFromFields(submitQueryParams),
			jsonSchema,
			useDynamicResponse,
			echoRequestBody: isEchoRequestBodyEnabled,
			delay,
			meta: {
				...initial?.meta,
				proxyTargetUrl: proxyTargetUrl.trim() || undefined,
			},
			variants: variants.length > 0 ? variants : null,
			wildcardRequireMatch,
		};
		await onSubmit({
			...values,
			statusCode: values.statusCode,
			delay: String(Number.parseInt(delay || '0', 10)),
		});
	};

	return (
		<TooltipProvider delayDuration={300}>
			<form onSubmit={handleSubmit}>
				<div className="grid gap-6 py-4 lg:grid-cols-5">
					{/* Left Column - Basic Fields */}
					<div className="space-y-4 col-span-2">
						{showFolder && (
							<div className="space-y-2">
								<Label htmlFor="create-folder">Folder</Label>
								<Select value={folderId} onValueChange={setFolderId}>
									<SelectTrigger id="create-folder">
										<SelectValue placeholder="Select a folder" />
									</SelectTrigger>
									<SelectContent>
										{folders.map((folder) => (
											<SelectItem key={folder.id} value={folder.id}>
												{folder.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						{mockSubfolders.length > 0 && (
							<div className="space-y-2">
								<Label htmlFor="create-mock-subfolder">Mock Subfolder</Label>
								<Select
									value={mockFolderId || 'root'}
									onValueChange={setMockFolderId}
								>
									<SelectTrigger id="create-mock-subfolder">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="root">Root</SelectItem>
										{mockSubfolders.map((subfolder) => (
											<SelectItem key={subfolder.id} value={subfolder.id}>
												{subfolder.name} ({subfolder.mainPath})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="create-name">Mock Name</Label>
							<Input
								id="create-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g., User List API"
								required
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="create-method">HTTP Method</Label>
								<Select
									value={method}
									onValueChange={(value) => setMethod(value as HttpMethod)}
								>
									<SelectTrigger id="create-method">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{HTTP_METHODS.map((m) => (
											<SelectItem key={m} value={m}>
												{m}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="create-status">Status Code</Label>
								<Select value={statusCode} onValueChange={setStatusCode}>
									<SelectTrigger id="create-status">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{STATUS_CODES.map((code) => (
											<SelectItem key={code.value} value={code.value}>
												{code.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="create-delay">Response Delay (ms)</Label>
							<Input
								id="create-delay"
								type="number"
								min="0"
								step="1"
								value={delay}
								onChange={(e) => setDelay(e.target.value)}
								placeholder="e.g., 500"
							/>
							<p className="text-[10px] text-muted-foreground">
								Simulate network latency/throttling in milliseconds.
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="create-path">Endpoint Path</Label>
							<Input
								id="create-path"
								value={path}
								onChange={(e) => setPath(e.target.value)}
								onBlur={extractPathQueryParams}
								onPaste={handlePathPaste}
								placeholder="/users"
								required
							/>
							{previewUrl && (
								<p className="text-xs text-muted-foreground font-mono">
									Preview:{' '}
									<span className="text-foreground wrap-break-word">
										{previewUrl}
										{buildQueryParamsString()}
									</span>
								</p>
							)}
						</div>

						<div className="space-y-2 pt-4 border-t border-border/50">
							<Label htmlFor="create-proxy">Proxy Target URL (Optional)</Label>
							<Input
								id="create-proxy"
								value={proxyTargetUrl}
								onChange={(e) => setProxyTargetUrl(e.target.value)}
								placeholder="e.g., https://api.example.com/v1/users"
								className="font-mono text-sm"
							/>
							<p className="text-[10px] text-muted-foreground">
								If set, Mockzilla will proxy directly to this full URL
								(preserving query params).
							</p>
						</div>
					</div>

					{/* Right Column - Response Config with Tabs */}
					<div className="space-y-6 col-span-3">
						<ResponseConfig
							method={method}
							echoRequestBody={echoRequestBody}
							onEchoRequestBodyChange={setEchoRequestBody}
							response={response}
							onResponseChange={setResponse}
							jsonSchema={jsonSchema}
							onJsonSchemaChange={setJsonSchema}
							useDynamicResponse={useDynamicResponse}
							onUseDynamicResponseChange={setUseDynamicResponse}
							activeTab={activeTab}
							onActiveTabChange={(newTab) => {
								setActiveTab(newTab);
							}}
							// Advanced Options props
							matchType={matchType}
							onMatchTypeChange={(newMatchType) => {
								setMatchType(newMatchType);
								if (newMatchType === 'wildcard') {
									setActiveTab('advanced'); // Switch to advanced tab when wildcard selected
								}
							}}
							queryParams={queryParams}
							onQueryParamsChange={(newParams) => setQueryParams(newParams)}
							// MockVariantManager props
							variants={variants}
							onVariantsChange={setVariants}
							requireMatch={wildcardRequireMatch}
							onRequireMatchChange={setWildcardRequireMatch}
							endpoint={path}
						/>
					</div>
				</div>

				<div className="flex justify-end gap-2 pt-4 border-t border-border">
					{onCancel && (
						<Button type="button" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
					)}
					{onDuplicate && (
						<Button type="button" variant="outline" onClick={onDuplicate}>
							Duplicate
						</Button>
					)}
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting
							? mode === 'create'
								? 'Creating...'
								: 'Saving...'
							: submitText}
					</Button>
				</div>
			</form>
		</TooltipProvider>
	);
}
