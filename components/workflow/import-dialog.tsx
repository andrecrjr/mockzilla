'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ImportWorkflowDialogProps {
	onSuccess?: () => void;
}

export function ImportWorkflowDialog({ onSuccess }: ImportWorkflowDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [jsonContent, setJsonContent] = useState('');
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | null>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const content = event.target?.result as string;
			setJsonContent(content);
			setError(null);
		};
		reader.readAsText(file);
	};

	const handleImport = async () => {
		if (!jsonContent.trim()) {
			setError('Please provide JSON content');
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			// Validate JSON locally first
			let data: unknown;
			try {
				data = JSON.parse(jsonContent);
			} catch {
				throw new Error('Invalid JSON format');
			}

			const res = await fetch('/api/workflow/import', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			const result = await res.json();

			if (!res.ok) {
				throw new Error(result.error || 'Failed to import workflows');
			}

			toast.success(
				`Imported ${result.importedScenarios} scenarios and ${result.importedTransitions} transitions`,
			);
			setIsOpen(false);
			setJsonContent('');
			if (onSuccess) onSuccess();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error');
			toast.error('Import failed');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="outline">
					<Upload className="mr-2 h-4 w-4" />
					Import
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Import Workflows</DialogTitle>
					<DialogDescription>
						Upload a JSON file or paste the content below to import scenarios and
						transitions. Existing scenarios with the same ID will be updated.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label>Upload File</Label>
						<input
							type="file"
							accept=".json"
							className="hidden"
							ref={fileInputRef}
							onChange={handleFileChange}
						/>
						<Button
							variant="secondary"
							onClick={() => fileInputRef.current?.click()}
							className="w-full"
						>
							<Upload className="mr-2 h-4 w-4" />
							Choose JSON File
						</Button>
					</div>

					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-background px-2 text-muted-foreground">
								Or paste content
							</span>
						</div>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="json">JSON Content</Label>
						<Textarea
							id="json"
							value={jsonContent}
							onChange={(e) => {
								setJsonContent(e.target.value);
								setError(null);
							}}
							placeholder='{ "version": 1, "scenarios": [...], "transitions": [...] }'
							className="h-[200px] font-mono text-xs"
						/>
					</div>

					{error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setIsOpen(false)}>
						Cancel
					</Button>
					<Button onClick={handleImport} disabled={isLoading || !jsonContent}>
						{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Import Workflows
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
