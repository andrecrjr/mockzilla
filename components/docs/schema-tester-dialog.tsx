'use client';

import { Play } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
	generateFromSchemaString,
	validateSchema,
} from '@/lib/schema-generator';

interface SchemaTesterDialogProps {
	initialSchema?: string;
}

export function SchemaTesterDialog({ initialSchema }: SchemaTesterDialogProps) {
	const [open, setOpen] = useState(false);
	const [schema, setSchema] = useState(initialSchema ?? '');
	const [output, setOutput] = useState('');
	const [error, setError] = useState('');
	const [isGenerating, setIsGenerating] = useState(false);

	const handleGenerate = () => {
		setError('');
		setOutput('');

		const trimmed = schema.trim();
		if (!trimmed) {
			setError('Schema is required.');
			return;
		}

		const validation = validateSchema(trimmed);
		if (!validation.valid) {
			setError(validation.error ?? 'Schema is invalid.');
			return;
		}

		try {
			setIsGenerating(true);
			const json = generateFromSchemaString(trimmed);
			setOutput(json);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to generate JSON from schema.',
			);
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
					<Play className="mr-2 h-3 w-3" />
					Try this schema
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-4xl h-[480px] max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>JSON Schema Playground</DialogTitle>
					<DialogDescription>
						Paste or tweak a JSON Schema, then generate a sample response using
						Mockzilla&apos;s schema engine.
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-auto">
					<div className="grid gap-4 md:grid-cols-2 min-h-full">
						<div className="space-y-2">
							<p className="text-xs font-semibold text-muted-foreground">
								Schema
							</p>
							<Textarea
								value={schema}
								onChange={(event) => setSchema(event.target.value)}
								rows={18}
								spellCheck={false}
							/>
							<div className="flex items-center justify-between">
								{error && (
									<p className="text-xs text-destructive max-w-xs truncate">
										{error}
									</p>
								)}
								<Button
									onClick={handleGenerate}
									size="sm"
									className="ml-auto"
									disabled={isGenerating}
								>
									<Play className="mr-2 h-3 w-3" />
									{isGenerating ? 'Generating…' : 'Generate JSON'}
								</Button>
							</div>
						</div>

						<div className="space-y-2">
							<p className="text-xs font-semibold text-muted-foreground">
								Generated JSON
							</p>
							<div className="border rounded-md bg-muted/50">
								<ScrollArea className="h-[274px]">
									<pre className="p-3 text-xs font-mono whitespace-pre">
										{output || '// Run generation to preview JSON here'}
									</pre>
								</ScrollArea>
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
