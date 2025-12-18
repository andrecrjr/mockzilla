'use client';

import { ArrowLeft, Download, Loader2, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
import { Skeleton } from '@/components/ui/skeleton';
import type { Transition } from '@/lib/types';
import {
	TransitionDialog,
} from '@/components/workflow/create-transition-dialog';
import { StateInspector } from '@/components/workflow/state-inspector';
import { TransitionCard } from '@/components/workflow/transition-card';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ScenarioDetailPage() {
	const params = useParams();
	const scenarioId = params.scenarioId as string;
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const [isAdding, setIsAdding] = useState(false);
	const [editingTransition, setEditingTransition] = useState<Transition | null>(
		null,
	);

	const {
		data: transitions = [],
		isLoading,
		mutate: mutateTransitions,
	} = useSWR<Transition[]>(
		`/api/workflow/transitions?scenarioId=${scenarioId}`,
		fetcher,
	);

	const { data: stateResponse, mutate: mutateState } = useSWR(
		`/api/workflow/state/${scenarioId}`,
		fetcher,
	);

	const stateData = stateResponse?.data || { state: {}, tables: {} };

	const { trigger: triggerDelete, isMutating: isDeleting } = useSWRMutation(
		'/api/workflow/transitions',
		async (url, { arg: id }: { arg: number }) => {
			const res = await fetch(`${url}/${id}`, { method: 'DELETE' });
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to delete transition');
			}
			return res.json();
		},
		{
			onSuccess: () => {
				toast.success('Transition deleted');
				mutateTransitions();
				mutateState();
			},
			onError: (err) => {
				toast.error(err.message || 'Failed to delete transition');
			},
		},
	);

	const handleDelete = (id: number) => {
		setDeleteId(id);
	};

	const confirmDelete = () => {
		if (deleteId) {
			triggerDelete(deleteId);
			setDeleteId(null);
		}
	};

	const resetState = async () => {
		try {
			await fetch(`/api/workflow/state/${scenarioId}`, { method: 'DELETE' });
			toast.success('State Reset');
			mutateState();
		} catch {
			toast.error('Failed to reset state');
		}
	};

	const handleExport = () => {
		window.location.href = `/api/workflow/export?scenarioId=${scenarioId}`;
	};

	return (
		<div className="container mx-auto py-8 max-w-7xl h-[calc(100vh-4rem)] flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between mb-6 shrink-0">
				<div className="flex items-center gap-4">
					<Link href="/workflows">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">{scenarioId}</h1>
						<p className="text-sm text-muted-foreground">Scenario Workflow</p>
					</div>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={handleExport}>
						<Download className="mr-2 h-4 w-4" />
						Export
					</Button>
					<Button variant="destructive" size="sm" onClick={resetState}>
						<Trash2 className="mr-2 h-4 w-4" />
						Reset State
					</Button>
					<Button onClick={() => setIsAdding(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Add Transition
					</Button>
				</div>
			</div>

			{/* Main Layout */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
				{/* Left: Transitions List */}
				<div className="lg:col-span-2 flex flex-col min-h-0">
					<h2 className="text-lg font-semibold mb-3 shrink-0">Transitions</h2>
					<div className="flex-1 overflow-y-auto pr-2 space-y-4">
						{isLoading ? (
							<div className="space-y-4">
								{[1, 2].map((i) => (
									<div key={`skeleton-${i}`} className="border rounded-lg p-4">
										<Skeleton className="h-6 w-1/3 mb-3" />
										<Skeleton className="h-4 w-2/3 mb-2" />
										<Skeleton className="h-4 w-1/2" />
									</div>
								))}
							</div>
						) : transitions.length === 0 ? (
							<div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
								<p className="text-muted-foreground">
									No transitions defined yet.
								</p>
								<p className="text-xs text-muted-foreground/50 mt-1">
									Use the button above to add one.
								</p>
							</div>
						) : (
							transitions.map((t) => (
								<div key={t.id} className="relative">
									<TransitionCard
										transition={t}
										onDelete={() => handleDelete(t.id)}
										onEdit={() => setEditingTransition(t)}
									/>
								</div>
							))
						)}
					</div>
				</div>

				{/* Right: State Inspector */}
				<div className="lg:col-span-1 flex flex-col min-h-0">
					<StateInspector
						data={stateData}
						onRefresh={() => mutateState()}
						isLoading={false}
					/>
				</div>
			</div>

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={deleteId !== null}
				onOpenChange={(open) => !open && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Transition</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this transition? This action
							cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
							{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Unified Transition Dialog */}
			<TransitionDialog
				scenarioId={scenarioId}
				transition={editingTransition || undefined}
				mode={editingTransition ? 'edit' : 'create'}
				open={isAdding || !!editingTransition}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						setIsAdding(false);
						setEditingTransition(null);
					}
				}}
				onSuccess={() => {
					mutateTransitions();
					setIsAdding(false);
					setEditingTransition(null);
				}}
			/>
		</div>
	);
}
