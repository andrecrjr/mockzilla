'use client';

import { ExternalLink as ExternalLinkIcon, Plus, X } from 'lucide-react';
import { useRef } from 'react';
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
import Link from 'next/link';

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
}: ResponseConfigProps) {
	const previewJson = useRef<HTMLTextAreaElement>(null);

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

						<TabsContent value="advanced" className="space-y-6">
							{/* Query Parameters Section */}
							<div className="space-y-3 mt-4">
								<div className="flex items-center gap-2">
									<Label className="text-base font-semibold">Query Parameters</Label>
									<FieldTooltip
										label="Required Query Params"
										description="Mock will only match if ALL specified query params are present with matching values. Leave empty to match regardless of query string."
										example="?page=1&limit=10"
										docsLink="/docs#overview"
									/>
								</div>

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

							{/* Match Type Section */}
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<Label className="text-base font-semibold">Match Type</Label>
									<FieldTooltip
										label="Match Type"
										description="Controls how the endpoint path is matched against incoming requests. Exact requires full match. Wildcard captures URL segments. Substring checks if path contains the endpoint."
										example="exact: /users/123 | wildcard: /users/* | substring: /api/users"
										docsLink="/docs#wildcard-variants"
									/>
								</div>
								<div className="space-y-2">
									<Select value={matchType} onValueChange={(v) => onMatchTypeChange(v as MatchType)}>
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
								</div>
							</div>

							{/* Mock Variant Manager (only when wildcard) */}
							{matchType === 'wildcard' && (
								<div className="space-y-3">
									<div className="flex items-center gap-2">
										<Label className="text-base font-semibold">Wildcard Variants</Label>
										<FieldTooltip
											label="Wildcard Variants"
											description="Define multiple response variants with different conditions (headers, body, etc.). The first matching variant will be returned."
											example="Variant 1: 200 OK | Variant 2: 404 Not Found"
											docsLink="/docs#wildcard-variants"
										/>
									</div>

									<div className="space-y-4 rounded-lg border border-border p-4 bg-muted/50">
										{variants.length === 0 ? (
											<p className="text-sm text-muted-foreground">
												No variants defined. Add your first response variant.
											</p>
										) : (
											variants.map((variant, index) => (
												<div key={index} className="flex items-start gap-2">
													<div className="flex-1 space-y-1">
														<p className="text-sm font-medium">Variant {index + 1}</p>
														<p className="text-xs text-muted-foreground font-mono">
															Status: {variant.statusCode} | Weight: {variant.weight ?? 1}
														</p>
													</div>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														onClick={() => {
															const newVariants = [...variants];
															newVariants.splice(index, 1);
															onVariantsChange(newVariants);
														}}
													>
														<X className="h-4 w-4" />
													</Button>
												</div>
											))
										)}

										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => {
												onVariantsChange([
													...variants,
													{ id: `variant-${Date.now()}`, statusCode: 200, weight: 1, conditions: {} },
												]);
											}}
										>
											<Plus className="mr-1 h-3 w-3" />
											Add Variant
										</Button>
									</div>

									<div className="flex items-center space-x-2">
										<Switch
											checked={requireMatch}
											onCheckedChange={onRequireMatchChange}
										/>
										<div className="flex items-center gap-2">
											<Label
												className="cursor-pointer"
												onClick={() => onRequireMatchChange(!requireMatch)}
											>
												Require Match
											</Label>
											<FieldTooltip
												label="Require Match"
												description="When enabled, requests that don't match any variant will return 404 instead of falling back to the default response."
												example="Enabled: No match → 404 | Disabled: No match → Default response"
												docsLink="/docs#wildcard-variants"
											/>
										</div>
									</div>
								</div>
							)}
						</TabsContent>
					</Tabs>
				</div>
			</div>
	);
}
