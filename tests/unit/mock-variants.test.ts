import { describe, expect, test } from 'bun:test';
import type { MockVariant } from '../../lib/types';
import {
	alignVariantCaptures,
	getWildcardCount,
	normalizeMockVariant,
	normalizeMockVariants,
} from '../../lib/utils/mock-variants';
import {
	getStatusCodeOptions,
	STATUS_CODE_OPTIONS,
} from '../../lib/utils/status-codes';

const baseVariant: Omit<MockVariant, 'key' | 'captures' | 'isFallback'> = {
	body: '{}',
	statusCode: 200,
	bodyType: 'json',
};

describe('mock variant normalization', () => {
	test('converts a legacy single capture without splitting its value', () => {
		const variant = normalizeMockVariant(
			{ ...baseVariant, key: 'alpha|beta' },
			'/files/*',
		);

		expect(variant.captures).toEqual(['alpha|beta']);
		expect(variant.isFallback).toBe(false);
	});

	test('converts legacy multiple captures using the compatibility format', () => {
		const variant = normalizeMockVariant(
			{ ...baseVariant, key: 'alice|active' },
			'/users/*/status/*',
		);

		expect(variant.captures).toEqual(['alice', 'active']);
	});

	test('keeps canonical captures and writes a legacy compatibility key', () => {
		const variant = normalizeMockVariant(
			{
				...baseVariant,
				key: 'outdated',
				captures: ['alpha|beta', 'active'],
			},
			'/files/*/status/*',
		);

		expect(variant.captures).toEqual(['alpha|beta', 'active']);
		expect(variant.key).toBe('alpha|beta|active');
	});

	test('converts the legacy wildcard key to an explicit fallback', () => {
		const variant = normalizeMockVariant(
			{ ...baseVariant, key: '*' },
			'/files/*',
		);

		expect(variant.captures).toEqual([]);
		expect(variant.isFallback).toBe(true);
		expect(variant.key).toBe('*');
	});

	test('normalizes all variants without changing null collections', () => {
		expect(normalizeMockVariants(null, '/users/*')).toBeNull();
		expect(getWildcardCount('/users/*/posts/*')).toBe(2);
	});

	test('aligns captures to the current wildcard count', () => {
		const variant = normalizeMockVariant(
			{ ...baseVariant, key: 'alice|active', captures: ['alice', 'active'] },
			'/users/*/status/*',
		);

		const shrunk = alignVariantCaptures(variant, 1);
		expect(shrunk.captures).toEqual(['alice']);
		expect(shrunk.key).toBe('alice');

		const grown = alignVariantCaptures(variant, 3);
		expect(grown.captures).toEqual(['alice', 'active', '']);
	});

	test('leaves fallback variants untouched when aligning', () => {
		const fallback = normalizeMockVariant(
			{ ...baseVariant, key: '*', isFallback: true },
			'/users/*',
		);
		expect(alignVariantCaptures(fallback, 2)).toBe(fallback);
	});
});

describe('getStatusCodeOptions', () => {
	test('keeps a stored status code missing from the presets', () => {
		const options = getStatusCodeOptions('418');
		expect(options.some((option) => option.value === '418')).toBe(true);
		expect(getStatusCodeOptions('200')).toBe(STATUS_CODE_OPTIONS);
	});
});
