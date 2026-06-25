'use client';

import { Check, Edit2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { type ExtensionMock, ExtensionMockForm } from './extension-mock-form';

interface ExtensionMockTableProps {
	mocks: ExtensionMock[];
	folderId: string;
	folderName: string;
	folderSlug: string;
	folderMeta?: Record<string, unknown>;
}

export function ExtensionMockTable({
	mocks: initialMocks,
	folderId,
	folderName,
	folderSlug,
	folderMeta,
}: ExtensionMockTableProps) {
	const [mocks, setMocks] = useState(initialMocks);
	const [editingMock, setEditingMock] = useState<ExtensionMock | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);

	// Sync local state when props change (e.g., after a mutation)
	useEffect(() => {
		setMocks(initialMocks);
	}, [initialMocks]);

	const handleUpdateMock = async (updatedMock: ExtensionMock) => {
		// Basic JSON validation if response is present
		const responseBody = updatedMock.response || updatedMock.body || '';
		if (responseBody) {
			try {
				JSON.parse(responseBody);
			} catch {
				toast.error('Invalid JSON response');
				return;
			}
		}

		setIsUpdating(true);
		try {
			// 1. Update the local state
			const newMocks = mocks.map((m) =>
				m.id === updatedMock.id
					? { ...m, ...updatedMock, response: responseBody }
					: m,
			);

			// 2. Prepare the new meta object
			const extensionSyncData =
				(folderMeta?.extensionSyncData as { mocks?: ExtensionMock[] }) || {};

			const newMeta = {
				...folderMeta,
				extensionSyncData: {
					...extensionSyncData,
					mocks: newMocks.map((m) => {
						const originalMock = extensionSyncData.mocks?.find(
							(orig) => orig.id === m.id,
						);
						return {
							...originalMock,
							...m,
							response: responseBody,
							body: responseBody,
						};
					}),
				},
			};

			console.log('[ExtensionMockTable] Updating folder and mock:', {
				folderId,
				mockId: updatedMock.id,
				newName: updatedMock.name,
			});

			// 3. Call the API to update the folder meta
			const folderRes = await fetch(`/api/folders?id=${folderId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: folderName,
					meta: newMeta,
				}),
			});

			if (!folderRes.ok) throw new Error('Failed to update folder metadata');

			// 4. Also update individual mock response in DB for consistency
			// This ensures the server-side mock serving logic uses the updated data
			const mockIdToUpdate = updatedMock.serverMockId || updatedMock.id;
			await fetch(`/api/mocks?id=${mockIdToUpdate}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: updatedMock.name,
					method: updatedMock.method,
					statusCode: updatedMock.statusCode,
					response: responseBody,
					matchType: updatedMock.matchType,
					enabled: updatedMock.enabled,
					folderId: folderId,
				}),
			});

			setMocks(newMocks);
			setEditingMock(null);
			toast.success('Mock updated successfully');

			// Refresh folder data to keep everything in sync
			mutate(`/api/folders?slug=${folderSlug}`);
		} catch (error) {
			console.error('Update error:', error);
			toast.error(
				error instanceof Error ? error.message : 'Failed to update mock',
			);
		} finally {
			setIsUpdating(false);
		}
	};

	const toggleEnabled = (mock: ExtensionMock) => {
		handleUpdateMock({ ...mock, enabled: !mock.enabled });
	};

	if (!mocks || mocks.length === 0) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				No mocks found in this extension folder.
			</div>
		);
	}

	return (
		<div className="rounded-md border bg-card/50 backdrop-blur-sm">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Method</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Variants</TableHead>
						<TableHead>Enabled</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{mocks.map((mock) => (
						<TableRow key={mock.id}>
							<TableCell className="font-medium">{mock.name}</TableCell>
							<TableCell>
								<Badge variant="outline">{mock.method || 'GET'}</Badge>
							</TableCell>
							<TableCell>
								<span
									className={`font-mono ${mock.statusCode >= 400 ? 'text-destructive' : 'text-green-600'}`}
								>
									{mock.statusCode}
								</span>
							</TableCell>
							<TableCell>
								{mock.variants && mock.variants.length > 0 ? (
									<div className="flex flex-col gap-1">
										{mock.variants.map((v, idx) => (
											<div
												key={v.id || v.key || `variant-${idx}`}
												className="text-xs text-muted-foreground flex items-center gap-2"
											>
												<span>• {v.name || v.key}</span>
												<span className="text-[10px] bg-secondary px-1 rounded">
													{v.statusCode}
												</span>
											</div>
										))}
									</div>
								) : (
									<span className="text-muted-foreground text-xs">-</span>
								)}
							</TableCell>
							<TableCell>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => toggleEnabled(mock)}
									className="hover:bg-transparent"
								>
									{mock.enabled ? (
										<div className="bg-green-500/10 text-green-500 p-1 rounded-full">
											<Check className="h-4 w-4" />
										</div>
									) : (
										<div className="bg-destructive/10 text-destructive p-1 rounded-full">
											<X className="h-4 w-4" />
										</div>
									)}
								</Button>
							</TableCell>
							<TableCell className="text-right">
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setEditingMock(mock)}
								>
									<Edit2 className="h-4 w-4" />
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<Dialog open={!!editingMock} onOpenChange={() => setEditingMock(null)}>
				<DialogContent className="sm:max-w-[1000px] h-[90vh] flex flex-col p-0">
					<div className="p-6 pb-2">
						<DialogHeader>
							<DialogTitle className="text-2xl">
								Edit Extension Mock
							</DialogTitle>
							<DialogDescription>
								Update metadata and variants for this synced mock.
							</DialogDescription>
						</DialogHeader>
					</div>

					<div className="flex-1 overflow-hidden px-6 pb-6">
						{editingMock && (
							<ExtensionMockForm
								mock={editingMock}
								onSave={handleUpdateMock}
								onCancel={() => setEditingMock(null)}
								isUpdating={isUpdating}
							/>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
