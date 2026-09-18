import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MockVariantManager } from '../../components/mock-variant-manager';
import { TooltipProvider } from '../../components/ui/tooltip';
import type { MockVariant } from '../../lib/types';

function VariantManagerHarness() {
	const [variants, setVariants] = useState<MockVariant[]>([
		{ key: 'user-1', body: '{}', statusCode: 200, bodyType: 'json' },
	]);

	return (
		<TooltipProvider>
			<MockVariantManager
				variants={variants}
				onVariantsChange={setVariants}
				requireMatch={false}
				onRequireMatchChange={() => undefined}
				endpoint="/users/*"
			/>
		</TooltipProvider>
	);
}

function DynamicVariantHarness() {
	const [variants, setVariants] = useState<MockVariant[]>([
		{
			key: 'user-1',
			body: '{}',
			statusCode: 200,
			bodyType: 'json',
			jsonSchema: '{"type":"object"}',
			useDynamicResponse: true,
		},
	]);

	return (
		<TooltipProvider>
			<MockVariantManager
				variants={variants}
				onVariantsChange={setVariants}
				requireMatch={false}
				onRequireMatchChange={() => undefined}
				endpoint="/users/*"
			/>
		</TooltipProvider>
	);
}

function MultiCaptureHarness() {
	const [variants, setVariants] = useState<MockVariant[]>([
		{
			key: 'alice|active',
			captures: ['alice', 'active'],
			body: '{}',
			statusCode: 200,
			bodyType: 'json',
		},
	]);

	return (
		<TooltipProvider>
			<MockVariantManager
				variants={variants}
				onVariantsChange={setVariants}
				requireMatch={false}
				onRequireMatchChange={() => undefined}
				endpoint="/users/*/status/*"
			/>
		</TooltipProvider>
	);
}

describe('MockVariantManager', () => {
	afterEach(cleanup);

	it('converts a legacy key into a focused wildcard value input', () => {
		render(<VariantManagerHarness />);

		const input = screen.getByLabelText('Wildcard capture 1');
		input.focus();
		fireEvent.change(input, { target: { value: 'user-12' } });

		expect(document.activeElement).toBe(input);
		expect((input as HTMLInputElement).value).toBe('user-12');
		expect(screen.getByText('/users/user-12')).toBeDefined();
	});

	it('renders schema source controls for a dynamic variant', () => {
		render(<DynamicVariantHarness />);

		expect(screen.getByLabelText('Dynamic response schema')).toBeDefined();
		expect(
			screen.queryByRole('textbox', { name: 'Manual JSON response' }),
	).toBeNull();
		expect(screen.getByDisplayValue('{"type":"object"}')).toBeDefined();
	});

	it('renders one capture input for each wildcard', () => {
		render(<MultiCaptureHarness />);

		expect(screen.getByLabelText('Wildcard capture 1')).toBeDefined();
		expect(screen.getByLabelText('Wildcard capture 2')).toBeDefined();
		expect(screen.getByText('/users/alice/status/active')).toBeDefined();
	});

	it('switches a variant to Dynamic Response without losing the selection', () => {
		render(<VariantManagerHarness />);

		const dynamicButton = screen.getByRole('button', {
			name: 'Dynamic Response',
		});
		fireEvent.click(dynamicButton);

		expect(dynamicButton.getAttribute('aria-pressed')).toBe('true');
	});
});
