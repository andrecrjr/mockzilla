'use client';

import { FolderIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR, { mutate } from 'swr';

import { EditFolderDialog } from '@/components/edit-folder-dialog';
import { PaginationControls } from '@/components/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Folder } from '@/lib/types';

const fetcher = (url: string) =>
	fetch(url)
		.then((res) => res.json())
		.catch((err) => {
			console.log('[ExtensionList] Fetch error:', err);
			return [];
		});

export function MockExtensionList() {
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);

	const { data, isLoading } = useSWR<{
		data: Folder[];
		meta: { total: number; page: number; limit: number; totalPages: number };
	}>(`/api/folders?page=${page}&limit=${limit}&type=extension`, fetcher, {
		onError: (error) => {
			console.log('[ExtensionList] SWR error:', error);
			toast.error('Failed to load extension folders', {
				description: 'There was an error connecting to the server',
			});
		},
	});

	const folders = data?.data || [];
	const meta = data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

	const handleDeleteFolder = async (id: string) => {
		try {
			await fetch(`/api/folders?id=${id}`, { method: 'DELETE' });
			toast.success('Folder Deleted', {
				description: 'Folder and its synced mocks have been removed (only in server)',
			});
			mutate(`/api/folders?page=${page}&limit=${limit}&type=extension`);
		} catch {
			toast.error('Error', {
				description: 'Failed to delete folder',
			});
		}
	};

	const handleUpdateFolder = async (id: string, name: string) => {
		try {
			const response = await fetch(`/api/folders?id=${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error);
			}

			toast.success('Folder Updated', {
				description: 'Folder has been updated successfully',
			});
			mutate(`/api/folders?page=${page}&limit=${limit}&type=extension`);
		} catch (error: unknown) {
			toast.error('Error', {
				description: error instanceof Error ? error.message : 'Failed to update folder',
			});
		}
	};

	if (isLoading) {
		return (
			<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
				<p className="text-center text-muted-foreground">Loading extension data...</p>
			</Card>
		);
	}

	if (folders.length === 0) {
		return (
			<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-12">
				<div className="text-center">
					<FolderIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
					<p className="mt-4 text-lg font-semibold text-muted-foreground">
						No extension folders found
					</p>
					<p className="mt-1 text-sm text-muted-foreground/75">
						Sync data from the Mockzilla Chrome Extension to see it here.
					</p>
				</div>
			</Card>
		);
	}

	return (
		<div>
			<div className="mb-4 flex items-center justify-end">
				<span className="rounded-lg bg-indigo-500/20 px-3 py-1 text-sm font-semibold text-indigo-500 mockzilla-border">
					{meta.total} {meta.total === 1 ? 'folder' : 'folders'}
				</span>
			</div>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{folders.map((folder) => (
					<Card key={folder.id} className="mockzilla-border mockzilla-card-hover group border-2 bg-card/50 backdrop-blur-sm h-full border-indigo-500/20">
						<div className="p-6">
							<div className="flex items-start justify-between">
								<Link href={`/extension-data/${folder.slug}`} key={folder.id}>
									<div className="flex items-center gap-3 flex-1">
										<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/20 transition-all group-hover:bg-indigo-500/30">
											<FolderIcon className="h-6 w-6 text-indigo-500" />
										</div>
										<div className="flex-1 min-w-0">
											<h3 className="text-lg font-semibold text-card-foreground group-hover:text-indigo-400 transition-colors truncate">
												{folder.name}
											</h3>
											<p className="text-sm text-muted-foreground truncate">
												/{folder.slug}
											</p>
											{(() => {
												const meta = folder.meta as Record<string, unknown>;
												const extData = meta?.extensionSyncData as { mocks?: Array<{ variants?: unknown[] }> } | undefined;
												const mockCount = extData?.mocks?.length || 0;
												const variantCount = extData?.mocks?.reduce((acc, m) => acc + (m.variants?.length || 0), 0) || 0;
												
												return (
													<div className="mt-2 flex gap-4 text-xs text-muted-foreground">
														{mockCount > 0 && <span>{mockCount} Mocks</span>}
														{variantCount > 0 && <span>{variantCount} Variants</span>}
														{!mockCount && !variantCount && <span>Synced Data</span>}
													</div>
												);
											})()}
										</div>
									</div>
								</Link>
							</div>
							<div className="flex gap-1 border-t border-border mt-4 pt-3">
								<EditFolderDialog
									folder={folder}
									onUpdate={handleUpdateFolder}
								/>
								<Button
									variant="ghost"
									size="sm"
									onClick={(e) => {
										e.preventDefault();
										handleDeleteFolder(folder.id);
									}}
									className="text-destructive hover:bg-destructive/10 hover:text-destructive"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</Card>
				))}
			</div>
			
			<div className="mt-8">
				<PaginationControls
					currentPage={page}
					totalPages={meta.totalPages}
					onPageChange={setPage}
					limit={limit}
					onLimitChange={setLimit}
					totalItems={meta.total}
				/>
			</div>
		</div>
	);
}
