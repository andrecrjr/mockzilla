import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
	type ExtensionMock,
	ExtensionMockForm,
} from '../../components/extension-mock-form';

const legacyMock: ExtensionMock = {
	id: 'mock-1',
	name: 'Users',
	method: 'GET',
	statusCode: 200,
	enabled: true,
	pattern: '/users/*/status/*',
	body: '{}',
	response: '{}',
	matchType: 'wildcard',
	variants: [
		{
			key: 'alice|active',
			statusCode: 200,
			body: '{"ok":true}',
			bodyType: 'json',
		},
	],
};

describe('ExtensionMockForm', () => {
	afterEach(cleanup);

	it('migrates legacy variant keys into structured capture inputs', async () => {
		const onSave = mock(async (_updatedMock: ExtensionMock) => undefined);

		render(
			<ExtensionMockForm
				mock={legacyMock}
				onSave={onSave}
				onCancel={() => undefined}
				isUpdating={false}
			/>,
		);

		expect(
			(screen.getByLabelText('Wildcard capture 1') as HTMLInputElement).value,
		).toBe('alice');
		expect(
			(screen.getByLabelText('Wildcard capture 2') as HTMLInputElement).value,
		).toBe('active');
		expect(screen.queryByLabelText('Variant Key (Capture Result)')).toBeNull();

		fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
		await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

		const savedMock = onSave.mock.calls[0]?.[0];
		expect(savedMock?.variants?.[0]?.captures).toEqual(['alice', 'active']);
		expect(savedMock?.variants?.[0]?.key).toBe('alice|active');
	});

	it('keeps a literal pipe in a single wildcard capture', () => {
		render(
			<ExtensionMockForm
				mock={{
					...legacyMock,
					pattern: '/files/*',
					variants: [
						{
							key: 'alpha|beta',
							statusCode: 200,
							body: '{}',
							bodyType: 'json',
						},
					],
				}}
				onSave={mock(async () => undefined)}
				onCancel={() => undefined}
				isUpdating={false}
			/>,
		);

		expect(
			(screen.getByLabelText('Wildcard capture 1') as HTMLInputElement).value,
		).toBe('alpha|beta');
		expect(screen.queryByLabelText('Wildcard capture 2')).toBeNull();
	});
});
