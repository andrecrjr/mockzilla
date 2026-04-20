'use client';

import { Loader2, Save } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export interface ExtensionMock {
	id: string;
	name: string;
	method: string;
	statusCode: number;
	enabled: boolean;
	pattern?: string;
	body?: string;
	response?: string;
	matchType?: string;
	serverMockId?: string;
	variants?: Array<{
		id?: string;
		key?: string;
		name?: string;
		statusCode: number;
		body?: string;
		bodyType?: string;
	}>;
}

interface ExtensionMockFormProps {
	mock: ExtensionMock;
	onSave: (updatedMock: ExtensionMock) => Promise<void>;
	onCancel: () => void;
	isUpdating: boolean;
}

export function ExtensionMockForm({
	mock: initialMock,
	onSave,
	onCancel,
	isUpdating,
}: ExtensionMockFormProps) {
	// Initialize state with a shallow copy to avoid direct mutation
	const [formState, setFormState] = useState<ExtensionMock>({
		...initialMock,
		// Ensure response is synced with body if one is missing
		response: initialMock.response || initialMock.body || '',
	});

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		// Ensure we pass the latest state back to the parent
		await onSave(formState);
	};

	const updateField = (field: keyof ExtensionMock, value: unknown) => {
		setFormState((prev) => ({ ...prev, [field]: value }));
	};

	const updateVariant = (idx: number, field: string, value: unknown) => {
		const newVariants = [...(formState.variants || [])];
		newVariants[idx] = { ...newVariants[idx], [field]: value };
		setFormState((prev) => ({ ...prev, variants: newVariants }));
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col h-full overflow-hidden"
		>
			<div className="flex-1 overflow-y-auto pr-2 py-4 space-y-8">
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
					{/* Left Column: Basic Fields */}
					<div className="lg:col-span-5 space-y-6">
						<div>
							<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
								Configuration
							</h3>
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="name">Mock Name</Label>
									<Input
										id="name"
										value={formState.name}
										placeholder="e.g., Get Users API"
										onChange={(e) => updateField('name', e.target.value)}
										required
										className="bg-background/50"
									/>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="method">HTTP Method</Label>
										<Select
											value={formState.method || 'GET'}
											onValueChange={(value) => updateField('method', value)}
										>
											<SelectTrigger id="method" className="bg-background/50">
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

									<div className="space-y-2">
										<Label htmlFor="statusCode">Status Code</Label>
										<Input
											id="statusCode"
											type="number"
											value={formState.statusCode}
											onChange={(e) =>
												updateField(
													'statusCode',
													Number.parseInt(e.target.value, 10) || 200,
												)
											}
											required
											className="bg-background/50"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="matchType">Match Type</Label>
									<Select
										value={formState.matchType || 'substring'}
										onValueChange={(value) => updateField('matchType', value)}
									>
										<SelectTrigger id="matchType" className="bg-background/50">
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
						</div>
					</div>

					{/* Right Column: Response Body */}
					<div className="lg:col-span-7 space-y-6">
						<div className="h-full flex flex-col">
							<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
								Default Response
							</h3>
							<div className="flex-1 space-y-2">
								<Label htmlFor="response">Body Content (JSON or Text)</Label>
								<Textarea
									id="response"
									className="font-mono text-sm flex-1 min-h-[250px] lg:min-h-0 lg:h-[calc(100%-2rem)] bg-background/50"
									value={formState.response || ''}
									placeholder='{ "success": true }'
									onChange={(e) => updateField('response', e.target.value)}
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Bottom: Variants Section */}
				{formState.variants && formState.variants.length > 0 && (
					<div className="pt-8 border-t">
						<div className="flex items-center justify-between mb-6">
							<div className="space-y-1">
								<h3 className="text-lg font-semibold text-foreground">
									Wildcard Variants
								</h3>
								<p className="text-sm text-muted-foreground">
									Define specific responses for different wildcard captures.
								</p>
							</div>
							<Badge variant="secondary" className="px-3 py-1">
								{formState.variants.length} Variants
							</Badge>
						</div>

						<div className="grid gap-6 md:grid-cols-2">
							{formState.variants.map((variant, idx) => (
								<div
									key={variant.id || variant.key || idx}
									className="grid gap-4 bg-secondary/5 p-6 rounded-3xl border border-secondary/20 hover:border-secondary/40 transition-colors shadow-sm"
								>
									<div className="grid grid-cols-4 gap-4 items-end">
										<div className="col-span-3 space-y-1.5">
											<Label
												htmlFor={`v-name-${idx}`}
												className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider"
											>
												Variant Key (Capture Result)
											</Label>
											<Input
												id={`v-name-${idx}`}
												value={variant.key || variant.name || ''}
												className="h-10 text-sm bg-background/50 border-secondary/20"
												onChange={(e) =>
													updateVariant(idx, 'key', e.target.value)
												}
											/>
										</div>
										<div className="space-y-1.5">
											<Label
												htmlFor={`v-status-${idx}`}
												className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider"
											>
												Status
											</Label>
											<Input
												id={`v-status-${idx}`}
												type="number"
												value={variant.statusCode}
												className="h-10 text-sm bg-background/50 border-secondary/20 text-center"
												onChange={(e) =>
													updateVariant(
														idx,
														'statusCode',
														Number.parseInt(e.target.value, 10) || 200,
													)
												}
											/>
										</div>
									</div>
									<div className="space-y-1.5">
										<Label
											htmlFor={`v-body-${idx}`}
											className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider"
										>
											Variant Response Body
										</Label>
										<Textarea
											id={`v-body-${idx}`}
											value={variant.body || ''}
											className="font-mono text-xs min-h-[120px] bg-background/50 border-secondary/20"
											placeholder='{ "status": "variant matched" }'
											onChange={(e) =>
												updateVariant(idx, 'body', e.target.value)
											}
										/>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			<div className="flex justify-end gap-3 pt-6 border-t mt-auto">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isUpdating}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					disabled={isUpdating}
					className="min-w-[140px] font-semibold"
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
			</div>
		</form>
	);
}
