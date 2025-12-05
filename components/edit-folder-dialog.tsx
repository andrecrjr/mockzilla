'use client';

import { Pencil } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Folder } from '@/lib/types';

interface EditFolderDialogProps {
	folder: Folder;
	onUpdate: (id: string, name: string) => Promise<void>;
}

export function EditFolderDialog({ folder, onUpdate }: EditFolderDialogProps) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState(folder.name);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!name.trim()) {
			toast.error('Validation Error', {
				description: 'Folder name cannot be empty',
			});
			return;
		}

		if (name === folder.name) {
			toast.info('No Changes', {
				description: 'Folder name is the same',
			});
			setOpen(false);
			return;
		}

		setIsLoading(true);
		try {
			await onUpdate(folder.id, name);
			setOpen(false);
		} catch (error) {
			// Error toast is handled in the parent component via onUpdate
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-9 w-9 p-0"
					onClick={(e) => e.stopPropagation()}
				>
					<Pencil className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="mockzilla-border border-2">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Edit Folder</DialogTitle>
						<DialogDescription>
							Update the folder name. The URL slug will be automatically
							updated.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="name">Folder Name</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="My API Folder"
								required
								autoFocus
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading || !name.trim()}>
							{isLoading ? 'Updating...' : 'Update Folder'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
