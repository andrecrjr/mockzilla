'use client';

import { FileJson, HelpCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import { FieldTooltip } from '@/components/folder-tooltips';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TooltipProvider } from '@/components/ui/tooltip';

interface OpenApiImportDialogProps {
	trigger?: React.ReactNode;
	onSuccess?: () => void;
}

export function OpenApiImportDialog({
	trigger,
	onSuccess,
}: OpenApiImportDialogProps) {
	const [open, setOpen] = useState(false);
	const [spec, setSpec] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!spec.trim()) return;

		setIsSubmitting(true);

		try {
			const response = await fetch('/api/import/openapi', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ spec }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.error || 'Failed to import OpenAPI specification',
				);
			}

			const result = await response.json();

			toast.success('Import Successful', {
				description: `Imported ${result.importedCount} mocks into folder.`,
			});

			if (onSuccess) {
				onSuccess();
			}

			// Mutate relevant SWR keys to refresh data
			mutate(
				(key) => typeof key === 'string' && key.startsWith('/api/folders'),
				undefined,
				{ revalidate: true },
			);

			setOpen(false);
			setSpec('');
		} catch (error) {
			toast.error('Import Error', {
				description:
					error instanceof Error
						? error.message
						: 'Failed to import OpenAPI specification',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<TooltipProvider delayDuration={300}>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					{trigger || (
						<Button
							variant="outline"
							className="mockzilla-border bg-card/50 backdrop-blur-sm"
						>
							<FileJson className="mr-2 h-4 w-4" />
							Import OpenAPI
						</Button>
					)}
				</DialogTrigger>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>Import OpenAPI Specification</DialogTitle>
						<DialogDescription>
							Paste your OpenAPI YAML or JSON specification below. We'll
							automatically create a folder and mocks for each route.{' '}
							<Link
								href="/docs#openapi-import"
								className="text-primary hover:underline inline-flex items-center gap-1"
							>
								Learn more <HelpCircle className="h-3 w-3" />
							</Link>
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleSubmit} className="grid gap-4 py-4">
						<div className="grid gap-2">
							<div className="flex items-center gap-2">
								<Label htmlFor="openapi-spec">
									OpenAPI Spec (YAML or JSON)
								</Label>
								<FieldTooltip
									label="Paste your full OpenAPI 3.x specification here."
									description="We support both YAML and JSON formats. Mocks will be created with JSON Schema validation where available."
								/>
							</div>
							<Textarea
								id="openapi-spec"
								placeholder="openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
..."
								value={spec}
								onChange={(e) => setSpec(e.target.value)}
								rows={15}
								className="font-mono text-xs"
								required
							/>
						</div>

						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting || !spec.trim()}>
								{isSubmitting ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Importing...
									</>
								) : (
									'Import Specification'
								)}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</TooltipProvider>
	);
}
