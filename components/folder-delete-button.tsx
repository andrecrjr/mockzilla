'use client';

import { Trash2 } from 'lucide-react';
import type * as React from 'react';
import { ConfirmDestructiveAction } from '@/components/confirm-destructive-action';
import { Button } from '@/components/ui/button';

interface FolderDeleteButtonProps {
	folderId: string;
	folderName: string;
	onDelete: (id: string) => void | Promise<void>;
	description?: string;
	confirmLabel?: string;
	ariaLabel?: string;
	size?: 'sm' | 'icon';
	className?: string;
	onTriggerClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export function FolderDeleteButton({
	folderId,
	folderName,
	onDelete,
	description = `This will permanently delete the folder "${folderName}" and all of its mocks. This action cannot be undone.`,
	confirmLabel = 'Delete Folder',
	ariaLabel = `Delete folder ${folderName}`,
	size = 'sm',
	className,
	onTriggerClick,
}: FolderDeleteButtonProps) {
	return (
		<ConfirmDestructiveAction
			trigger={
				<Button
					type="button"
					variant="ghost"
					size={size}
					onClick={onTriggerClick}
					aria-label={ariaLabel}
					className={className}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			}
			title="Delete folder?"
			description={description}
			confirmLabel={confirmLabel}
			onConfirm={() => onDelete(folderId)}
		/>
	);
}
