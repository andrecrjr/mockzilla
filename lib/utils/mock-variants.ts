import type { BodyType, MockVariant } from '@/lib/types';
import { splitPathSearchParams } from './mock-paths';

export type NormalizedMockVariant = Omit<
	MockVariant,
	'key' | 'captures' | 'isFallback'
> & {
	key: string;
	captures: string[];
	isFallback: boolean;
};

export function getWildcardCount(endpoint: string): number {
	const { path } = splitPathSearchParams(endpoint);
	return path.match(/\*/g)?.length ?? 0;
}

export function legacyKeyFromCaptures(
	captures: string[],
	isFallback = false,
): string {
	return isFallback ? '*' : captures.join('|');
}

function capturesFromLegacyKey(key: string, wildcardCount: number): string[] {
	// A single wildcard has no separator ambiguity: the whole value is one
	// capture, even when that value contains a literal pipe.
	return wildcardCount <= 1 ? [key] : key.split('|');
}

export function normalizeMockVariant(
	variant: MockVariant,
	endpoint: string,
): NormalizedMockVariant {
	const hasCanonicalCaptures = Array.isArray(variant.captures);
	const isFallback =
		variant.isFallback === true ||
		(!hasCanonicalCaptures && variant.key === '*');
	const captures = isFallback
		? []
		: hasCanonicalCaptures
			? (variant.captures ?? [])
			: capturesFromLegacyKey(variant.key ?? '', getWildcardCount(endpoint));

	return {
		...variant,
		key: legacyKeyFromCaptures(captures, isFallback),
		captures,
		isFallback,
	};
}

export function normalizeMockVariants(
	variants: MockVariant[] | null | undefined,
	endpoint: string,
): NormalizedMockVariant[] | null {
	if (!variants) return null;
	return variants.map((variant) => normalizeMockVariant(variant, endpoint));
}

type VariantResponseTarget = {
	response: string;
	statusCode: number;
	bodyType: BodyType | null;
	jsonSchema: string | null;
	useDynamicResponse: boolean;
	echoRequestBody: boolean;
};

export function applyVariantResponse<T extends VariantResponseTarget>(
	mock: T,
	variant: MockVariant,
): T {
	return {
		...mock,
		response: variant.body,
		statusCode: variant.statusCode,
		bodyType: variant.useDynamicResponse ? 'json' : variant.bodyType,
		jsonSchema: variant.jsonSchema ?? null,
		useDynamicResponse: variant.useDynamicResponse === true,
		echoRequestBody: false,
	};
}
