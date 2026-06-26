'use client';

import {
	ArrowLeft,
	ArrowUp,
	FolderOpen,
	FolderPlus,
	Pencil,
	Plus,
	Search,
	Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type React from 'react';
import { Suspense, useEffect, useState } from 'react';
import { useQueryState, parseAsInteger, parseAsString } from 'nuqs';
import { toast } from 'sonner';
import useSWR, { mutate } from 'swr';
import { CreateMockDialog } from '@/components/create-mock-dialog';
import { MockCard } from '@/components/mock-card';
import { PaginationControls } from '@/components/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Folder, Mock, MockSubfolder, UpdateMockRequest } from '@/lib/types';
import { copyToClipboard } from '@/lib/utils';
import { generateSlug, joinMockPaths } from '@/lib/utils/mock-paths';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function FolderContent() {
	const params = useParams();
	const slug = params.slug as string;
	const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
	const [limit, setLimit] = useQueryState('limit', parseAsInteger.withDefault(10));
	const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
	const [mockFolderId, setMockFolderId] = useQueryState(
		'mockFolderId',
		parseAsString.withDefault('root'),
	);
	const [debouncedSearch, setDebouncedSearch] = useState(search);
	const [newSubfolderName, setNewSubfolderName] = useState('');
	const [newSubfolderSlug, setNewSubfolderSlug] = useState('');
	const [isCreateSubfolderOpen, setIsCreateSubfolderOpen] = useState(false);
	const [editingSubfolder, setEditingSubfolder] = useState<MockSubfolder | null>(
		null,
	);
	const [editSubfolderName, setEditSubfolderName] = useState('');
	const [editSubfolderSlug, setEditSubfolderSlug] = useState('');

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(search);
			setPage(1); // Reset to first page on search
		}, 300);
		return () => clearTimeout(timer);
	}, [search, setPage]);

	const { data: folders = [] } = useSWR<Folder[]>(
		'/api/folders?all=true',
		fetcher,
	);
	const folder = folders.find((f) => f.slug === slug);
	const currentMockFolderId = mockFolderId || 'root';

	const { data: childSubfolders = [] } = useSWR<MockSubfolder[]>(
		folder
			? `/api/mock-subfolders?folderId=${folder.id}&parentId=${currentMockFolderId}`
			: null,
		fetcher,
	);
	const { data: allSubfolders = [] } = useSWR<MockSubfolder[]>(
		folder ? `/api/mock-subfolders?folderId=${folder.id}&all=true` : null,
		fetcher,
	);
	const currentSubfolder =
		currentMockFolderId === 'root'
			? null
			: allSubfolders.find((subfolder) => subfolder.id === currentMockFolderId) ?? null;
	const parentSubfolder = currentSubfolder?.parentId
		? allSubfolders.find((subfolder) => subfolder.id === currentSubfolder.parentId) ?? null
		: null;
	const editingParentSubfolder = editingSubfolder?.parentId
		? allSubfolders.find((subfolder) => subfolder.id === editingSubfolder.parentId) ?? null
		: null;

	const { data, isLoading: mocksLoading } = useSWR<{
		data: Mock[];
		meta: { total: number; page: number; limit: number; totalPages: number };
	}>(
		folder
			? `/api/mocks?folderId=${folder.id}&mockFolderId=${currentMockFolderId}&page=${page}&limit=${limit}&q=${debouncedSearch}`
			: null,
		fetcher,
	);

	const mocks = data?.data || [];
	const meta = data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };
	const newSubfolderPreviewPath = joinMockPaths(
		currentSubfolder?.mainPath ?? '/',
		`/${generateSlug(newSubfolderSlug) || 'subfolder'}`,
	);
	const editSubfolderPreviewPath = editingSubfolder
		? joinMockPaths(
				editingParentSubfolder?.mainPath ?? '/',
				`/${generateSlug(editSubfolderSlug) || editingSubfolder.slug}`,
			)
		: '/';

	const handleMockSuccess = () => {
		toast.success('Mock Created', {
			description: 'Your mock endpoint has been created successfully',
		});
		mutate(
			`/api/mocks?folderId=${folder?.id}&mockFolderId=${currentMockFolderId}&page=${page}&limit=${limit}&q=${debouncedSearch}`,
		);
	};

	const refreshSubfolders = () => {
		if (!folder) return;
		mutate(`/api/mock-subfolders?folderId=${folder.id}&parentId=${currentMockFolderId}`);
		mutate(`/api/mock-subfolders?folderId=${folder.id}&all=true`);
	};

	const handleCreateSubfolder = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!folder) return;
		try {
			const response = await fetch('/api/mock-subfolders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					folderId: folder.id,
					parentId: currentMockFolderId === 'root' ? null : currentMockFolderId,
					name: newSubfolderName,
					slug: newSubfolderSlug,
				}),
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error);
			}
			setNewSubfolderName('');
			setNewSubfolderSlug('');
			setIsCreateSubfolderOpen(false);
			toast.success('Subfolder Created');
			refreshSubfolders();
		} catch (error: unknown) {
			toast.error('Error', {
				description:
					error instanceof Error ? error.message : 'Failed to create subfolder',
			});
		}
	};

	const handleDeleteSubfolder = async (id: string) => {
		try {
			const response = await fetch(`/api/mock-subfolders?id=${id}`, {
				method: 'DELETE',
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error);
			}
			toast.success('Subfolder Deleted');
			refreshSubfolders();
		} catch (error: unknown) {
			toast.error('Error', {
				description:
					error instanceof Error ? error.message : 'Failed to delete subfolder',
			});
		}
	};

	const openEditSubfolder = (subfolder: MockSubfolder) => {
		setEditingSubfolder(subfolder);
		setEditSubfolderName(subfolder.name);
		setEditSubfolderSlug(subfolder.slug);
	};

	const handleUpdateSubfolder = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!editingSubfolder) return;
		try {
			const response = await fetch(
				`/api/mock-subfolders?id=${editingSubfolder.id}`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: editSubfolderName,
						slug: editSubfolderSlug,
					}),
				},
			);
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error);
			}
			toast.success('Subfolder Updated');
			setEditingSubfolder(null);
			setEditSubfolderName('');
			setEditSubfolderSlug('');
			refreshSubfolders();
		} catch (error: unknown) {
			toast.error('Error', {
				description:
					error instanceof Error ? error.message : 'Failed to update subfolder',
			});
		}
	};

	const handleDeleteMock = async (id: string) => {
		try {
			await fetch(`/api/mocks?id=${id}`, { method: 'DELETE' });
			toast.success('Mock Deleted', {
				description: 'Mock endpoint has been removed',
			});
			mutate(
				`/api/mocks?folderId=${folder?.id}&mockFolderId=${currentMockFolderId}&page=${page}&limit=${limit}&q=${debouncedSearch}`,
			);
		} catch {
			toast.error('Error', {
				description: 'Failed to delete mock',
			});
		}
	};

	const handleDuplicateMock = async (mock: Mock) => {
		try {
			const res = await fetch('/api/mocks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: `${mock.name} (Copy)`,
					path: mock.path,
					method: mock.method,
					response: mock.response,
					statusCode: mock.statusCode,
					folderId: mock.folderId,
					mockFolderId: mock.mockFolderId ?? null,
					matchType: mock.matchType,
					queryParams: mock.queryParams,
					jsonSchema: mock.jsonSchema,
					useDynamicResponse: mock.useDynamicResponse,
					echoRequestBody: mock.echoRequestBody,
					delay: mock.delay,
					variants: mock.variants,
					wildcardRequireMatch: mock.wildcardRequireMatch,
				}),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error);
			}

			toast.success('Mock Duplicated', {
				description: 'Mock endpoint has been duplicated successfully',
			});
			mutate(
				`/api/mocks?folderId=${folder?.id}&mockFolderId=${currentMockFolderId}&page=${page}&limit=${limit}&q=${debouncedSearch}`,
			);
		} catch (error: unknown) {
			toast.error('Error', {
				description:
					error instanceof Error ? error.message : 'Failed to duplicate mock',
			});
		}
	};

	const handleUpdateMock = async (id: string, data: UpdateMockRequest) => {
		try {
			const response = await fetch(`/api/mocks?id=${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error);
			}

			toast.success('Mock Updated', {
				description: 'Mock endpoint has been updated successfully',
			});
			mutate(
				`/api/mocks?folderId=${folder?.id}&mockFolderId=${currentMockFolderId}&page=${page}&limit=${limit}&q=${debouncedSearch}`,
			);
		} catch (error: unknown) {
			toast.error('Error', {
				description:
					error instanceof Error ? error.message : 'Failed to update mock',
			});
			throw error;
		}
	};

	const handleCopy = async (text: string) => {
		const ok = await copyToClipboard(text);
		if (ok) {
			toast.success('Copied', {
				description: 'URL copied to clipboard',
			});
		} else {
			toast.error('Copy failed', {
				description: 'Could not copy to clipboard',
			});
		}
	};
	const navigateToParentSubfolder = () => {
		setPage(1);
		setMockFolderId(parentSubfolder?.id ?? 'root');
	};

	if (!folder) {
		return (
			<div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-12">
						<div className="text-center">
							<p className="text-lg font-medium text-muted-foreground">
								Folder not found
							</p>
							<Button asChild className="mt-4">
								<Link href="/app">
									<ArrowLeft className="mr-2 h-4 w-4" />
									Back to Folders
								</Link>
							</Button>
						</div>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen">
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="mb-8 flex items-center justify-between">
					<Button variant="ghost" asChild>
						<Link href="/app">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Folders
						</Link>
					</Button>
				</div>

				<div className="mb-8">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-4xl font-bold tracking-tight text-foreground">
								{folder.name}
							</h1>
							<p className="mt-1 text-muted-foreground">/{folder.slug}</p>
							{currentSubfolder && (
								<p className="mt-1 text-sm text-muted-foreground">
									{currentSubfolder.name} ({currentSubfolder.mainPath})
								</p>
							)}
							{folder.description && (
								<p className="mt-2 text-base text-muted-foreground max-w-2xl">
									{folder.description}
								</p>
							)}
						</div>
						<div className="flex items-center gap-4">
							<span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary mockzilla-border">
								{meta.total} {meta.total === 1 ? 'mock' : 'mocks'}
							</span>
							<CreateMockDialog
								folders={[folder]}
								mockSubfolders={allSubfolders}
								defaultFolderId={folder.id}
								defaultMockFolderId={
									currentMockFolderId === 'root' ? null : currentMockFolderId
								}
								onSuccess={handleMockSuccess}
							/>
						</div>
					</div>
				</div>

				<div className="grid gap-8">
					{/* Mocks List */}
					<div>
						<div className="mb-4 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<h2 className="text-2xl font-semibold text-foreground">
									{currentSubfolder ? currentSubfolder.name : 'Root'}
								</h2>
								{currentMockFolderId !== 'root' && (
									<Button
										variant="outline"
										size="icon"
										onClick={navigateToParentSubfolder}
										aria-label="Go to parent subfolder"
										title="Go to parent subfolder"
									>
										<ArrowUp className="h-4 w-4" />
									</Button>
								)}
							</div>
							<div className="flex items-center gap-3">
								<Dialog
									open={isCreateSubfolderOpen}
									onOpenChange={(open) => {
										setIsCreateSubfolderOpen(open);
										if (!open) {
											setNewSubfolderName('');
											setNewSubfolderSlug('');
										}
									}}
								>
									<DialogTrigger asChild>
										<Button variant="outline">
											<FolderPlus className="mr-2 h-4 w-4" />
											Create Subfolder
										</Button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>Create Subfolder</DialogTitle>
											<DialogDescription>
												Create a nested mock group with a custom path slug.
											</DialogDescription>
										</DialogHeader>
										<form onSubmit={handleCreateSubfolder} className="space-y-4">
											<div className="space-y-2">
												<label
													htmlFor="subfolder-name"
													className="text-sm font-medium"
												>
													Name
												</label>
												<Input
													id="subfolder-name"
													placeholder="Users"
													value={newSubfolderName}
													onChange={(event) =>
														setNewSubfolderName(event.target.value)
													}
													required
												/>
											</div>
											<div className="space-y-2">
												<label
													htmlFor="subfolder-slug"
													className="text-sm font-medium"
												>
													Slug
												</label>
												<Input
													id="subfolder-slug"
													placeholder="api-users"
													value={newSubfolderSlug}
													onChange={(event) =>
														setNewSubfolderSlug(event.target.value)
													}
													required
												/>
											</div>
											<div className="rounded-md border border-border bg-muted/30 px-3 py-2">
												<p className="text-xs text-muted-foreground">Path</p>
												<p className="mt-1 font-mono text-sm">
													{newSubfolderPreviewPath}
												</p>
											</div>
											<div className="flex justify-end gap-2 pt-2">
												<Button
													type="button"
													variant="outline"
													onClick={() => setIsCreateSubfolderOpen(false)}
												>
													Cancel
												</Button>
												<Button type="submit">
													<FolderPlus className="mr-2 h-4 w-4" />
													Create Subfolder
												</Button>
											</div>
										</form>
									</DialogContent>
								</Dialog>
								<div className="relative w-72">
									<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										placeholder="Search mocks..."
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										className="pl-9 mockzilla-border bg-card/50"
									/>
								</div>
							</div>
						</div>

						<div className="mb-6">
							<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
								{childSubfolders.map((subfolder) => (
									<Card
										key={subfolder.id}
										className="mockzilla-border bg-card/50 p-4"
									>
										<div className="flex items-start justify-between gap-3">
											<button
												type="button"
												className="min-w-0 flex-1 text-left"
												onClick={() => {
													setPage(1);
													setMockFolderId(subfolder.id);
												}}
											>
												<div className="flex items-center gap-2">
													<FolderOpen className="h-4 w-4 text-primary" />
													<span className="truncate font-medium">
														{subfolder.name}
													</span>
												</div>
												<p className="mt-1 truncate font-mono text-xs text-muted-foreground">
													{subfolder.mainPath}
												</p>
											</button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => openEditSubfolder(subfolder)}
												title="Edit subfolder"
											>
												<Pencil className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleDeleteSubfolder(subfolder.id)}
												title="Delete subfolder"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</Card>
								))}
							</div>
						</div>

						<Dialog
							open={Boolean(editingSubfolder)}
							onOpenChange={(open) => {
								if (!open) {
									setEditingSubfolder(null);
									setEditSubfolderName('');
									setEditSubfolderSlug('');
								}
							}}
						>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Edit Subfolder</DialogTitle>
									<DialogDescription>
										Update the subfolder name or path slug independently.
									</DialogDescription>
								</DialogHeader>
								<form onSubmit={handleUpdateSubfolder} className="space-y-4">
									<div className="space-y-2">
										<label
											htmlFor="edit-subfolder-name"
											className="text-sm font-medium"
										>
											Name
										</label>
										<Input
											id="edit-subfolder-name"
											value={editSubfolderName}
											onChange={(event) =>
												setEditSubfolderName(event.target.value)
											}
											required
										/>
									</div>
									<div className="space-y-2">
										<label
											htmlFor="edit-subfolder-slug"
											className="text-sm font-medium"
										>
											Slug
										</label>
										<Input
											id="edit-subfolder-slug"
											value={editSubfolderSlug}
											onChange={(event) =>
												setEditSubfolderSlug(event.target.value)
											}
											required
										/>
									</div>
									<div className="rounded-md border border-border bg-muted/30 px-3 py-2">
										<p className="text-xs text-muted-foreground">Path</p>
										<p className="mt-1 font-mono text-sm">
											{editSubfolderPreviewPath}
										</p>
									</div>
									<div className="flex justify-end gap-2 pt-2">
										<Button
											type="button"
											variant="outline"
											onClick={() => setEditingSubfolder(null)}
										>
											Cancel
										</Button>
										<Button type="submit">Save Changes</Button>
									</div>
								</form>
							</DialogContent>
						</Dialog>

						{mocksLoading ? (
							<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
								<p className="text-center text-muted-foreground">Loading...</p>
							</Card>
						) : mocks.length === 0 ? (
							<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-12">
								<div className="text-center">
									{debouncedSearch ? (
										<Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
									) : (
										<Plus className="mx-auto h-12 w-12 text-muted-foreground/50" />
									)}
									<p className="mt-4 text-lg font-medium text-muted-foreground">
										{debouncedSearch
											? 'No mocks match your search'
											: 'No mocks yet'}
									</p>
									<p className="mt-1 text-sm text-muted-foreground">
										{debouncedSearch
											? 'Try a different search term'
											: 'Create your first mock endpoint'}
									</p>
									{debouncedSearch && (
										<Button
											variant="outline"
											onClick={() => setSearch('')}
											className="mt-4"
										>
											Clear Search
										</Button>
									)}
								</div>
							</Card>
						) : (
							<>
								<div className="space-y-4">
									{mocks.map((mock) => (
										<MockCard
											key={mock.id}
											mock={mock}
											folder={folder}
											onDelete={handleDeleteMock}
											onDuplicate={handleDuplicateMock}
											onUpdate={handleUpdateMock}
											onCopy={handleCopy}
										/>
									))}
								</div>
								<PaginationControls
									currentPage={page}
									totalPages={meta.totalPages}
									onPageChange={setPage}
									limit={limit}
									onLimitChange={setLimit}
									totalItems={meta.total}
								/>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default function FolderPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<FolderContent />
		</Suspense>
	);
}
