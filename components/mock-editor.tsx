'use client';

import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ResponseConfig } from '@/components/mock-response-config';
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
import type { Folder, HttpMethod, MatchType, MockVariant } from '@/lib/types';

type MockFormValues = {
	name: string;
	path: string;
	method: HttpMethod;
	statusCode: string;
	folderId?: string;
	response: string;
	matchType?: MatchType;
	queryParams?: Record<string, string> | null;
	jsonSchema?: string;
	useDynamicResponse?: boolean;
	echoRequestBody?: boolean;
	delay?: string;
	variants?: MockVariant[] | null;
	wildcardRequireMatch?: boolean;
};

interface MockEditorProps {
	mode: 'create' | 'edit';
	folders?: Folder[];
	defaultFolderId?: string;
	initial?: Partial<MockFormValues>;
	showFolderSelect?: boolean;
	submitLabel?: string;
	previewSlug?: string;
	isSubmitting?: boolean;
	onCancel?: () => void;
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

export function MockEditor({
	mode,
	folders = [],
	defaultFolderId,
	initial,
	showFolderSelect,
	submitLabel,
	previewSlug,
	isSubmitting,
	onCancel,
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
	const [delay, setDelay] = useState<string>(initial?.delay ? String(initial.delay) : '0');

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
	const [queryParams, setQueryParams] = useState<
		{ key: string; value: string }[]
	>(() => {
		const qp = initial?.queryParams as
			| Record<string, string>
			| null
			| undefined;
		if (!qp) return [];
		return Object.entries(qp).map(([key, value]) => ({ key, value }));
	});
	const [variants, setVariants] = useState<MockVariant[]>(
		(initial?.variants as MockVariant[] | null | undefined) ?? [],
	);
	const [wildcardRequireMatch, setWildcardRequireMatch] = useState<boolean>(
		Boolean(initial?.wildcardRequireMatch),
	);
	const hydratedRef = useRef<boolean>(false);

	useEffect(() => {
		const hasInitial = Boolean(initial);
		if (mode === 'edit' && hasInitial && !hydratedRef.current) {
			setName(initial?.name ?? '');
			setPath(initial?.path ?? '');
			setMethod((initial?.method ?? 'GET') as HttpMethod);
			setStatusCode(String(initial?.statusCode ?? '200'));
			setFolderId(initial?.folderId ?? defaultFolderId ?? '');
			setResponse(initial?.response ?? '');
			setJsonSchema(initial?.jsonSchema ?? '');
			setUseDynamicResponse(Boolean(initial?.useDynamicResponse));
			setEchoRequestBody(Boolean(initial?.echoRequestBody));
			setDelay(initial?.delay ? String(initial.delay) : '0');
			setMatchType((initial?.matchType as MatchType) ?? 'exact');
			const qp = initial?.queryParams as
				| Record<string, string>
				| null
				| undefined;
			setQueryParams(
				qp ? Object.entries(qp).map(([key, value]) => ({ key, value })) : [],
			);
			setVariants(
				(initial?.variants as MockVariant[] | null | undefined) ?? [],
			);
			setWildcardRequireMatch(Boolean(initial?.wildcardRequireMatch));
			setActiveTab(initial?.jsonSchema ? 'schema' : 'manual');
			hydratedRef.current = true;
		}
	}, [initial, mode, defaultFolderId]);

	useEffect(() => {
		if (mode !== 'edit' || !initial) return;
		setMethod((initial.method ?? method) as HttpMethod);
		setStatusCode(String(initial.statusCode ?? statusCode));
	}, [initial, mode, method, statusCode]);

	const origin = typeof window !== 'undefined' ? window.location.origin : '';
	const selectedFolder = useMemo(() => {
		return folders.find((f) => f.id === (folderId || defaultFolderId || ''));
	}, [folders, folderId, defaultFolderId]);

	const previewUrl = useMemo(() => {
		const baseSlug = previewSlug ?? selectedFolder?.slug;
		if (!baseSlug) return null;
		if (!path.startsWith('/') || path.length <= 1) return null;
		return `${origin}/api/mock/${baseSlug}${path}`;
	}, [origin, previewSlug, selectedFolder?.slug, path]);

	const showFolder =
		showFolderSelect ?? (mode === 'create' && !defaultFolderId);
	const submitText =
		submitLabel ??
		(mode === 'create' ? 'Create Mock Endpoint' : 'Save Changes');

	const validateBeforeSubmit = (): boolean => {
		if (showFolder && !folderId) {
			toast.error('Error', { description: 'Please select a folder' });
			return false;
		}
		if (!path.startsWith('/')) {
			toast.error('Error', { description: 'Path must start with /' });
			return false;
		}
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
		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateBeforeSubmit()) return;

		const values: MockFormValues = {
			name,
			path,
			method,
			statusCode,
			folderId: folderId || defaultFolderId,
			response,
			matchType,
			queryParams:
				queryParams.length > 0
					? Object.fromEntries(queryParams.map((p) => [p.key, p.value]))
					: null,
			jsonSchema,
			useDynamicResponse,
			echoRequestBody,
			delay,
			variants: variants.length > 0 ? variants : null,
			wildcardRequireMatch,
		};
		await onSubmit({ ...values, statusCode: values.statusCode, delay: String(Number.parseInt(delay || '0', 10)) });
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
								step="100"
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
								placeholder="/users"
								required
							/>
							{previewUrl && (
								<p className="text-xs text-muted-foreground font-mono">
									Preview:{' '}
									<span className="text-foreground wrap-break-word">
										{previewUrl}
									</span>
								</p>
							)}
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
