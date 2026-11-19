import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import {
	ProxyOptions,
	type ProxyOptionsValue,
} from '../../components/mock-proxy-options';
import { TooltipProvider } from '../../components/ui/tooltip';

function Harness() {
	const [value, setValue] = useState<ProxyOptionsValue>({
		targetUrl: '',
		headers: [],
		queryParams: [],
		forwardHeaders: true,
	});
	return (
		<TooltipProvider>
			<ProxyOptions value={value} onChange={setValue} />
		</TooltipProvider>
	);
}

describe('ProxyOptions', () => {
	afterEach(cleanup);

	it('validates the target and shows settings when enabled', () => {
		render(<Harness />);
		expect(screen.queryByText('Add header')).toBeNull();
		const target = screen.getByLabelText('Proxy & Record');
		fireEvent.change(target, { target: { value: 'invalid' } });
		expect(target.getAttribute('aria-invalid')).toBe('true');
		expect(screen.getByRole('alert').textContent).toContain('Enter a full URL');
		fireEvent.change(target, { target: { value: 'https://example.com' } });
		expect(target.getAttribute('aria-invalid')).toBe('false');
		expect(screen.getByText('Add header')).toBeDefined();
	});

	it('adds, validates, masks, reveals and removes sensitive rows', () => {
		render(<Harness />);
		fireEvent.change(screen.getByLabelText('Proxy & Record'), {
			target: { value: 'https://example.com' },
		});
		fireEvent.click(screen.getByText('Add header'));
		const name = screen.getByLabelText('Header name 1');
		fireEvent.change(name, { target: { value: 'bad header' } });
		expect(name.getAttribute('aria-invalid')).toBe('true');
		expect(screen.getByRole('alert').textContent).toContain(
			'not a valid header name',
		);
		fireEvent.change(name, { target: { value: 'Authorization' } });
		const value = screen.getByLabelText('Header value 1') as HTMLInputElement;
		fireEvent.change(value, { target: { value: 'Bearer secret' } });
		expect(value.type).toBe('password');
		fireEvent.click(screen.getByRole('button', { name: 'Show value' }));
		expect(value.type).toBe('text');
		expect(value.value).toBe('Bearer secret');
		fireEvent.click(screen.getByRole('button', { name: 'Hide value' }));
		expect(value.type).toBe('password');
		fireEvent.click(screen.getByRole('button', { name: 'Remove header 1' }));
		expect(screen.queryByLabelText('Header name 1')).toBeNull();
	});
});
