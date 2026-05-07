import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FolderDeleteButton } from '../../components/folder-delete-button';

describe('FolderDeleteButton', () => {
	afterEach(cleanup);

	it('requires confirmation before deleting a folder', () => {
		const onDelete = mock(() => undefined);

		render(
			<FolderDeleteButton
				folderId="folder-1"
				folderName="Billing APIs"
				onDelete={onDelete}
			/>,
		);

		fireEvent.click(screen.getByRole('button', { name: /delete folder billing apis/i }));

		expect(onDelete).not.toHaveBeenCalled();
		expect(screen.getByText(/all of its mocks/i)).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: /^delete folder$/i }));

		expect(onDelete).toHaveBeenCalledTimes(1);
		expect(onDelete).toHaveBeenCalledWith('folder-1');
	});
});
