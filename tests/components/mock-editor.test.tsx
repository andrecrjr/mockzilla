import { afterEach, describe, expect, it, mock } from 'bun:test';
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { MockEditor } from '../../components/mock-editor';

mock.module('sonner', () => ({
	toast: {
		error: mock(() => undefined),
		success: mock(() => undefined),
	},
}));

describe('MockEditor', () => {
	afterEach(cleanup);

	it('previews subfolder mocks without duplicating folder slug in the endpoint path', () => {
		render(
			<MockEditor
				mode="create"
				defaultFolderId="folder-1"
				defaultMockFolderId="subfolder-1"
				previewSlug="ticket-management"
				folders={[
					{
						id: 'folder-1',
						name: 'Ticket Management',
						slug: 'ticket-management',
						createdAt: '2024-01-01T00:00:00.000Z',
					},
				]}
				mockSubfolders={[
					{
						id: 'subfolder-1',
						folderId: 'folder-1',
						parentId: null,
						name: 'App',
						segment: 'app',
						path: '/app',
						createdAt: '2024-01-01T00:00:00.000Z',
					},
				]}
				initial={{
					name: 'Ticket Type',
					path: '/ticket-management/app/ticket-type',
					response: '{}',
					statusCode: '200',
				}}
				onSubmit={mock(async () => undefined)}
			/>,
		);

		expect(
			screen.getByText(/\/api\/mock\/ticket-management\/app\/ticket-type$/),
		).toBeDefined();
		expect(
			screen.queryByText(/\/api\/mock\/ticket-management\/app\/ticket-management/),
		).toBeNull();
	});

	it('submits subfolder mock paths relative to the selected subfolder', async () => {
		const onSubmit = mock(async () => undefined);

		render(
			<MockEditor
				mode="create"
				defaultFolderId="folder-1"
				defaultMockFolderId="subfolder-1"
				previewSlug="ticket-management"
				folders={[
					{
						id: 'folder-1',
						name: 'Ticket Management',
						slug: 'ticket-management',
						createdAt: '2024-01-01T00:00:00.000Z',
					},
				]}
				mockSubfolders={[
					{
						id: 'subfolder-1',
						folderId: 'folder-1',
						parentId: null,
						name: 'App',
						segment: 'app',
						path: '/app',
						createdAt: '2024-01-01T00:00:00.000Z',
					},
				]}
				initial={{
					name: 'Ticket Type',
					path: '/ticket-management/app/ticket-type',
					response: '{}',
					statusCode: '200',
				}}
				onSubmit={onSubmit}
			/>,
		);

		fireEvent.click(
			screen.getByRole('button', { name: 'Create Mock Endpoint' }),
		);

		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				path: '/ticket-type',
				mockFolderId: 'subfolder-1',
			}),
		);
	});

	it('moves endpoint path search params into submitted queryParams', async () => {
		const onSubmit = mock(async () => undefined);

		render(
			<MockEditor
				mode="create"
				defaultFolderId="folder-1"
				initial={{ name: 'Users', response: '{}', statusCode: '200' }}
				onSubmit={onSubmit}
			/>,
		);

		fireEvent.change(screen.getByLabelText('Endpoint Path'), {
			target: { value: '/users/*?status=active&page=1' },
		});
		fireEvent.click(
			screen.getByRole('button', { name: 'Create Mock Endpoint' }),
		);

		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				path: '/users/*',
				queryParams: { status: 'active', page: '1' },
			}),
		);
	});

	it('opens Mock Response by default when editing a mock with advanced settings', () => {
		render(
			<MockEditor
				mode="edit"
				defaultFolderId="folder-1"
				initial={{
					name: 'Users',
					path: '/users',
					response: '{}',
					statusCode: '200',
					queryParams: { page: '2' },
					delay: '300',
					meta: { proxyTargetUrl: 'https://example.com/users' },
				}}
				onSubmit={mock(async () => undefined)}
			/>,
		);

		expect(screen.getByRole('heading', { name: 'Mock Response' })).toBeDefined();
		expect(
			screen.queryByRole('heading', { name: 'Advanced Options' }),
		).toBeNull();
	});

	it('keeps exact matching by default when the endpoint path contains a wildcard', async () => {
		const onSubmit = mock(async () => undefined);

		render(
			<MockEditor
				mode="create"
				defaultFolderId="folder-1"
				initial={{ name: 'Users', response: '{}', statusCode: '200' }}
				onSubmit={onSubmit}
			/>,
		);

		fireEvent.change(screen.getByLabelText('Endpoint Path'), {
			target: { value: '/users/*' },
		});
		fireEvent.click(
			screen.getByRole('button', { name: 'Create Mock Endpoint' }),
		);

		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ matchType: 'exact', path: '/users/*' }),
		);
	});

	it('keeps exact matching when an existing wildcard path has no match type', () => {
		render(
			<MockEditor
				mode="edit"
				defaultFolderId="folder-1"
				initial={{
					name: 'Users',
					path: '/users/*',
					response: '{}',
					statusCode: '200',
				}}
				onSubmit={mock(async () => undefined)}
			/>,
		);

		expect(screen.getByLabelText('Match Type').textContent).toContain('Exact');
	});

	it('submits wildcard variants without requiring a hidden base response', async () => {
		const onSubmit = mock(async () => undefined);

		render(
			<MockEditor
				mode="create"
				defaultFolderId="folder-1"
				initial={{
					name: 'Users',
					path: '/users/*',
					response: '',
					matchType: 'wildcard',
					statusCode: '200',
					variants: [
						{
							key: 'test',
							body: '{"id":1}',
							statusCode: 200,
							bodyType: 'json',
						},
					],
				}}
				onSubmit={onSubmit}
			/>,
		);

		fireEvent.click(
			screen.getByRole('button', { name: 'Create Mock Endpoint' }),
		);

		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
	});

	it('shows variants as the response editor for wildcard matching', () => {
		render(
			<MockEditor
				mode="edit"
				defaultFolderId="folder-1"
				initial={{
					name: 'Users',
					path: '/users/*',
					response: '{"source":"manual"}',
					jsonSchema: '{"type":"object"}',
					matchType: 'wildcard',
					statusCode: '200',
					variants: [
						{
							key: '123',
							body: '{"source":"variant"}',
							statusCode: 200,
							bodyType: 'json',
						},
					],
				}}
				onSubmit={mock(async () => undefined)}
			/>,
		);

		expect(screen.getAllByText('Mock Response').length).toBeGreaterThan(1);
		expect(
			screen.getAllByRole('textbox', { name: 'Manual JSON response' }).length,
		).toBe(1);
		expect(
			screen.queryAllByRole('textbox', { name: 'Dynamic response schema' }).length,
		).toBe(0);
		expect(screen.getAllByText('Active response source').length).toBe(1);
		expect(screen.getByLabelText('Wildcard capture 1')).toBeDefined();
	});

	it('does not split query params while a user is still typing', () => {
		render(
			<MockEditor
				mode="create"
				defaultFolderId="folder-1"
				initial={{ name: 'Users', response: '{}', statusCode: '200' }}
				onSubmit={mock(async () => undefined)}
			/>,
		);

		const pathInput = screen.getByLabelText('Endpoint Path');
		fireEvent.change(pathInput, {
			target: { value: '/users/*?status=' },
		});

		expect((pathInput as HTMLInputElement).value).toBe('/users/*?status=');
		expect(screen.queryByDisplayValue('status')).toBeNull();
	});

	it('copies endpoint path search params into Advanced Options on blur without removing them from the path', async () => {
		render(
			<MockEditor
				mode="create"
				defaultFolderId="folder-1"
				initial={{ name: 'Users', response: '{}', statusCode: '200' }}
				onSubmit={mock(async () => undefined)}
			/>,
		);

		const pathInput = screen.getByLabelText('Endpoint Path');
		fireEvent.change(pathInput, {
			target: { value: '/users/*?status=active&page=1' },
		});
		fireEvent.blur(pathInput);

		await waitFor(() =>
			expect((pathInput as HTMLInputElement).value).toBe(
				'/users/*?status=active&page=1',
			),
		);
		expect(screen.getByDisplayValue('status')).toBeDefined();
		expect(screen.getByDisplayValue('active')).toBeDefined();
		expect(screen.getByDisplayValue('page')).toBeDefined();
		expect(screen.getByDisplayValue('1')).toBeDefined();
	});

	it('removes Advanced Options query params deleted from the endpoint path on blur', async () => {
		render(
			<MockEditor
				mode="edit"
				defaultFolderId="folder-1"
				initial={{
					name: 'Users',
					path: '/users',
					response: '{}',
					statusCode: '200',
					queryParams: { status: 'active', page: '1' },
				}}
				onSubmit={mock(async () => undefined)}
			/>,
		);

		const pathInput = screen.getByLabelText('Endpoint Path');
		fireEvent.change(pathInput, { target: { value: '/users?status=active' } });
		fireEvent.blur(pathInput);

		await waitFor(() =>
			expect(screen.queryByDisplayValue('page')).toBeNull(),
		);
		expect(screen.queryByDisplayValue('1')).toBeNull();
		expect(screen.getByDisplayValue('status')).toBeDefined();
		expect(screen.getByDisplayValue('active')).toBeDefined();
	});

	it('does not submit query params removed from the endpoint path before blur', async () => {
		const onSubmit = mock(async () => undefined);
		render(
			<MockEditor
				mode="edit"
				defaultFolderId="folder-1"
				initial={{
					name: 'Users',
					path: '/users',
					response: '{}',
					statusCode: '200',
					queryParams: { status: 'active', page: '1' },
				}}
				onSubmit={onSubmit}
			/>,
		);

		fireEvent.change(screen.getByLabelText('Endpoint Path'), {
			target: { value: '/users?status=active' },
		});
		const form = screen
			.getByRole('button', { name: 'Save Changes' })
			.closest('form');
		if (!form) throw new Error('Mock editor form was not found');
		fireEvent.submit(form);

		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ queryParams: { status: 'active' } }),
		);
	});

	it('hydrates the endpoint path with configured query params in the frontend', () => {
		render(
			<MockEditor
				mode="edit"
				defaultFolderId="folder-1"
				initial={{
					name: 'Users',
					path: '/users/*',
					response: '{}',
					statusCode: '200',
					queryParams: { status: 'active' },
				}}
				onSubmit={mock(async () => undefined)}
			/>,
		);

		expect(
			(screen.getByLabelText('Endpoint Path') as HTMLInputElement).value,
		).toBe('/users/*?status=active');
	});

	it('syncs Advanced Options query param edits into the endpoint path input and preview', async () => {
		render(
			<MockEditor
				mode="create"
				defaultFolderId="folder-1"
				folders={[
					{
						id: 'folder-1',
						name: 'API',
						slug: '/api',
						createdAt: '2024-01-01T00:00:00.000Z',
					},
				]}
				initial={{
					name: 'Users',
					folderId: 'folder-1',
					response: '{}',
					statusCode: '200',
				}}
				onSubmit={mock(async () => undefined)}
			/>,
		);

		const pathInput = screen.getByLabelText('Endpoint Path') as HTMLInputElement;
		fireEvent.change(pathInput, {
			target: { value: '/users/*?status=active' },
		});
		fireEvent.blur(pathInput);
		await waitFor(() => expect(screen.getByDisplayValue('active')).toBeDefined());
		fireEvent.change(screen.getByDisplayValue('active'), {
			target: { value: 'inactive' },
		});

		await waitFor(() =>
			expect(pathInput.value).toBe('/users/*?status=inactive'),
		);
		expect(
			screen.getByText(/\/api\/mock\/api\/users\/\*\?status=inactive$/),
		).toBeDefined();
	});

	for (const method of ['POST', 'PUT', 'PATCH'] as const) {
		it(`submits ${method} echo mocks without requiring a configured response`, async () => {
			const onSubmit = mock(async () => undefined);

			render(
				<MockEditor
					mode="create"
					defaultFolderId="folder-1"
					initial={{
						name: `${method} echo`,
						path: '/echo',
						method,
						response: '',
						statusCode: '200',
						echoRequestBody: true,
					}}
					onSubmit={onSubmit}
				/>,
			);

			fireEvent.click(
				screen.getByRole('button', { name: 'Create Mock Endpoint' }),
			);

			await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({
					method,
					path: '/echo',
					echoRequestBody: true,
				}),
			);
		});
	}

	it('does not submit stale echoRequestBody for non-echo methods', async () => {
		const onSubmit = mock(async () => undefined);

		render(
			<MockEditor
				mode="create"
				defaultFolderId="folder-1"
				initial={{
					name: 'GET stale echo',
					path: '/users',
					method: 'GET',
					response: '{}',
					statusCode: '200',
					echoRequestBody: true,
				}}
				onSubmit={onSubmit}
			/>,
		);

		fireEvent.click(
			screen.getByRole('button', { name: 'Create Mock Endpoint' }),
		);

		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'GET',
				echoRequestBody: false,
			}),
		);
	});

	it('refreshes edit inputs when the persisted mock revision changes', async () => {
		const onSubmit = mock(async () => undefined);
		const { rerender } = render(
			<MockEditor
				mode="edit"
				defaultFolderId="folder-1"
				initialRevision="mock-1:old"
				initial={{
					name: 'Old mock',
					path: '/old',
					method: 'GET',
					response: '{"version":"old"}',
					statusCode: '200',
					delay: '111',
				}}
				onSubmit={onSubmit}
			/>,
		);

		rerender(
			<MockEditor
				mode="edit"
				defaultFolderId="folder-1"
				initialRevision="mock-1:new"
				initial={{
					name: 'New mock',
					path: '/new',
					method: 'PUT',
					response: '{"version":"new"}',
					statusCode: '202',
					delay: '333',
				}}
				onSubmit={onSubmit}
			/>,
		);

		await waitFor(() =>
			expect(
				(screen.getByLabelText('Mock Name') as HTMLInputElement).value,
			).toBe('New mock'),
		);
		expect(
			(screen.getByLabelText('Endpoint Path') as HTMLInputElement).value,
		).toBe('/new');
		expect(
			(screen.getByLabelText('Response Delay (ms)') as HTMLInputElement).value,
		).toBe('333');
		expect(screen.getByDisplayValue('{"version":"new"}')).toBeDefined();
		expect(screen.getAllByText('PUT').length).toBeGreaterThan(0);
		expect(screen.getAllByText('202 - Accepted').length).toBeGreaterThan(0);
	});
});
