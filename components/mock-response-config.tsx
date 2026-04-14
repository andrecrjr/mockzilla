'use client';

import { ChevronDown, ChevronRight, ExternalLink as ExternalLinkIcon, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
	generateFromSchemaString,
	validateSchema,
} from '@/lib/schema-generator';
import type { HttpMethod, MatchType, MockVariant } from '@/lib/types';
import { FieldTooltip } from '@/components/folder-tooltips';
import { MockVariantManager } from '@/components/mock-variant-manager';
import Link from 'next/link';

type CollapsibleSectionProps = {
	title: string;
	tooltip?: {
		label: string;
		description: string;
		example: string;
		docsLink: string;
	};
	isExpanded: boolean;
	onToggle: () => void;
	children: React.ReactNode;
};

function CollapsibleSection({
	title,
	tooltip,
	isExpanded,
	onToggle,
	children,
}: CollapsibleSectionProps) {
	return (
		<div className="rounded-lg border border-border bg-card">
			<button
				type="button"
				onClick={onToggle}
				className="flex w-full items-center justify-between gap-2 p-4 text-left hover:bg-muted/50 transition-colors"
			>
				<div className="flex items-center gap-2">
					<span className="text-base font-semibold">{title}</span>
					{tooltip && (
						<FieldTooltip
							label={tooltip.label}
							description={tooltip.description}
							example={tooltip.example}
							docsLink={tooltip.docsLink}
						/>
					)}
				</div>
				{isExpanded ? (
					<ChevronDown className="h-4 w-4 text-muted-foreground" />
				) : (
					<ChevronRight className="h-4 w-4 text-muted-foreground" />
				)}
			</button>
			{isExpanded && (
				<div className="border-t border-border p-4">
					{children}
				</div>
			)}
		</div>
	);
}

type ResponseConfigProps = {
	method: HttpMethod;
	echoRequestBody: boolean;
	onEchoRequestBodyChange: (value: boolean) => void;
	response: string;
	onResponseChange: (value: string) => void;
	jsonSchema: string;
	onJsonSchemaChange: (value: string) => void;
	useDynamicResponse: boolean;
	onUseDynamicResponseChange: (value: boolean) => void;
	activeTab: 'manual' | 'schema' | 'advanced';
	onActiveTabChange: (value: 'manual' | 'schema' | 'advanced') => void;
	// Advanced Options props
	matchType: MatchType;
	onMatchTypeChange: (value: MatchType) => void;
	queryParams: { key: string; value: string }[];
	onQueryParamsChange: (params: { key: string; value: string }[]) => void;
	// MockVariantManager props
	variants: MockVariant[];
	onVariantsChange: (variants: MockVariant[]) => void;
	requireMatch: boolean;
	onRequireMatchChange: (value: boolean) => void;
	endpoint?: string;
};

