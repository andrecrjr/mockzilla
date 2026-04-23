'use client';

import { Plus, X } from 'lucide-react';
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
import type { MatchType } from '@/lib/types';

type MatchTypeSectionProps = {
	value: MatchType;
	onChange: (value: MatchType) => void;
};

const MATCH_TYPES: MatchType[] = ['exact', 'wildcard', 'substring'];

const MATCH_TYPE_DESCRIPTIONS: Record<MatchType, string> = {
	exact: 'Path must match exactly',
	wildcard: 'Use * as wildcard (e.g., /users/*)',
	substring: 'Path contains the endpoint',
};

function MatchTypeSection({ value, onChange }: MatchTypeSectionProps) {
	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<Label className="text-base font-semibold">Match Type</Label>
				<FieldTooltip
					label="Match Type"
					description="Controls how the endpoint path is matched against incoming requests. Exact requires full match. Wildcard captures URL segments. Substring checks if path contains the endpoint."
					example="exact: /users/123 | wildcard: /users/* | substring: /api/users"
					docsLink="/docs/reference/routing-and-matching#wildcard-matching"
				/>
			</div>
			<div className="space-y-2">
				<Select value={value} onValueChange={(v) => onChange(v as MatchType)}>
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
					{MATCH_TYPE_DESCRIPTIONS[value]}
				</p>
			</div>
		</div>
	);
}

type QueryParamsSectionProps = {
	params: { key: string; value: string }[];
	onChange: (params: { key: string; value: string }[]) => void;
};

function QueryParamsSection({ params, onChange }: QueryParamsSectionProps) {
	const addParam = () => {
		onChange([...params, { key: '', value: '' }]);
	};

	const removeParam = (index: number) => {
		onChange(params.filter((_, i) => i !== index));
	};

	const updateParam = (
		index: number,
		field: 'key' | 'value',
		value: string,
	) => {
		const updated = [...params];
		updated[index] = { ...updated[index], [field]: value };
		onChange(updated);
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<Label className="text-base font-semibold">Query Parameters</Label>
				<FieldTooltip
					label="Required Query Params"
					description="Mock will only match if ALL specified query params are present with matching values. Leave empty to match regardless of query string."
					example="?page=1&limit=10"
					docsLink="/docs/reference/routing-and-matching#query-parameters"
				/>
			</div>

			{params.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					No query parameters required. Mock will match any request to this
					endpoint.
				</p>
			) : (
				<div className="space-y-2">
					{params.map((param, index) => (
						<div
							key={`${param.key}-${index}`}
							className="flex items-center gap-2"
						>
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

			<Button type="button" variant="outline" size="sm" onClick={addParam}>
				<Plus className="mr-1 h-3 w-3" />
				Add Query Param
			</Button>
		</div>
	);
}

type AdvancedOptionsProps = {
	matchType: MatchType;
	onMatchTypeChange: (value: MatchType) => void;
	queryParams: { key: string; value: string }[];
	onQueryParamsChange: (params: { key: string; value: string }[]) => void;
};

export function AdvancedOptions({
	matchType,
	onMatchTypeChange,
	queryParams,
	onQueryParamsChange,
}: AdvancedOptionsProps) {
	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h3 className="text-lg font-semibold">Advanced Options</h3>
				<p className="text-sm text-muted-foreground">
					Configure matching behavior and query parameter requirements.
				</p>
			</div>

			<div className="space-y-6 rounded-lg border border-border p-6 bg-card">
				<MatchTypeSection value={matchType} onChange={onMatchTypeChange} />

				<div className="border-t border-border pt-6">
					<QueryParamsSection
						params={queryParams}
						onChange={onQueryParamsChange}
					/>
				</div>
			</div>
		</div>
	);
}
