'use client';

import { GitBranch, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

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

	// Fetch scenarios with SWR
	const {
		data: scenarios,
		error,
		isLoading,
		mutate,
	} = useSWR<Scenario[]>('/api/workflow/scenarios', fetcher);

	const { trigger, isMutating } = useSWRMutation(
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

	const handleCreate = async () => {
		if (!newScenarioName.trim()) {
			toast.error('Please enter a scenario name');
			return;
		}
		await trigger({
			name: newScenarioName,
			description: newScenarioDescription || undefined,
		});
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
							<Button variant="outline" onClick={() => setIsCreateOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleCreate} disabled={isMutating}>
								{isMutating && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								Create
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{/* Loading State */}
			{isLoading && (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{[...Array(3)].map((_, i) => (
						<Card key={i} className="p-6">
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
						<Link href={`/workflows/${scenario.id}`} key={scenario.id}>
							<Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
								<div className="p-6">
									<div className="flex items-center justify-between mb-4">
										<div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
											<GitBranch className="h-5 w-5" />
										</div>
										<span className="text-xs text-muted-foreground">
											{scenario.count} {scenario.count === 1 ? 'rule' : 'rules'}
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
							</Card>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
