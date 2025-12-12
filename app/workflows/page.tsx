'use client';

import {
	Download,
	GitBranch,
	Loader2,
	MoreHorizontal,
	Pencil,
	Plus,
	Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ImportWorkflowDialog } from '@/components/workflow/import-dialog';

interface Scenario {
	id: string;
	name: string;
	description?: string;
	count: number;
	createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

async function createScenario(
	url: string,
	{ arg }: { arg: { name: string; description?: string } },
) {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(arg),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error || 'Failed to create scenario');
	}
	return res.json();
}

export default function WorkflowsPage() {
	const router = useRouter();
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [newScenarioName, setNewScenarioName] = useState('');
	const [newScenarioDescription, setNewScenarioDescription] = useState('');
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
	const [isEditOpen, setIsEditOpen] = useState(false);

	// Fetch scenarios with SWR
	const {
		data: scenarios,
		error,
		isLoading,
		mutate,
	} = useSWR<Scenario[]>('/api/workflow/scenarios', fetcher);

	const { trigger: triggerCreate, isMutating: isCreating } = useSWRMutation(
		'/api/workflow/scenarios',
		createScenario,
		{
			onSuccess: (data) => {
				toast.success('Scenario created successfully!');
				setIsCreateOpen(false);
				setNewScenarioName('');
				setNewScenarioDescription('');
				mutate(); // Refresh the list
				router.push(`/workflows/${data.id}`);
			},
			onError: (err) => {
				toast.error(err.message || 'Failed to create scenario');
			},
		},
	);

	// Delete scenario mutation
	async function deleteScenario(url: string) {
		const res = await fetch(url, { method: 'DELETE' });
		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.error || 'Failed to delete scenario');
		}
		return res.json();
	}

	const { trigger: triggerDelete, isMutating: isDeleting } = useSWRMutation(
		deleteId ? `/api/workflow/scenarios/${deleteId}` : null,
		deleteScenario,
		{
			onSuccess: () => {
				toast.success('Scenario deleted');
				setDeleteId(null);
				mutate(); // Refresh the list
			},
			onError: (err) => {
				toast.error(err.message || 'Failed to delete scenario');
				setDeleteId(null);
			},
		},
	);

	// Update scenario mutation
	async function updateScenario(url: string, { arg }: { arg: any }) {
		const res = await fetch(url, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(arg),
		});
		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.error || 'Failed to update scenario');
		}
		return res.json();
	}

	const { trigger: triggerUpdate, isMutating: isUpdating } = useSWRMutation(
		editingScenario ? `/api/workflow/scenarios/${editingScenario.id}` : null,
		async (url: string, { arg }: { arg: { id: string; name: string; description?: string } }) => {
			const res = await fetch(url, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: arg.name, description: arg.description }),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to update scenario');
			}
			return res.json();
		},
		{
			onSuccess: () => {
				toast.success('Scenario updated');
				setEditingScenario(null);
				setIsEditOpen(false);
				mutate(); // Refresh the list
			},
			onError: (err) => {
				toast.error(err.message || 'Failed to update scenario');
			},
		},
	);

	const handleCreate = async () => {
		if (!newScenarioName.trim()) {
			toast.error('Please enter a scenario name');
			return;
		}
		await triggerCreate({
			name: newScenarioName,
			description: newScenarioDescription || undefined,
		});
	};

	const handleUpdate = async () => {
		if (!editingScenario?.name.trim() || !editingScenario?.id) {
			toast.error('Please enter a scenario name');
			return;
		}
		await triggerUpdate({
			id: editingScenario.id,
			name: editingScenario.name,
			description: editingScenario.description || undefined,
		});
	};

	const handleDelete = async (id: string) => {
		if (
			confirm(
				`Are you sure you want to delete this scenario? This action cannot be undone and all its transitions will be permanently removed.`,
			)
		) {
			try {
				setDeleteId(id);
				await triggerDelete();
			} catch (err: any) {
				toast.error(err.message || 'Failed to delete scenario');
			} finally {
				setDeleteId(null);
			}
		}
	};

	const startEditing = (scenario: Scenario) => {
		setEditingScenario({ ...scenario });
		setIsEditOpen(true);
	};

	const handleExportAll = () => {
		window.location.href = '/api/workflow/export';
	};

	return (
		<div className="container mx-auto py-8 max-w-7xl">
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-4xl font-bold tracking-tight">Workflows</h1>
					<p className="text-muted-foreground mt-2">
						Manage stateful scenarios and complex transition rules.
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={handleExportAll}>
						<Download className="mr-2 h-4 w-4" />
						Export All
					</Button>
					<ImportWorkflowDialog onSuccess={() => mutate()} />
					<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
						<DialogTrigger asChild>
							<Button>
								<Plus className="mr-2 h-4 w-4" />
								New Scenario
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create Scenario</DialogTitle>
								<DialogDescription>
									Start a new workflow scenario to define transitions.
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="grid gap-2">
									<Label htmlFor="name">Name *</Label>
									<Input
										id="name"
										value={newScenarioName}
										onChange={(e) => setNewScenarioName(e.target.value)}
										placeholder="e.g. Checkout Flow"
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="description">Description</Label>
									<Textarea
										id="description"
										value={newScenarioDescription}
										onChange={(e) => setNewScenarioDescription(e.target.value)}
										placeholder="Optional description of this scenario..."
										rows={3}
									/>
								</div>
							</div>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setIsCreateOpen(false)}
								>
									Cancel
								</Button>
								<Button onClick={handleCreate} disabled={isCreating}>
									{isCreating && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									Create
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{/* Edit Scenario Dialog */}
					<Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Edit Scenario</DialogTitle>
								<DialogDescription>
									Update the name and description of this scenario.
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="grid gap-2">
									<Label htmlFor="edit-name">Name *</Label>
									<Input
										id="edit-name"
										value={editingScenario?.name || ''}
										onChange={(e) =>
											setEditingScenario(prev => prev ? {...prev, name: e.target.value} : null)
										}
										placeholder="e.g. Checkout Flow"
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="edit-description">Description</Label>
									<Textarea
										id="edit-description"
										value={editingScenario?.description || ''}
										onChange={(e) =>
											setEditingScenario(prev => prev ? {...prev, description: e.target.value} : null)
										}
										placeholder="Optional description of this scenario..."
										rows={3}
									/>
								</div>
							</div>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setIsEditOpen(false)}
								>
									Cancel
								</Button>
								<Button
									onClick={handleUpdate}
									disabled={isUpdating}
								>
									{isUpdating && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									Update
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			{/* Loading State */}
			{isLoading && (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{[...Array(3)].map((k) => (
						<Card key={k} className="p-6">
							<Skeleton className="h-10 w-10 rounded-lg mb-4" />
							<Skeleton className="h-6 w-3/4 mb-2" />
							<Skeleton className="h-4 w-1/2" />
						</Card>
					))}
				</div>
			)}

			{/* Error State */}
			{error && (
				<div className="text-center py-12 border-2 border-dashed border-destructive/50 rounded-lg bg-destructive/5">
					<p className="text-destructive">Failed to load scenarios.</p>
					<Button variant="outline" className="mt-4" onClick={() => mutate()}>
						Retry
					</Button>
				</div>
			)}

			{/* Empty State */}
			{!isLoading && !error && scenarios?.length === 0 && (
				<div className="text-center py-16 border-2 border-dashed rounded-lg bg-muted/10">
					<GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
					<h3 className="text-lg font-medium mb-2">No scenarios yet</h3>
					<p className="text-muted-foreground mb-6">
						Create your first workflow scenario to start defining transitions.
					</p>
					<Button onClick={() => setIsCreateOpen(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Create First Scenario
					</Button>
				</div>
			)}

			{/* Scenarios Grid */}
			{!isLoading && !error && scenarios && scenarios.length > 0 && (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{scenarios.map((scenario) => (
						<Card key={scenario.id} className="h-full flex flex-col">
							<div className="flex justify-between items-start p-6">
								<Link href={`/workflows/${scenario.id}`}>
									<div className="cursor-pointer">
										<div className="flex items-center justify-between mb-4">
											<div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
												<GitBranch className="h-5 w-5" />
											</div>
											<span className="text-xs text-muted-foreground">
												{scenario.count}{' '}
												{scenario.count === 1 ? 'rule' : 'rules'}
											</span>
										</div>
										<h3 className="text-lg font-semibold mb-2">
											{scenario.name}
										</h3>
										{scenario.description && (
											<p className="text-sm text-muted-foreground mb-3 line-clamp-2">
												{scenario.description}
											</p>
										)}
										<p className="text-xs text-muted-foreground">
											ID:{' '}
											<code className="bg-muted px-1 py-0.5 rounded">
												{scenario.id}
											</code>
										</p>
									</div>
								</Link>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon" className="h-8 w-8">
											<MoreHorizontal className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onClick={() => startEditing(scenario)}>
											<Pencil className="mr-2 h-4 w-4" />
											Edit
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => handleDelete(scenario.id)}
											className="text-red-600 focus:text-red-600 focus:bg-red-50"
										>
											<Trash2 className="mr-2 h-4 w-4" />
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
