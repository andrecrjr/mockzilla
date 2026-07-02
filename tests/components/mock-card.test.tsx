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

mock.module('sonner', () => ({
	toast: {
		error: mock(() => undefined),
	},
}));

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
	afterEach(cleanup);

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

	it('moves inline path search params into queryParams updates', async () => {
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
		expect(onUpdate).toHaveBeenCalledWith(
			'mock-1',
			{
				path: '/users/2',
				queryParams: { status: 'active' },
			},
		);
	});
});
