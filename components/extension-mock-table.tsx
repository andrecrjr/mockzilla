'use client';

import { Check, Edit2, Loader2, Save, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

interface ExtensionMock {
	id: string;
	name: string;
	method: string;
	statusCode: number;
	enabled: boolean;
	pattern?: string;
	body?: string;
	response?: string;
	matchType?: string;
	variants?: Array<{
		id?: string;
		key?: string;
		name?: string;
		statusCode: number;
		body?: string;
		bodyType?: string;
	}>;
}

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
		if (updatedMock.response) {
			try {
				JSON.parse(updatedMock.response);
			} catch {
				toast.error('Invalid JSON response');
				return;
			}
		}

		setIsUpdating(true);
		try {
			// 1. Update the local state
			const newMocks = mocks.map((m) =>
				m.id === updatedMock.id ? updatedMock : m,
			);

			// 2. Prepare the new meta object
			const extensionSyncData =
				(folderMeta?.extensionSyncData as Record<string, unknown>) || {};
			
			const newMeta = {
				...folderMeta,
				extensionSyncData: {
					...extensionSyncData,
					mocks: newMocks.map((m) => {
						const originalMock = mocks.find((orig) => orig.id === m.id);
						const merged = {
							...originalMock,
							...m,
							pattern: m.pattern || (originalMock as unknown as Record<string, unknown>)?.pattern || (originalMock as unknown as Record<string, unknown>)?.endpoint || '',
						};
						return merged;
					}),
				},
			};

			const name = folderName || (folderMeta as Record<string, unknown>)?.name as string || 'Synced Folder';
			console.log('[ExtensionMockTable] Updating folder:', { folderId, name, meta: newMeta });

			// 3. Call the API to update the folder meta
			const res = await fetch(`/api/folders?id=${folderId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					meta: newMeta,
				}),
			});

			if (!res.ok) {
				let errorData: Record<string, unknown> | null = null;
				try {
					errorData = await res.json();
				} catch {
					/* ignore */
				}
				throw new Error((errorData?.error as string) || 'Failed to update folder metadata');
			}

			setMocks(newMocks);
			setEditingMock(null);
			toast.success('Mock updated successfully');

			// Refresh folder data
			mutate(`/api/folders?slug=${folderSlug}`);
		} catch (error) {
			console.error('Update error:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to update mock');
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
												key={v.id || `variant-${idx}`}
												className="text-xs text-muted-foreground flex items-center gap-2"
											>
												<span>• {v.name}</span>
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
				<DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
					<DialogHeader>
						<DialogTitle>Edit Extension Mock</DialogTitle>
						<DialogDescription>
							Update metadata for this synced mock. Changes are saved to the
							folder metadata.
						</DialogDescription>
					</DialogHeader>
					{editingMock && (
						<div className="grid gap-4 py-4 overflow-y-auto pr-2">
							<div className="grid grid-cols-2 gap-4">
								<div className="grid gap-2">
									<Label htmlFor="name">Name</Label>
									<Input
										id="name"
										value={editingMock.name}
										onChange={(e) =>
											setEditingMock({ ...editingMock, name: e.target.value })
										}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="method">Method</Label>
									<Select
										value={editingMock.method || 'GET'}
										onValueChange={(value) =>
											setEditingMock({ ...editingMock, method: value })
										}
									>
										<SelectTrigger id="method">
											<SelectValue placeholder="Select method" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="GET">GET</SelectItem>
											<SelectItem value="POST">POST</SelectItem>
											<SelectItem value="PUT">PUT</SelectItem>
											<SelectItem value="PATCH">PATCH</SelectItem>
											<SelectItem value="DELETE">DELETE</SelectItem>
											<SelectItem value="HEAD">HEAD</SelectItem>
											<SelectItem value="OPTIONS">OPTIONS</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div className="grid gap-2">
									<Label htmlFor="statusCode">Status Code</Label>
									<Input
										id="statusCode"
										type="number"
										value={editingMock.statusCode}
										onChange={(e) =>
											setEditingMock({
												...editingMock,
												statusCode: Number.parseInt(e.target.value, 10) || 200,
											})
										}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="matchType">Match Type</Label>
									<Select
										value={editingMock.matchType || 'substring'}
										onValueChange={(value) =>
											setEditingMock({ ...editingMock, matchType: value })
										}
									>
										<SelectTrigger id="matchType">
											<SelectValue placeholder="Match Type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="exact">Exact</SelectItem>
											<SelectItem value="substring">Substring</SelectItem>
											<SelectItem value="wildcard">Wildcard</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="response">Response Body (JSON)</Label>
								<Textarea
									id="response"
									className="font-mono text-xs min-h-[150px]"
									value={editingMock.response || editingMock.body || ''}
									placeholder='{ "success": true }'
									onChange={(e) =>
										setEditingMock({ ...editingMock, response: e.target.value })
									}
								/>
							</div>
							{editingMock.variants && editingMock.variants.length > 0 && (
								<div className="grid gap-4 pt-4 border-t mt-4">
									<Label className="text-sm font-semibold text-primary">
										Variants ({editingMock.variants.length})
									</Label>
									<div className="grid gap-6">
										{editingMock.variants.map((variant, idx) => (
											<div 
												key={variant.id || variant.key || idx} 
												className="grid gap-3 bg-secondary/10 p-4 rounded-xl border border-secondary/50"
											>
												<div className="grid grid-cols-4 gap-3 items-end">
													<div className="col-span-3 grid gap-1.5">
														<Label htmlFor={`v-name-${idx}`} className="text-[10px] text-muted-foreground uppercase font-bold">
															Variant Name / Key
														</Label>
														<Input
															id={`v-name-${idx}`}
															value={variant.name || variant.key || ''}
															className="h-9 text-sm"
															onChange={(e) => {
																const newVariants = [...(editingMock.variants || [])];
																newVariants[idx] = { 
																	...variant, 
																	name: variant.name !== undefined ? e.target.value : undefined,
																	key: variant.key !== undefined ? e.target.value : undefined 
																};
																setEditingMock({ ...editingMock, variants: newVariants });
															}}
														/>
													</div>
													<div className="grid gap-1.5">
														<Label htmlFor={`v-status-${idx}`} className="text-[10px] text-muted-foreground uppercase font-bold">
															Status
														</Label>
														<Input
															id={`v-status-${idx}`}
															type="number"
															value={variant.statusCode}
															className="h-9 text-sm"
															onChange={(e) => {
																const newVariants = [...(editingMock.variants || [])];
																newVariants[idx] = { 
																	...variant, 
																	statusCode: Number.parseInt(e.target.value, 10) || 200 
																};
																setEditingMock({ ...editingMock, variants: newVariants });
															}}
														/>
													</div>
												</div>
												<div className="grid gap-1.5">
													<Label htmlFor={`v-body-${idx}`} className="text-[10px] text-muted-foreground uppercase font-bold">
														Variant Response (JSON)
													</Label>
													<Textarea
														id={`v-body-${idx}`}
														value={variant.body || ''}
														className="font-mono text-[11px] min-h-[80px] bg-background/50"
														placeholder='{ "status": "variant" }'
														onChange={(e) => {
															const newVariants = [...(editingMock.variants || [])];
															newVariants[idx] = { ...variant, body: e.target.value };
															setEditingMock({ ...editingMock, variants: newVariants });
														}}
													/>
												</div>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					)}
					<DialogFooter className="pt-4 border-t">
						<Button
							variant="outline"
							onClick={() => setEditingMock(null)}
							disabled={isUpdating}
						>
							Cancel
						</Button>
						<Button
							onClick={() => editingMock && handleUpdateMock(editingMock)}
							disabled={isUpdating}
						>
							{isUpdating ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="mr-2 h-4 w-4" />
									Save Changes
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}


