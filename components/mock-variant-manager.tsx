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
import { VariantPathEditor } from '@/components/visual-pattern-preview';
import type { MockVariant } from '@/lib/types';
import {
	getWildcardCount,
	legacyKeyFromCaptures,
	normalizeMockVariant,
} from '@/lib/utils/mock-variants';
import { getStatusCodeOptions } from '@/lib/utils/status-codes';

type VariantCardProps = {
	variant: MockVariant;
	index: number;
	/** 1-based position among specific (non-fallback) variants. */
	displayNumber: number;
	endpoint: string;
	buildPreviewUrl?: (examplePath: string) => string | null;
	onUpdate: (variant: MockVariant) => void;
	onDelete: () => void;
};

function VariantCard({
	variant,
	index,
	displayNumber,
	endpoint,
	buildPreviewUrl,
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
								: `Variant ${displayNumber}`}
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
					aria-label={
						normalizedVariant.isFallback
							? 'Delete fallback response'
							: `Delete variant ${displayNumber}`
					}
					title="Delete variant"
				>
					<Trash2 className="h-4 w-4 text-destructive" />
				</Button>
			</div>

			<VariantPathEditor
				endpoint={endpoint}
				buildPreviewUrl={buildPreviewUrl}
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
							{getStatusCodeOptions(normalizedVariant.statusCode).map(
								(code) => (
									<SelectItem key={code.value} value={code.value}>
										{code.label}
									</SelectItem>
								),
							)}
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
	buildPreviewUrl?: (examplePath: string) => string | null;
};

export function MockVariantManager({
	variants,
	onVariantsChange,
	requireMatch,
	onRequireMatchChange,
	endpoint = '',
	buildPreviewUrl,
}: MockVariantManagerProps) {
	const variantIdsRef = useRef(new WeakMap<MockVariant, string>());
	const nextVariantIdRef = useRef(0);
	const wildcardCount = getWildcardCount(endpoint);
	const normalizedVariants = variants.map((variant) =>
		normalizeMockVariant(variant, endpoint),
	);
	const fallbackIndex = normalizedVariants.findIndex(
		(variant) => variant.isFallback,
	);
	const hasFallback = fallbackIndex !== -1;
	const specificCount = variants.length - (hasFallback ? 1 : 0);
	let specificNumber = 0;
	const displayNumbers = normalizedVariants.map((variant) => {
		if (variant.isFallback) return 0;
		specificNumber += 1;
		return specificNumber;
	});

	const getVariantId = (variant: MockVariant): string => {
		const existingId = variantIdsRef.current.get(variant);
		if (existingId) return existingId;

		const nextId = `variant-${nextVariantIdRef.current}`;
		nextVariantIdRef.current += 1;
		variantIdsRef.current.set(variant, nextId);
		return nextId;
	};

	const addVariant = () => {
		const newVariant: MockVariant = {
			key: '',
			captures: Array.from({ length: wildcardCount }, () => ''),
			isFallback: false,
			body: '{}',
			statusCode: 200,
			bodyType: 'json',
		};
		// Keep the fallback last so the list reads in matching order.
		const insertAt = hasFallback ? fallbackIndex : variants.length;
		onVariantsChange([
			...variants.slice(0, insertAt),
			newVariant,
			...variants.slice(insertAt),
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

	const noMatchDescription = hasFallback
		? 'The fallback response handles every unmatched request, so this setting has no effect.'
		: variants.length === 0
			? 'Until you add a variant, every request returns the base mock response.'
			: requireMatch
				? 'Requests without a matching variant return 404 Not Found.'
				: 'Requests without a matching variant return the base mock response, which is not editable in wildcard mode. Add a fallback to control it.';

	const countSummary =
		variants.length === 0
			? 'No variants configured yet.'
			: [
					`${specificCount} specific variant${specificCount === 1 ? '' : 's'}`,
					hasFallback ? 'fallback configured' : 'no fallback',
				].join(' · ');

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h3 className="text-lg font-semibold">Wildcard Variants</h3>
				<p className="text-sm text-muted-foreground">
					Requests try specific variants first, then the fallback.
				</p>
			</div>

			<div className="space-y-4 rounded-lg border border-border bg-card p-6">
				<div className="flex items-start gap-3">
					<Switch
						id="wildcard-require-match"
						checked={requireMatch && !hasFallback}
						onCheckedChange={onRequireMatchChange}
						disabled={hasFallback}
					/>
					<div className="space-y-0.5">
						<div className="flex items-center gap-2">
							<Label
								htmlFor="wildcard-require-match"
								className={
									hasFallback
										? 'font-medium text-muted-foreground'
										: 'cursor-pointer font-medium'
								}
							>
								Return 404 when no variant matches
							</Label>
							<FieldTooltip
								label="No-match behavior"
								description="Matching order: specific variant, then fallback response. Without a fallback, unmatched requests return 404 when this is on, or the base mock response when it is off."
								example="Fallback present = toggle ignored"
								docsLink="/docs/guides/dynamic-wildcard-mocks#give-selected-ids-their-own-response"
							/>
						</div>
						<p
							className={
								!hasFallback && (!requireMatch || variants.length === 0)
									? 'text-xs text-amber-600 dark:text-amber-400'
									: 'text-xs text-muted-foreground'
							}
						>
							{noMatchDescription}
						</p>
					</div>
				</div>

				<div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-sm text-muted-foreground">{countSummary}</p>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={addVariant}
							disabled={wildcardCount === 0}
							title={
								wildcardCount === 0
									? 'Add * to the endpoint path to create specific variants'
									: undefined
							}
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
								displayNumber={displayNumbers[index]}
								onUpdate={(updatedVariant) =>
									updateVariant(index, updatedVariant)
								}
								onDelete={() => deleteVariant(index)}
								endpoint={endpoint}
								buildPreviewUrl={buildPreviewUrl}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
