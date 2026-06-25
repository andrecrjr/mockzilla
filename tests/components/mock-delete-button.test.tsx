import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MockDeleteButton } from '../../components/mock-delete-button';

describe('MockDeleteButton', () => {
	afterEach(cleanup);

	it('requires confirmation before deleting a mock', () => {
		const onDelete = mock(() => undefined);

		render(
			<MockDeleteButton
				mockId="mock-1"
				mockName="Get User"
				onDelete={onDelete}
			/>,
		);

		fireEvent.click(screen.getByRole('button', { name: /delete mock get user/i }));

		expect(onDelete).not.toHaveBeenCalled();
		expect(screen.getByText(/mock endpoint "Get User"/i)).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: /^delete mock$/i }));

		expect(onDelete).toHaveBeenCalledTimes(1);
		expect(onDelete).toHaveBeenCalledWith('mock-1');
	});
});
