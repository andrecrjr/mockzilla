'use client';

import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { FieldTooltip } from '@/components/folder-tooltips';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
	generateFromSchemaString,
	validateSchema,
} from '@/lib/schema-generator';
import type { BodyType } from '@/lib/types';
import { cn } from '@/lib/utils';

type MockResponseSourceProps = {
	response: string;
	onResponseChange: (value: string) => void;
	jsonSchema: string;
	onJsonSchemaChange: (value: string) => void;
	useDynamicResponse: boolean;
	onUseDynamicResponseChange: (value: boolean) => void;
	bodyType?: BodyType;
	onBodyTypeChange?: (value: BodyType) => void;
	idPrefix: string;
};

export function MockResponseSource({
	response,
	onResponseChange,
	jsonSchema,
	onJsonSchemaChange,
	useDynamicResponse,
	onUseDynamicResponseChange,
	bodyType,
	onBodyTypeChange,
	idPrefix,
}: MockResponseSourceProps) {
	const [preview, setPreview] = useState('');

	const handleSourceChange = (dynamic: boolean) => {
		onUseDynamicResponseChange(dynamic);
	};

	const handleGenerateFromSchema = () => {
		const schemaString = jsonSchema.trim();
		if (!schemaString) {
			toast.error('Schema Required', {
				description: 'Paste a JSON Schema to generate',
			});
			return;
		}
		const validation = validateSchema(schemaString);
		if (!validation.valid) {
			toast.error('Invalid Schema', {
				description: validation.error || 'Schema is invalid',
			});
			return;
		}
		try {
			const generated = generateFromSchemaString(schemaString);
			setPreview(generated);
			toast.success('Generated', {
				description: 'Sample JSON generated from schema',
			});
		} catch (error) {
			toast.error('Generation Failed', {
				description:
					error instanceof Error
						? error.message
						: 'Could not generate from schema',
			});
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-sm font-medium">Active response source</span>
				<Button
					type="button"
					variant={useDynamicResponse ? 'outline' : 'secondary'}
					size="sm"
					aria-pressed={!useDynamicResponse}
					onClick={() => handleSourceChange(false)}
				>
					Manual JSON
				</Button>
				<Button
					type="button"
					variant={useDynamicResponse ? 'secondary' : 'outline'}
					size="sm"
					aria-pressed={useDynamicResponse}
					onClick={() => handleSourceChange(true)}
				>
					Dynamic Response
				</Button>
			</div>

			<div className="grid gap-4 xl:grid-cols-2">
				<section
					hidden={useDynamicResponse}
					className={cn(
						'space-y-3 rounded-lg border p-4 transition-colors',
						!useDynamicResponse
							? 'border-primary bg-primary/5'
							: 'border-border bg-card',
					)}
				>
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<Label htmlFor={`${idPrefix}-response`}>Manual JSON</Label>
							<FieldTooltip
								label="Manual JSON"
								description="Keep a static response body for this mock or variant."
								example='{"message":"Hello"}'
								docsLink="/docs"
							/>
						</div>
						{!useDynamicResponse && (
							<span className="text-xs font-medium text-primary">Active</span>
						)}
					</div>
					<Textarea
						id={`${idPrefix}-response`}
						value={response}
						onChange={(event) => onResponseChange(event.target.value)}
						placeholder='{"message": "Hello World"}'
						className="min-h-[260px] font-mono text-sm"
						aria-label="Manual JSON response"
					/>
					{bodyType && onBodyTypeChange && (
						<div className="space-y-2">
							<Label htmlFor={`${idPrefix}-body-type`}>Body Type</Label>
							<Select
								value={useDynamicResponse ? 'json' : bodyType}
								onValueChange={(value) => onBodyTypeChange(value as BodyType)}
								disabled={useDynamicResponse}
							>
								<SelectTrigger id={`${idPrefix}-body-type`}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="json">JSON</SelectItem>
									<SelectItem value="text">Text</SelectItem>
								</SelectContent>
							</Select>
							{useDynamicResponse && (
								<p className="text-xs text-muted-foreground">
									Dynamic responses are always returned as JSON.
								</p>
							)}
						</div>
					)}
				</section>

				<section
					hidden={!useDynamicResponse}
					className={cn(
						'space-y-3 rounded-lg border p-4 transition-colors',
						useDynamicResponse
							? 'border-primary bg-primary/5'
							: 'border-border bg-card',
					)}
				>
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<Label htmlFor={`${idPrefix}-schema`}>Dynamic Response</Label>
							<FieldTooltip
								label="Dynamic Response"
								description="Generate fresh JSON from this schema for every request."
								example='{"type":"object","properties":{"id":{"type":"integer"}}}'
								docsLink="/docs/reference/dynamic-interpolation"
							/>
						</div>
						{useDynamicResponse && (
							<span className="text-xs font-medium text-primary">Active</span>
						)}
					</div>
					<Textarea
						id={`${idPrefix}-schema`}
						value={jsonSchema}
						onChange={(event) => onJsonSchemaChange(event.target.value)}
						placeholder="Paste JSON Schema here..."
						className="min-h-[180px] font-mono text-sm"
						aria-label="Dynamic response schema"
					/>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleGenerateFromSchema}
						>
							Generate JSON Preview
						</Button>
						<Link
							href="/docs/reference/dynamic-interpolation"
							className="flex items-center gap-1 text-xs text-primary hover:underline"
							target="_blank"
						>
							Learn more <ExternalLinkIcon className="h-3 w-3" />
						</Link>
					</div>
					<Textarea
						value={preview}
						onChange={(event) => setPreview(event.target.value)}
						id={`${idPrefix}-preview`}
						className="min-h-[120px] font-mono text-sm"
						placeholder="Generated JSON preview..."
						readOnly
						aria-label="Generated JSON preview"
					/>
				</section>
			</div>
		</div>
	);
}
