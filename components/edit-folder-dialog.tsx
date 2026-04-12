'use client';

import { Pencil } from 'lucide-react';
import type React from 'react';
import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import type { Folder } from '@/lib/types';

interface EditFolderDialogProps {
	folder: Folder;
	onUpdate: (id: string, name: string, description?: string, slug?: string) => Promise<void>;
}

function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');
}

export function EditFolderDialog({ folder, onUpdate }: EditFolderDialogProps) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState(folder.name);
	const [description, setDescription] = useState(folder.description || '');
	const [slug, setSlug] = useState(folder.slug);
	const [useCustomSlug, setUseCustomSlug] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Reset form when dialog opens
	useEffect(() => {
		if (open) {
			setName(folder.name);
			setDescription(folder.description || '');
			setSlug(folder.slug);
			setUseCustomSlug(false);
		}
	}, [open, folder]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!name.trim()) {
			toast.error('Validation Error', {
				description: 'Folder name cannot be empty',
			});
			return;
		}

		if (!slug.trim()) {
			toast.error('Validation Error', {
				description: 'Slug cannot be empty',
			});
			return;
		}

		const hasChanges = 
			name !== folder.name || 
			description !== (folder.description || '') || 
			slug !== folder.slug;

		if (!hasChanges) {
			toast.info('No Changes', {
				description: 'No changes were made',
			});
			setOpen(false);
			return;
		}

		setIsLoading(true);
		try {
			await onUpdate(
				folder.id, 
				name, 
				description.trim() || undefined, 
				useCustomSlug ? slug.trim() : undefined
			);
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
							Update the folder details. The URL slug can be customized.
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

						<div className="space-y-2">
							<Label htmlFor="description">Description (Optional)</Label>
							<Textarea
								id="description"
								placeholder="Describe what this folder contains..."
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
							/>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="slug">URL Slug</Label>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
									onClick={() => setUseCustomSlug(!useCustomSlug)}
								>
									{useCustomSlug ? "Auto-generate" : "Customize"}
								</Button>
							</div>
							<Input
								id="slug"
								value={slug}
								onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
								disabled={!useCustomSlug}
								placeholder="e.g., user-apis"
							/>
							<p className="text-xs text-muted-foreground">
								URL: /api/mock/<span className="font-mono">{slug}</span>/...
							</p>
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
						<Button type="submit" disabled={isLoading || !name.trim() || !slug.trim()}>
							{isLoading ? 'Updating...' : 'Update Folder'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
