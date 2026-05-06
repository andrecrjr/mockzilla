'use client';

import { Folder, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Folder as FolderType, Mock } from '@/lib/types';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EditFolderDialog } from './edit-folder-dialog';

interface FolderListProps {
	folders: FolderType[];
	mocks: Mock[];
	isLoading: boolean;
	onDeleteFolder: (id: string) => void;
	onUpdateFolder: (id: string, name: string) => Promise<void>;
	onCopy: (text: string) => void;
}

export function FolderList({
	folders,
	mocks,
	isLoading,
	onDeleteFolder,
	onUpdateFolder,
}: FolderListProps) {
	if (isLoading) {
		return (
			<Card className="border-border bg-card p-6">
				<p className="text-center text-muted-foreground">Loading...</p>
			</Card>
		);
	}

	if (folders.length === 0) {
		return (
			<Card className="border-border bg-card p-12">
				<div className="text-center">
					<Folder className="mx-auto h-12 w-12 text-muted-foreground/50" />
					<p className="mt-4 text-lg font-medium text-muted-foreground">
						No folders created yet
					</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Create your first folder to organize your mocks
					</p>
				</div>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{folders.map((folder) => {
				const folderMocks = mocks.filter((mock) => mock.folderId === folder.id);

				return (
					<Card
						key={folder.id}
						className="border-border bg-card p-0 overflow-hidden group hover:border-primary/50 transition-colors"
					>
						<Link href={`/app/folder/${folder.slug}`}>
							<div className="p-6 cursor-pointer hover:bg-muted/50 transition-colors">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
										<Folder className="h-5 w-5 text-primary" />
									</div>
									<div className="flex-1">
										<h3 className="text-lg font-semibold text-card-foreground">
											{folder.name}
										</h3>
										<p className="text-sm text-muted-foreground">
											{folderMocks.length}{' '}
											{folderMocks.length === 1 ? 'mock' : 'mocks'}
										</p>
									</div>
								</div>
							</div>
						</Link>

						<div className="border-t border-border bg-muted/50 px-6 py-3 flex items-center justify-between">
							<div className="flex gap-1">
								<EditFolderDialog folder={folder} onUpdate={onUpdateFolder} />
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="text-destructive hover:bg-destructive/10 hover:text-destructive"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>Are you sure?</AlertDialogTitle>
											<AlertDialogDescription>
												This will permanently delete the folder "{folder.name}"
												and all its associated mocks. This action cannot be
												undone.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Cancel</AlertDialogCancel>
											<AlertDialogAction
												onClick={() => onDeleteFolder(folder.id)}
												className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
											>
												Delete All Mocks
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
							<p className="text-xs text-muted-foreground">
								Click to open folder
							</p>
						</div>
					</Card>
				);
			})}
		</div>
	);
}
