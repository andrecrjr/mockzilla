'use client';

import { FieldTooltip } from '@/components/folder-tooltips';
import { MockResponseSource } from '@/components/mock-response-source';
import { MockVariantManager } from '@/components/mock-variant-manager';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { MatchType, MockVariant } from '@/lib/types';

type ResponseConfigProps = {
	response: string;
	onResponseChange: (value: string) => void;
	jsonSchema: string;
	onJsonSchemaChange: (value: string) => void;
	useDynamicResponse: boolean;
	onUseDynamicResponseChange: (value: boolean) => void;
	matchType: MatchType;
	onMatchTypeChange: (value: MatchType) => void;
	variants: MockVariant[];
	onVariantsChange: (variants: MockVariant[]) => void;
	requireMatch: boolean;
	onRequireMatchChange: (value: boolean) => void;
	endpoint?: string;
};

const MATCH_TYPES: MatchType[] = ['exact', 'wildcard', 'substring'];

const MATCH_TYPE_DESCRIPTIONS: Record<MatchType, string> = {
	exact:
		'Path must match exactly. An exact endpoint wins over wildcard matches.',
	wildcard: 'Use * to capture URL segments, for example /users/*.',
	substring: 'Path matches when the endpoint appears inside the request path.',
};

export function ResponseConfig({
	response,
	onResponseChange,
	jsonSchema,
	onJsonSchemaChange,
	useDynamicResponse,
	onUseDynamicResponseChange,
	matchType,
	onMatchTypeChange,
	variants,
	onVariantsChange,
	requireMatch,
	onRequireMatchChange,
	endpoint,
}: ResponseConfigProps) {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-lg font-semibold">Mock Response</h2>
				<p className="text-sm text-muted-foreground">
					Choose how this endpoint matches and configure its response.
				</p>
			</div>

			<section className="space-y-3 rounded-lg border border-border bg-card p-4 sm:p-6">
				<div className="flex items-center gap-2">
					<Label htmlFor="match-type" className="text-base font-semibold">
						Match Type
					</Label>
					<FieldTooltip
						label="Match Type"
						description="Exact matches first, wildcard captures segments, and substring checks for a contained path."
						example="exact: /users/test | wildcard: /users/*"
						docsLink="/docs/reference/routing-and-matching#wildcard-matching"
					/>
				</div>
				<Select
					value={matchType}
					onValueChange={(value) => onMatchTypeChange(value as MatchType)}
				>
					<SelectTrigger id="match-type">
						<SelectValue placeholder="Select match type" />
					</SelectTrigger>
					<SelectContent>
						{MATCH_TYPES.map((type) => (
							<SelectItem key={type} value={type}>
								{type.charAt(0).toUpperCase() + type.slice(1)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<p className="text-xs text-muted-foreground">
					{MATCH_TYPE_DESCRIPTIONS[matchType]}
				</p>
				{matchType === 'wildcard' && endpoint && !endpoint.includes('*') && (
					<div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-600 dark:text-amber-400">
						<p className="font-medium">No wildcard detected</p>
						<p className="mt-1 text-amber-600/80 dark:text-amber-400/80">
							Add <code className="font-mono">*</code> to capture a segment, for
							example <code className="font-mono">/users/*</code>.
						</p>
					</div>
				)}
			</section>

			{matchType !== 'wildcard' && (
				<section className="rounded-lg border border-border bg-card p-4 sm:p-6">
					<MockResponseSource
						response={response}
						onResponseChange={onResponseChange}
						jsonSchema={jsonSchema}
						onJsonSchemaChange={onJsonSchemaChange}
						useDynamicResponse={useDynamicResponse}
						onUseDynamicResponseChange={onUseDynamicResponseChange}
						idPrefix="base"
					/>
				</section>
			)}

			{matchType === 'wildcard' && (
				<MockVariantManager
					variants={variants}
					onVariantsChange={onVariantsChange}
					requireMatch={requireMatch}
					onRequireMatchChange={onRequireMatchChange}
					endpoint={endpoint}
				/>
			)}
		</div>
	);
}
