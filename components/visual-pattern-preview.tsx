'use client';

import { Badge } from '@/components/ui/badge';
import type { MockVariant } from '@/lib/types';

/**
 * Splits the endpoint pattern into segments, highlighting wildcards
 */
export function splitEndpointPattern(pattern: string): Array<{ text: string; isWildcard: boolean }> {
	const parts = pattern.split(/(\*)/g);
	return parts.map((part) => ({
		text: part,
		isWildcard: part === '*',
	}));
}

/**
 * Generates an example URL from the pattern and variant key
 */
export function generateExampleUrl(pattern: string, variantKey: string | undefined): string {
	const segments = splitEndpointPattern(pattern);
	const key = variantKey ?? '';
	const keyParts = key === '*' ? ['*'] : key.split('|');
	let keyIndex = 0;

	return segments
		.map((segment) => {
			if (segment.isWildcard) {
				const replacement = keyParts[keyIndex] || '*';
				keyIndex++;
				return replacement;
			}
			return segment.text;
		})
		.join('');
}

/**
 * Per-variant visual pattern preview - shows how this specific variant
 * maps capture keys to the endpoint pattern
 */
export function VariantPatternPreview({
	endpoint,
	variant,
}: {
	endpoint: string;
	variant: MockVariant;
}) {
	const vKey = variant.key ?? '';
	const isFallback = vKey === '*';
	const exampleUrl = generateExampleUrl(endpoint, vKey);
	const segments = splitEndpointPattern(endpoint);

	return (
		<div className={`mt-3 rounded-md border px-3 py-2.5 ${
			isFallback
				? 'border-amber-500/30 bg-amber-500/5'
				: 'border-border bg-muted/30'
		}`}>
			<div className="flex items-center gap-2 flex-wrap">
				{/* Capture Key Badge */}
				<Badge
					variant={isFallback ? 'default' : 'secondary'}
					className={`font-mono text-xs ${
						isFallback
							? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
							: ''
					}`}
				>
					{isFallback ? '★ ' : ''}{vKey || '(empty)'}
				</Badge>

				{/* Arrow */}
				<span className="text-muted-foreground text-xs">→</span>

				{/* Example URL Preview */}
				<code className="flex-1 min-w-0 truncate font-mono text-xs text-muted-foreground">
					{exampleUrl}
				</code>

				{/* Status Code */}
				<Badge
					className={`text-xs shrink-0 ${
						variant.statusCode >= 200 && variant.statusCode < 300
							? 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/10'
							: variant.statusCode >= 400 && variant.statusCode < 500
								? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10'
								: 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/10'
					}`}
				>
					{variant.statusCode}
				</Badge>
			</div>
		</div>
	);
}

/**
 * Require match indicator
 */
export function RequireMatchIndicator({ requireMatch }: { requireMatch: boolean }) {
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