export function ResponseConfig({
	method,
	echoRequestBody,
	onEchoRequestBodyChange,
	response,
	onResponseChange,
	jsonSchema,
	onJsonSchemaChange,
	useDynamicResponse,
	onUseDynamicResponseChange,
	activeTab,
	onActiveTabChange,
	// Advanced Options props
	matchType,
	onMatchTypeChange,
	queryParams,
	onQueryParamsChange,
	// MockVariantManager props
	variants,
	onVariantsChange,
	requireMatch,
	onRequireMatchChange,
	endpoint,
}: ResponseConfigProps) {
	const previewJson = useRef<HTMLTextAreaElement>(null);

	// Collapsible section states
	const [queryExpanded, setQueryExpanded] = useState(queryParams.length > 0);
	const [matchExpanded, setMatchExpanded] = useState(matchType !== 'exact');
	const [variantsExpanded, setVariantsExpanded] = useState(variants.length > 0);

	// Auto-expand when content is added
	useEffect(() => {
		if (queryParams.length > 0) setQueryExpanded(true);
	}, [queryParams.length]);

	useEffect(() => {
		if (matchType !== 'exact') setMatchExpanded(true);
	}, [matchType]);

	useEffect(() => {
		if (variants.length > 0) setVariantsExpanded(true);
	}, [variants.length]);

	const handleGenerateFromSchema = () => {
		const schemaString = jsonSchema.trim();
		if (!schemaString) {
			toast.error('Schema Required', {
				description: 'Paste a JSON Schema to generate',
			});
			return;
		}
		const validation = validateSchema(schemaString);
		if (!validation.valid) {
			toast.error('Invalid Schema', {
				description: validation.error || 'Schema is invalid',
			});
			return;
		}
		try {
			const generated = generateFromSchemaString(schemaString);
			if (previewJson.current) {
				previewJson.current.value = generated;
			}
			toast.success('Generated', {
				description: 'Sample JSON generated from schema',
			});
		} catch (error) {
			toast.error('Generation Failed', {
				description:
					error instanceof Error
						? error.message
						: 'Could not generate from schema',
			});
		}
	};

	const isEchoMethod = ['POST', 'PUT', 'PATCH'].includes(method);

	// Query Params helpers
	const addParam = () => {
		onQueryParamsChange([...queryParams, { key: '', value: '' }]);
	};

	const removeParam = (index: number) => {
		onQueryParamsChange(queryParams.filter((_, i) => i !== index));
	};

	const updateParam = (
		index: number,
		field: 'key' | 'value',
		value: string,
	) => {
		const updated = [...queryParams];
		updated[index] = { ...updated[index], [field]: value };
		onQueryParamsChange(updated);
	};

	// Match Type constants
	const MATCH_TYPES: MatchType[] = ['exact', 'wildcard', 'substring'];
	const MATCH_TYPE_DESCRIPTIONS: Record<MatchType, string> = {
		exact: 'Path must match exactly',
		wildcard: 'Use * as wildcard (e.g., /users/*)',
		substring: 'Path contains the endpoint',
	};

	return (
		<div className="space-y-4">
				{isEchoMethod && (
					<div className="flex items-center space-x-2 p-4 border border-border rounded-lg bg-card">
						<Switch
							checked={echoRequestBody}
							onCheckedChange={onEchoRequestBodyChange}
						/>
						<div className="space-y-0.5">
							<div className="flex items-center gap-2">
								<Label
									className="cursor-pointer font-medium"
									onClick={() => onEchoRequestBodyChange(!echoRequestBody)}
								>
									Echo Request Body
								</Label>
								<FieldTooltip
									label="Echo Request Body"
									description="Returns the exact request body as the response. Useful for testing POST/PUT endpoints where you want to verify what was sent."
									example='POST {"name":"Alice"} → Response {"name":"Alice"}'
									docsLink="/docs#overview"
								/>
							</div>
							<p className="text-xs text-muted-foreground">
								The response will be exactly what was sent in the request body.
							</p>
						</div>
					</div>
				)}

				<div
					className={
						echoRequestBody
							? 'opacity-40 pointer-events-none select-none transition-opacity'
							: 'transition-opacity'
					}
				>
					<Tabs
						value={activeTab}
						onValueChange={(v) => onActiveTabChange(v as 'manual' | 'schema' | 'advanced')}
					>
						<TabsList className="w-full">
							<TabsTrigger value="manual" className="flex-1">
								Manual JSON
							</TabsTrigger>
							<TabsTrigger value="schema" className="flex-1">
								From Schema
							</TabsTrigger>
							<TabsTrigger value="advanced" className="flex-1">
								Advanced Options
							</TabsTrigger>
						</TabsList>

						<TabsContent value="manual" className="space-y-2">
							<div className="flex items-center gap-2 mt-4">
								<Label htmlFor="create-json">JSON Response</Label>
								<FieldTooltip
									label="Manual JSON"
									description="Enter a static JSON response that will be returned for every request matching this endpoint."
									example='{"message": "Hello World", "status": "success"}'
									docsLink="/docs#overview"
								/>
							</div>
							<Textarea
								id="create-json"
								value={response}
								onChange={(e) => onResponseChange(e.target.value)}
								placeholder='{"message": "Hello World"}'
								className="font-mono text-sm h-[500px]"
								required={activeTab === 'manual'}
							/>
						</TabsContent>

						<TabsContent value="schema" className="space-y-4">
							<div className="flex items-center gap-2 mt-4">
								<Label htmlFor="schema">JSON Schema</Label>
								<FieldTooltip
									label="From Schema"
									description="Paste a JSON Schema to auto-generate mock data. Enable 'Dynamic Response' to get new random data on each request. Supports Faker.js formats and string interpolation."
									example='{"type": "object", "properties": {"name": {"type": "string", "faker": "person.fullName"}}}'
									docsLink="/docs#syntax"
								/>
							</div>
							<Textarea
								id="schema"
								value={jsonSchema}
								onChange={(e) => onJsonSchemaChange(e.target.value)}
								className="font-mono text-sm h-[300px]"
								placeholder="Paste JSON Schema here..."
								required={activeTab === 'schema'}
							/>

							<div className="flex items-center space-x-2">
								<Switch
									checked={useDynamicResponse}
									onCheckedChange={onUseDynamicResponseChange}
								/>
								<div className="flex items-center gap-2">
									<Label
										className="cursor-pointer"
										onClick={() => onUseDynamicResponseChange(!useDynamicResponse)}
									>
										Dynamic Response
									</Label>
									<FieldTooltip
										label="Dynamic Response"
										description="Generates fresh random data on each request using JSON Schema + Faker. Supports string interpolation with {$.field} syntax to reference other generated fields."
										example='{"summary": {"const": "Order {$.orderId} confirmed"}}'
										docsLink="/docs#syntax"
									/>
								</div>
							</div>

							<p className="text-xs text-muted-foreground">
								{useDynamicResponse
									? 'New random data will be generated on each request'
									: 'Schema will be used to generate a static response'}
							</p>

							<Button
								type="button"
								variant="secondary"
								onClick={handleGenerateFromSchema}
							>
								Generate JSON Preview
							</Button>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label htmlFor="preview-json">Generated Preview</Label>
									<Link
										href="/docs#syntax"
										className="flex items-center gap-1 text-xs text-primary hover:underline"
										target="_blank"
									>
										Learn more <ExternalLinkIcon className="h-3 w-3" />
									</Link>
								</div>
								<Textarea
									ref={previewJson}
									id="preview-json"
									className="font-mono text-sm h-[200px]"
									placeholder="Generated JSON will appear here..."
									readOnly
								/>
							</div>
						</TabsContent>

						<TabsContent value="advanced" className="space-y-4">
							{/* Query Parameters Section */}
							<CollapsibleSection
								title="Query Parameters"
								tooltip={{
									label: "Required Query Params",
									description: "Mock will only match if ALL specified query params are present with matching values. Leave empty to match regardless of query string.",
									example: "?page=1&limit=10",
									docsLink: "/docs#overview",
								}}
								isExpanded={queryExpanded}
								onToggle={() => setQueryExpanded(!queryExpanded)}
							>
								<div className="space-y-3">
									{queryParams.length === 0 ? (
										<p className="text-sm text-muted-foreground">
											No query parameters required. Mock will match any request to this endpoint.
										</p>
									) : (
										<div className="space-y-2">
											{queryParams.map((param, index) => (
												<div key={index} className="flex items-center gap-2">
													<Input
														placeholder="key"
														value={param.key}
														onChange={(e) => updateParam(index, 'key', e.target.value)}
														className="font-mono text-sm"
													/>
													<span className="text-muted-foreground">=</span>
													<Input
														placeholder="value"
														value={param.value}
														onChange={(e) => updateParam(index, 'value', e.target.value)}
														className="font-mono text-sm"
													/>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														onClick={() => removeParam(index)}
													>
														<X className="h-4 w-4" />
													</Button>
												</div>
											))}
										</div>
									)}

									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={addParam}
									>
										<Plus className="mr-1 h-3 w-3" />
										Add Query Param
									</Button>
								</div>
							</CollapsibleSection>

							{/* Match Type Section */}
							<CollapsibleSection
								title="Match Type"
								tooltip={{
									label: "Match Type",
									description: "Controls how the endpoint path is matched against incoming requests. Exact requires full match. Wildcard captures URL segments. Substring checks if path contains the endpoint.",
									example: "exact: /users/123 | wildcard: /users/* | substring: /api/users",
									docsLink: "/docs#wildcard-variants",
								}}
								isExpanded={matchExpanded}
								onToggle={() => setMatchExpanded(!matchExpanded)}
							>
								<div className="space-y-2">
									<Select value={matchType} onValueChange={(v) => {
										const newType = v as MatchType;
										onMatchTypeChange(newType);
										if (newType === 'wildcard') {
											setVariantsExpanded(true);
										}
									}}>
										<SelectTrigger id="match-type">
											<SelectValue placeholder="Select match type" />
										</SelectTrigger>
										<SelectContent>
											{MATCH_TYPES.map((mt) => (
												<SelectItem key={mt} value={mt}>
													{mt.charAt(0).toUpperCase() + mt.slice(1)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<p className="text-xs text-muted-foreground">
										{MATCH_TYPE_DESCRIPTIONS[matchType]}
									</p>
									{matchType === 'wildcard' && endpoint && !endpoint.includes('*') && (
										<div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
											<span className="shrink-0 text-amber-600 dark:text-amber-400">⚠</span>
											<div className="space-y-1">
												<p className="text-xs font-medium text-amber-600 dark:text-amber-400">
													No wildcard detected
												</p>
												<p className="text-xs text-amber-600/80 dark:text-amber-400/80">
													Your endpoint <code className="font-mono">{endpoint}</code> doesn't contain <code className="font-mono">*</code>. Add a <code className="font-mono">*</code> to capture URL segments, e.g., <code className="font-mono">/users/*</code> or <code className="font-mono">/users/*/posts/*</code>.
												</p>
											</div>
										</div>
									)}
								</div>
							</CollapsibleSection>

							{/* Mock Variant Manager (only when wildcard) */}
							{matchType === 'wildcard' && (
								<CollapsibleSection
									title="Wildcard Variants"
									tooltip={{
										label: "Wildcard Variants",
										description: "Define different response variants based on captured URL segments. Each variant has a unique key that matches URL segments captured by * in your endpoint.",
										example: "123 for /users/123, alice|42 for /users/*/posts/*",
										docsLink: "/docs#wildcard-variants",
									}}
									isExpanded={variantsExpanded}
									onToggle={() => setVariantsExpanded(!variantsExpanded)}
								>
									<MockVariantManager
										variants={variants}
										onVariantsChange={onVariantsChange}
										requireMatch={requireMatch}
										onRequireMatchChange={onRequireMatchChange}
										endpoint={endpoint}
									/>
								</CollapsibleSection>
							)}
						</TabsContent>
					</Tabs>
				</div>
			</div>
	);
}
