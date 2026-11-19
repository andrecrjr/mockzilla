'use client';

import { FieldTooltip } from '@/components/folder-tooltips';
import { MockResponseSource } from '@/components/mock-response-source';
import { MockVariantManager } from '@/components/mock-variant-manager';
import { Button } from '@/components/ui/button';
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
	/** Builds the full served URL (host, folder, subfolder, query) for a path. */
	buildPreviewUrl?: (examplePath: string) => string | null;
	/** When set, responses come from this upstream and the editors below are fallbacks only. */
	proxyTargetUrl?: string;
	onEditProxy?: () => void;
};

const MATCH_TYPES: MatchType[] = ['exact', 'wildcard', 'substring'];

const MATCH_TYPE_DESCRIPTIONS: Record<MatchType, string> = {
	exact:
		'Path must match exactly. Exact paths start with higher priority; query filters also affect selection.',
	wildcard:
		'Use * to capture path text. Dynamic Response can use captures and query values.',
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
	buildPreviewUrl,
	proxyTargetUrl,
	onEditProxy,
}: ResponseConfigProps) {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-lg font-semibold">Mock Response</h2>
				<p className="text-sm text-muted-foreground">
					Choose how this endpoint matches and configure its response.
				</p>
			</div>

			{proxyTargetUrl && (
				<div className="flex flex-col gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
					<div className="min-w-0">
						<p className="font-medium text-blue-700 dark:text-blue-300">
							Proxy & Record is on
						</p>
						<p className="text-xs text-muted-foreground">
							Matching requests are answered live by{' '}
							<code className="break-all font-mono">{proxyTargetUrl}</code> and
							recorded; the response below is not served while the proxy is set.
						</p>
					</div>
					{onEditProxy && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="shrink-0"
							onClick={onEditProxy}
						>
							Edit proxy
						</Button>
					)}
				</div>
			)}

			<section className="space-y-3 rounded-lg border border-border bg-card p-4 sm:p-6">
				<div className="flex items-center gap-2">
					<Label htmlFor="match-type" className="text-base font-semibold">
						Match Type
					</Label>
					<FieldTooltip
						label="Match Type"
						description="Exact paths start with higher priority; query filters also affect which matching mock wins."
						example="wildcard /users/* → $.params.[0]"
						docsLink="/docs/guides/dynamic-wildcard-mocks#build-a-dynamic-wildcard-mock"
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
					buildPreviewUrl={buildPreviewUrl}
				/>
			)}
		</div>
	);
}
