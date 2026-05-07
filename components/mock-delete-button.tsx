'use client';

import { Trash2 } from 'lucide-react';
import { ConfirmDestructiveAction } from '@/components/confirm-destructive-action';
import { Button } from '@/components/ui/button';

interface MockDeleteButtonProps {
	mockId: string;
	mockName: string;
	onDelete: (id: string) => void | Promise<void>;
}

export function MockDeleteButton({
	mockId,
	mockName,
	onDelete,
}: MockDeleteButtonProps) {
	return (
		<ConfirmDestructiveAction
			trigger={
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label={`Delete mock ${mockName}`}
					className="text-destructive hover:bg-destructive/10 hover:text-destructive"
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			}
			title="Delete mock?"
			description={`This will permanently delete the mock endpoint "${mockName}". This action cannot be undone.`}
			confirmLabel="Delete Mock"
			onConfirm={() => onDelete(mockId)}
		/>
	);
}
