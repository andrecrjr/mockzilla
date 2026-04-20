'use client';

import { Plus, Trash2 } from 'lucide-react';
import { FieldTooltip } from '@/components/folder-tooltips';
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
import { Textarea } from '@/components/ui/textarea';
import {
	RequireMatchIndicator,
	VariantPatternPreview,
} from '@/components/visual-pattern-preview';
import type { MockVariant } from '@/lib/types';

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
	onUpdate: (variant: MockVariant) => void;
	onDelete: () => void;
	endpoint?: string;
};

function VariantCard({
	variant,
	index,
	onUpdate,
	onDelete,
	endpoint,
}: VariantCardProps) {
	return (
		<div className="space-y-4 rounded-lg border border-border bg-card p-6">
			<div className="flex items-center justify-between">
				<span className="text-sm font-semibold">Variant {index + 1}</span>
				<Button type="button" variant="ghost" size="icon" onClick={onDelete}>
					<Trash2 className="h-4 w-4 text-destructive" />
				</Button>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Label htmlFor={`variant-key-${index}`}>Capture Key</Label>
						<FieldTooltip
							label="Capture Key"
							description="The URL segment(s) captured by * in your endpoint. Multiple wildcards are pipe-separated. Use * as a catch-all fallback."
							example="123 for /users/123, alice|42 for /users/*/posts/*"
							docsLink="/docs#wildcard-variants"
						/>
					</div>
					<Input
						id={`variant-key-${index}`}
						value={variant.key ?? ''}
						onChange={(e) => onUpdate({ ...variant, key: e.target.value })}
						placeholder="e.g., 123 or alice|active"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor={`variant-status-${index}`}>Status Code</Label>
					<Select
						value={String(variant.statusCode)}
						onValueChange={(value) => {
							onUpdate({
								...variant,
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
				<div className="flex items-center gap-2">
					<Label htmlFor={`variant-body-${index}`}>Response Body</Label>
					<FieldTooltip
						label="Response Body"
						description="Static response for this variant. Supports {$.path} interpolation if you reference other fields."
						example='{"id": "{$.userId}", "name": "Alice"}'
						docsLink="/docs#wildcard-variants"
					/>
				</div>
				<Textarea
					id={`variant-body-${index}`}
					value={variant.body}
					onChange={(e) => onUpdate({ ...variant, body: e.target.value })}
					placeholder='{"message": "Variant response"}'
					className="font-mono text-sm h-[150px]"
					rows={6}
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor={`variant-body-type-${index}`}>Body Type</Label>
				<Select
					value={variant.bodyType}
					onValueChange={(value) => {
						onUpdate({ ...variant, bodyType: value });
					}}
				>
					<SelectTrigger id={`variant-body-type-${index}`}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="json">JSON</SelectItem>
						<SelectItem value="text">Text</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Visual Pattern Preview for this variant */}
			{endpoint && (
				<VariantPatternPreview endpoint={endpoint} variant={variant} />
			)}
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
	endpoint,
}: MockVariantManagerProps) {
	const addVariant = () => {
		onVariantsChange([
			...variants,
			{
				key: '',
				body: '{}',
				statusCode: 200,
				bodyType: 'json',
			},
		]);
	};

	const updateVariant = (index: number, variant: MockVariant) => {
		const updated = [...variants];
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
					Configure different responses based on captured URL segments.
				</p>
			</div>

			<div className="space-y-4 rounded-lg border border-border p-6 bg-card">
				<div className="flex items-center space-x-2">
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
								Require Match
							</Label>
							<FieldTooltip
								label="Require Match"
								description="When enabled, returns 404 if no variant matches the captured URL segments. When disabled, falls back to the base mock response."
								example="OFF = fallback to base body, ON = 404 Not Found"
								docsLink="/docs#wildcard-variants"
							/>
						</div>
						<p className="text-xs text-muted-foreground">
							Return 404 when no variant matches the captured URL segments
						</p>
					</div>
				</div>

				<div className="flex items-center justify-between pt-4 border-t border-border">
					<p className="text-sm text-muted-foreground">
						{variants.length === 0
							? 'No variants yet. Add a variant to handle different captured URL segments.'
							: `${variants.length} variant${variants.length === 1 ? '' : 's'} configured`}
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={addVariant}
					>
						<Plus className="mr-1 h-3 w-3" />
						Add Variant
					</Button>
				</div>

				{variants.length > 0 && (
					<div className="space-y-4 mt-4">
						{variants.map((variant, index) => (
							<VariantCard
								key={`variant-${variant.key || index}-${index}`}
								variant={variant}
								index={index}
								onUpdate={(v) => updateVariant(index, v)}
								onDelete={() => deleteVariant(index)}
								endpoint={endpoint}
							/>
						))}
					</div>
				)}

				{/* Require Match Indicator */}
				{variants.length > 0 && (
					<div className="mt-2">
						<RequireMatchIndicator requireMatch={requireMatch} />
					</div>
				)}
			</div>
		</div>
	);
}
