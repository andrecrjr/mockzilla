import { afterEach, describe, expect, it, mock } from 'bun:test';
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { MockCard } from '../../components/mock-card';
import type { Folder, Mock } from '../../lib/types';

const toastError = mock(() => undefined);

mock.module('sonner', () => ({
	toast: {
		error: toastError,
	},
}));

interface TestTauriInternals {
	invoke: (command: string, args: Record<string, unknown>) => Promise<void>;
}

interface TestTauriWindow extends Window {
	__TAURI_INTERNALS__?: TestTauriInternals;
}

const folder: Folder = {
	id: 'folder-1',
	name: 'API',
	slug: 'api',
	createdAt: '2024-01-01T00:00:00.000Z',
};

const baseMock: Mock = {
	id: 'mock-1',
	name: 'Get User',
	path: '/users/1',
	method: 'GET',
	response: '{"id":1}',
	statusCode: 200,
	folderId: folder.id,
	matchType: 'exact',
	bodyType: 'json',
	enabled: true,
	queryParams: null,
	variants: null,
	wildcardRequireMatch: false,
	jsonSchema: '',
	useDynamicResponse: false,
	echoRequestBody: false,
	delay: 0,
	meta: { version: 'current' },
	createdAt: '2024-01-01T00:00:00.000Z',
};

describe('MockCard', () => {
	afterEach(() => {
		cleanup();
		toastError.mockClear();
		delete (window as TestTauriWindow).__TAURI_INTERNALS__;
	});

	it('saves inline path edits without replaying stale mock fields', async () => {
		const onUpdate = mock(async () => undefined);

		render(
			<MockCard
				mock={baseMock}
				folder={folder}
				onDelete={mock(() => undefined)}
				onDuplicate={mock(() => undefined)}
				onUpdate={onUpdate}
				onCopy={mock(() => undefined)}
			/>,
		);

		const pathInput = screen.getByTitle('Edit path directly');
		fireEvent.change(pathInput, { target: { value: '/users/2' } });
		fireEvent.blur(pathInput);

		await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
		expect(onUpdate).toHaveBeenCalledWith('mock-1', { path: '/users/2' });
	});

	it('copies inline path search params into queryParams updates without removing them from the field', async () => {
		const onUpdate = mock(async () => undefined);
		const mockWithQueryParams: Mock = {
			...baseMock,
			queryParams: { status: 'active' },
		};

		render(
			<MockCard
				mock={mockWithQueryParams}
				folder={folder}
				onDelete={mock(() => undefined)}
				onDuplicate={mock(() => undefined)}
				onUpdate={onUpdate}
				onCopy={mock(() => undefined)}
			/>,
		);

		const pathInput = screen.getByTitle('Edit path directly');
		fireEvent.change(pathInput, {
			target: { value: '/users/2?status=active' },
		});
		fireEvent.blur(pathInput);

		await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
		expect(onUpdate).toHaveBeenCalledWith('mock-1', {
			path: '/users/2',
			queryParams: { status: 'active' },
		});
		expect((pathInput as HTMLInputElement).value).toBe(
			'/users/2?status=active',
		);
	});

	it('renders inline editable paths with configured query params', () => {
		render(
			<MockCard
				mock={{ ...baseMock, queryParams: { status: 'active' } }}
				folder={folder}
				onDelete={mock(() => undefined)}
				onDuplicate={mock(() => undefined)}
				onUpdate={mock(async () => undefined)}
				onCopy={mock(() => undefined)}
			/>,
		);

		expect(
			(screen.getByTitle('Edit path directly') as HTMLInputElement).value,
		).toBe('/users/1?status=active');
	});

	it('renders subfolder mock URLs without duplicating the folder slug', () => {
		const subfolderMockWithFullPath: Mock = {
			...baseMock,
			path: '/ticket-management/app/ticket-type',
			relativePath: '/ticket-management/app/ticket-type',
			effectivePath: '/app/ticket-management/app/ticket-type',
			folderId: folder.id,
		};

		render(
			<MockCard
				mock={subfolderMockWithFullPath}
				folder={{ ...folder, slug: 'ticket-management' }}
				onDelete={mock(() => undefined)}
				onDuplicate={mock(() => undefined)}
				onUpdate={mock(async () => undefined)}
				onCopy={mock(() => undefined)}
			/>,
		);

		expect(
			screen.getByDisplayValue(
				/\/api\/mock\/ticket-management\/app\/ticket-type$/,
			),
		).toBeDefined();
		expect(
			screen.queryByDisplayValue(
				/\/api\/mock\/ticket-management\/app\/ticket-management/,
			),
		).toBeNull();
	});

	it('opens the mock URL in a browser outside Tauri', async () => {
		const originalOpen = window.open;
		const open = mock(() => null);
		window.open = open as typeof window.open;

		try {
			render(
				<MockCard
					mock={baseMock}
					folder={folder}
					onDelete={mock(() => undefined)}
					onUpdate={mock(async () => undefined)}
					onCopy={mock(() => undefined)}
				/>,
			);

			fireEvent.click(screen.getByTitle('Open mock URL'));

			await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
			expect(open).toHaveBeenCalledWith(
				expect.stringContaining('/api/mock/api/users/1'),
				'_blank',
				'noopener,noreferrer',
			);
		} finally {
			window.open = originalOpen;
		}
	});

	it('reports Tauri opener failures and blocks duplicate pending clicks', async () => {
		let rejectInvoke: ((reason: Error) => void) | undefined;
		const invoke = mock(
			() =>
				new Promise<void>((_resolve, reject) => {
					rejectInvoke = reject;
				}),
		);
		Object.defineProperty(window, '__TAURI_INTERNALS__', {
			configurable: true,
			value: { invoke },
		});

		render(
			<MockCard
				mock={baseMock}
				folder={folder}
				onDelete={mock(() => undefined)}
				onUpdate={mock(async () => undefined)}
				onCopy={mock(() => undefined)}
			/>,
		);

		const openButton = screen.getByTitle('Open mock URL');
		fireEvent.click(openButton);
		fireEvent.click(openButton);

		await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
		expect(openButton.getAttribute('aria-busy')).toBe('true');
		rejectInvoke?.(new Error('opener denied'));

		await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
		expect(toastError).toHaveBeenCalledWith('Unable to open mock URL', {
			description: 'opener denied',
		});
		await waitFor(() =>
			expect(openButton.getAttribute('aria-busy')).toBe('false'),
		);
	});
});
