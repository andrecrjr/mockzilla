'use client';

import { Input } from '@/components/ui/input';
import type { MockVariant } from '@/lib/types';
import { splitPathSearchParams } from '@/lib/utils/mock-paths';
import {
	getWildcardCount,
	normalizeMockVariant,
} from '@/lib/utils/mock-variants';

/** Splits an endpoint into literal text and wildcard slots. */
export function splitEndpointPattern(
	pattern: string,
): Array<{ text: string; isWildcard: boolean }> {
	const { path } = splitPathSearchParams(pattern);
	const parts = path.split(/(\*)/g);
	return parts.map((part) => ({
		text: part,
		isWildcard: part === '*',
	}));
}

/** Generates an example URL from a pattern and structured capture values. */
export function generateExampleUrl(
	pattern: string,
	captures: string[] | string | undefined,
): string {
	const segments = splitEndpointPattern(pattern);
	const captureValues = Array.isArray(captures)
		? captures
		: captures === undefined
			? []
			: getWildcardCount(pattern) <= 1
				? [captures]
				: captures.split('|');
	let captureIndex = 0;

	return segments
		.map((segment) => {
			if (!segment.isWildcard) return segment.text;
			const replacement = captureValues[captureIndex] || '*';
			captureIndex++;
			return replacement;
		})
		.join('');
}

type VariantPathEditorProps = {
	endpoint: string;
	variant: MockVariant;
	onCapturesChange: (captures: string[]) => void;
};

/** Edits one value per wildcard while keeping the route context visible. */
export function VariantPathEditor({
	endpoint,
	variant,
	onCapturesChange,
}: VariantPathEditorProps) {
	const normalizedVariant = normalizeMockVariant(variant, endpoint);
	const wildcardCount = getWildcardCount(endpoint);
	const captures = normalizedVariant.captures;
	let captureIndex = 0;

	const handleCaptureChange = (index: number, value: string) => {
		const nextCaptures = Array.from(
			{ length: Math.max(wildcardCount, captures.length) },
			(_, currentIndex) => captures[currentIndex] ?? '',
		);
		nextCaptures[index] = value;
		onCapturesChange(nextCaptures);
	};

	return (
		<div className="space-y-3 rounded-md border border-border bg-muted/20 p-4">
			<div>
				<p className="text-sm font-medium">When the request path matches</p>
				<p className="text-xs text-muted-foreground">
					{normalizedVariant.isFallback
						? 'This response handles any captured values not matched by another variant.'
						: 'Enter one value for each wildcard in the endpoint.'}
				</p>
			</div>

			<div className="flex flex-wrap items-center gap-1 rounded-md bg-background px-3 py-3 font-mono text-sm leading-8 break-all">
				{splitEndpointPattern(endpoint).map((segment, index) => {
					if (!segment.isWildcard) {
						return <span key={`${segment.text}-${index}`}>{segment.text}</span>;
					}

					const currentCaptureIndex = captureIndex;
					captureIndex++;
					if (normalizedVariant.isFallback) {
						return (
							<span
								key={`wildcard-${currentCaptureIndex}`}
								className="rounded bg-amber-500/15 px-1.5 text-amber-700 dark:text-amber-300"
							>
								any value
							</span>
						);
					}

					return (
						<Input
							key={`wildcard-${currentCaptureIndex}`}
							value={captures[currentCaptureIndex] ?? ''}
							onChange={(event) =>
								handleCaptureChange(currentCaptureIndex, event.target.value)
							}
							aria-label={`Wildcard capture ${currentCaptureIndex + 1}`}
							title={`Value for wildcard ${currentCaptureIndex + 1}`}
							placeholder={`value ${currentCaptureIndex + 1}`}
							className="inline-flex h-8 w-32 border-primary/50 bg-background px-2 font-sans text-sm"
						/>
					);
				})}
			</div>

			<p className="text-xs text-muted-foreground">
				Preview:{' '}
				<code className="break-all font-mono text-foreground/80">
					{generateExampleUrl(
						endpoint,
						normalizedVariant.isFallback ? undefined : captures,
					)}
				</code>
			</p>
		</div>
	);
}

/** Require match indicator. */
export function RequireMatchIndicator({
	requireMatch,
}: {
	requireMatch: boolean;
}) {
	return (
		<div className="flex items-center gap-2 pt-1">
			{requireMatch ? (
				<div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
					<span>⚠</span>
					<span>Require match: returns 404 if no variant matches</span>
				</div>
			) : (
				<div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
					<span>✓</span>
					<span>Fallback: uses base mock if no variant matches</span>
				</div>
			)}
		</div>
	);
}
