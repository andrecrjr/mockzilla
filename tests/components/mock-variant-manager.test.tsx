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

describe('MockVariantManager', () => {
	afterEach(cleanup);

	it('keeps Capture Key focused while its value changes', () => {
		render(<VariantManagerHarness />);

		const input = screen.getByLabelText('Capture Key');
		input.focus();
		fireEvent.change(input, { target: { value: 'user-12' } });

		expect(document.activeElement).toBe(input);
		expect((input as HTMLInputElement).value).toBe('user-12');
		expect(input.parentElement?.textContent).toContain('/users/user-12');
	});
});
