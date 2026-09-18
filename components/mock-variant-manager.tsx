'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { FieldTooltip } from '@/components/folder-tooltips';
import { MockResponseSource } from '@/components/mock-response-source';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
	RequireMatchIndicator,
	VariantPathEditor,
} from '@/components/visual-pattern-preview';
import type { MockVariant } from '@/lib/types';
import {
	getWildcardCount,
	legacyKeyFromCaptures,
	normalizeMockVariant,
} from '@/lib/utils/mock-variants';

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

type VariantCardProps = {
	variant: MockVariant;
	index: number;
	endpoint: string;
	onUpdate: (variant: MockVariant) => void;
	onDelete: () => void;
};

function VariantCard({
	variant,
	index,
	endpoint,
	onUpdate,
	onDelete,
}: VariantCardProps) {
	const normalizedVariant = normalizeMockVariant(variant, endpoint);
	const updateCaptures = (captures: string[]) => {
		onUpdate({
			...normalizedVariant,
			key: legacyKeyFromCaptures(captures),
			captures,
			isFallback: false,
		});
	};

	return (
		<div className="space-y-4 rounded-lg border border-border bg-card p-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<span className="text-sm font-semibold">
							{normalizedVariant.isFallback
								? 'Fallback response'
								: `Variant ${index + 1}`}
						</span>
						<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
							{normalizedVariant.isFallback ? 'Any value' : 'Specific path'}
						</span>
					</div>
					<p className="mt-1 text-xs text-muted-foreground">
						{normalizedVariant.isFallback
							? 'Used when no specific variant matches.'
							: 'Return this response for one exact set of captured values.'}
					</p>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={onDelete}
					aria-label={`Delete ${normalizedVariant.isFallback ? 'fallback ' : ''}variant ${index + 1}`}
					title="Delete variant"
				>
					<Trash2 className="h-4 w-4 text-destructive" />
				</Button>
			</div>

			<VariantPathEditor
				endpoint={endpoint}
				variant={normalizedVariant}
				onCapturesChange={updateCaptures}
			/>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor={`variant-status-${index}`}>Status Code</Label>
					<Select
						value={String(normalizedVariant.statusCode)}
						onValueChange={(value) => {
							onUpdate({
								...normalizedVariant,
								statusCode: Number.parseInt(value, 10),
							});
						}}
					>
						<SelectTrigger id={`variant-status-${index}`}>
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
				<Label className="text-sm font-semibold">Variant Response</Label>
				<MockResponseSource
					response={normalizedVariant.body}
					onResponseChange={(body) => onUpdate({ ...normalizedVariant, body })}
					jsonSchema={normalizedVariant.jsonSchema ?? ''}
					onJsonSchemaChange={(jsonSchema) =>
						onUpdate({ ...normalizedVariant, jsonSchema })
					}
					useDynamicResponse={normalizedVariant.useDynamicResponse === true}
					onUseDynamicResponseChange={(useDynamicResponse) =>
						onUpdate({
							...normalizedVariant,
							useDynamicResponse,
							bodyType: useDynamicResponse
								? 'json'
								: normalizedVariant.bodyType,
						})
					}
					bodyType={normalizedVariant.bodyType}
					onBodyTypeChange={(bodyType) =>
						onUpdate({ ...normalizedVariant, bodyType })
					}
					idPrefix={`variant-${index}`}
				/>
			</div>
		</div>
	);
}

type MockVariantManagerProps = {
	variants: MockVariant[];
	onVariantsChange: (variants: MockVariant[]) => void;
	requireMatch: boolean;
	onRequireMatchChange: (value: boolean) => void;
	endpoint?: string;
};

export function MockVariantManager({
	variants,
	onVariantsChange,
	requireMatch,
	onRequireMatchChange,
	endpoint = '',
}: MockVariantManagerProps) {
	const variantIdsRef = useRef(new WeakMap<MockVariant, string>());
	const nextVariantIdRef = useRef(0);
	const wildcardCount = getWildcardCount(endpoint);
	const hasFallback = variants.some(
		(variant) => normalizeMockVariant(variant, endpoint).isFallback,
	);

	const getVariantId = (variant: MockVariant): string => {
		const existingId = variantIdsRef.current.get(variant);
		if (existingId) return existingId;

		const nextId = `variant-${nextVariantIdRef.current}`;
		nextVariantIdRef.current += 1;
		variantIdsRef.current.set(variant, nextId);
		return nextId;
	};

	const addVariant = () => {
		onVariantsChange([
			...variants,
			{
				key: '',
				captures: Array.from({ length: wildcardCount }, () => ''),
				isFallback: false,
				body: '{}',
				statusCode: 200,
				bodyType: 'json',
			},
		]);
	};

	const addFallback = () => {
		if (hasFallback) return;
		onVariantsChange([
			...variants,
			{
				key: '*',
				captures: [],
				isFallback: true,
				body: '{}',
				statusCode: 200,
				bodyType: 'json',
			},
		]);
	};

	const updateVariant = (index: number, variant: MockVariant) => {
		const updated = [...variants];
		const variantId = variantIdsRef.current.get(variants[index]);
		if (variantId) variantIdsRef.current.set(variant, variantId);
		updated[index] = variant;
		onVariantsChange(updated);
	};

	const deleteVariant = (index: number) => {
		onVariantsChange(variants.filter((_, i) => i !== index));
	};

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h3 className="text-lg font-semibold">Wildcard Variants</h3>
				<p className="text-sm text-muted-foreground">
					Create a response for a specific request path, or add a fallback for
					any unmatched captured value.
				</p>
			</div>

			<div className="space-y-4 rounded-lg border border-border bg-card p-6">
				<div className="flex items-start gap-3">
					<Switch
						checked={requireMatch}
						onCheckedChange={onRequireMatchChange}
					/>
					<div className="space-y-0.5">
						<div className="flex items-center gap-2">
							<Label
								className="cursor-pointer font-medium"
								onClick={() => onRequireMatchChange(!requireMatch)}
							>
								Return 404 when no variant matches
							</Label>
							<FieldTooltip
								label="No-match behavior"
								description="When enabled, unmatched wildcard requests return 404. When disabled, the base mock response is used."
								example="OFF = use base response, ON = 404 Not Found"
								docsLink="/docs#wildcard-variants"
							/>
						</div>
						<p className="text-xs text-muted-foreground">
							{requireMatch
								? 'Requests without a matching variant return 404.'
								: 'Requests without a matching variant use the base response.'}
						</p>
					</div>
				</div>

				<div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-sm text-muted-foreground">
						{variants.length === 0
							? 'No variants configured yet.'
							: `${variants.length} response variant${variants.length === 1 ? '' : 's'} configured`}
					</p>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={addVariant}
						>
							<Plus className="mr-1 h-3 w-3" />
							Add specific variant
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={addFallback}
							disabled={hasFallback}
							title={
								hasFallback ? 'A fallback response already exists' : undefined
							}
						>
							<Plus className="mr-1 h-3 w-3" />
							Add fallback
						</Button>
					</div>
				</div>

				{variants.length > 0 && (
					<div className="mt-4 space-y-4">
						{variants.map((variant, index) => (
							<VariantCard
								key={getVariantId(variant)}
								variant={variant}
								index={index}
								onUpdate={(updatedVariant) =>
									updateVariant(index, updatedVariant)
								}
								onDelete={() => deleteVariant(index)}
								endpoint={endpoint}
							/>
						))}
					</div>
				)}

				{variants.length > 0 && (
					<RequireMatchIndicator requireMatch={requireMatch} />
				)}
			</div>
		</div>
	);
}
