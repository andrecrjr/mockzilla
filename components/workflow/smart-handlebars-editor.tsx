'use client';

import { Code, Database, Info, Sparkles, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface SmartHandlebarsEditorProps {
	value: unknown;
	onChange: (val: unknown) => void;
	stateData?: {
		state: Record<string, unknown>;
		tables: Record<string, unknown[]>;
	};
	placeholder?: string;
	minLines?: number;
	className?: string;
}

export function SmartHandlebarsEditor({
	value,
	onChange,
	stateData,
	placeholder,
	minLines = 3,
	className,
}: SmartHandlebarsEditorProps) {
	const stringValue =
		typeof value === 'object' && value !== null
			? JSON.stringify(value, null, 2)
			: String(value || '');

	const [internalValue, setInternalValue] = useState(stringValue);
	const [isValidJson, setIsValidJson] = useState(true);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		const val =
			typeof value === 'object' && value !== null
				? JSON.stringify(value, null, 2)
				: String(value || '');
		setInternalValue(val);
	}, [value]);

	const handleChange = (newVal: string) => {
		setInternalValue(newVal);

		try {
			if (newVal.trim().startsWith('{') || newVal.trim().startsWith('[')) {
				const parsed = JSON.parse(newVal);
				onChange(parsed);
				setIsValidJson(true);
			} else {
				onChange(newVal);
				setIsValidJson(true);
			}
		} catch {
			onChange(newVal);
			setIsValidJson(false);
		}
	};

	const insertSnippet = (snippet: string, cursorOffset = 0) => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const text = internalValue;
		const before = text.substring(0, start);
		const after = text.substring(end);

		const newValue = before + snippet + after;
		handleChange(newValue);

		// Reset cursor position
		setTimeout(() => {
			textarea.focus();
			const newPos = start + snippet.length + cursorOffset;
			textarea.setSelectionRange(newPos, newPos);
		}, 0);
	};

	return (
		<div className={cn('flex flex-col gap-2 w-full', className)}>
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/40 rounded-t-md border border-b-0">
				{/* Logic Blocks */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2">
							<Code className="h-3 w-3" /> Logic
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-48">
						<DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Handlebars Blocks</DropdownMenuLabel>
						<DropdownMenuItem onClick={() => insertSnippet('{{#if condition}}\n  \n{{else}}\n  \n{{/if}}', -12)}>
							<div className="flex flex-col gap-0.5">
								<span className="text-xs font-mono font-bold">#if ... else</span>
								<span className="text-[9px] text-muted-foreground">Conditional branch</span>
							</div>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => insertSnippet('{{#each list}}\n  {{this}}\n{{/each}}', -20)}>
							<div className="flex flex-col gap-0.5">
								<span className="text-xs font-mono font-bold">#each ...</span>
								<span className="text-[9px] text-muted-foreground">Iterate over array</span>
							</div>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => insertSnippet('{{#unless condition}}\n  \n{{/unless}}', -12)}>
							<div className="flex flex-col gap-0.5">
								<span className="text-xs font-mono font-bold">#unless ...</span>
								<span className="text-[9px] text-muted-foreground">Negative condition</span>
							</div>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => insertSnippet('{{{json data}}}')}>
							<div className="flex flex-col gap-0.5">
								<span className="text-xs font-mono font-bold">{"{{{json ...}}}"}</span>
								<span className="text-[9px] text-muted-foreground">Safe JSON stringify</span>
							</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Context Variables */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2">
							<Database className="h-3 w-3" /> Context
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-56 max-h-[300px] overflow-y-auto">
						<DropdownMenuGroup>
							<DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Scenario State</DropdownMenuLabel>
							{stateData?.state && Object.keys(stateData.state).length > 0 ? (
								Object.keys(stateData.state).map((key) => (
									<DropdownMenuItem key={key} onClick={() => insertSnippet(`{{state.${key}}}`)}>
										<span className="text-xs font-mono">state.{key}</span>
									</DropdownMenuItem>
								))
							) : (
								<p className="px-2 py-1.5 text-[10px] text-muted-foreground italic">No state variables yet</p>
							)}
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Mini-DB Tables</DropdownMenuLabel>
							{stateData?.tables && Object.keys(stateData.tables).length > 0 ? (
								Object.keys(stateData.tables).map((table) => (
									<DropdownMenuItem key={table} onClick={() => insertSnippet(`{{db.${table}}}`)}>
										<span className="text-xs font-mono">db.{table}</span>
									</DropdownMenuItem>
								))
							) : (
								<p className="px-2 py-1.5 text-[10px] text-muted-foreground italic">No tables yet</p>
							)}
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Global Context</DropdownMenuLabel>
							<DropdownMenuItem onClick={() => insertSnippet('{{now}}')}>
								<span className="text-xs font-mono">now</span>
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Request Data */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2">
							<Zap className="h-3 w-3" /> Input
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-48">
						<DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Incoming Request</DropdownMenuLabel>
						<DropdownMenuItem onClick={() => insertSnippet('{{input.body}}')}>
							<span className="text-xs font-mono">input.body</span>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => insertSnippet('{{input.params.id}}')}>
							<span className="text-xs font-mono">input.params.id</span>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => insertSnippet('{{input.query.q}}')}>
							<span className="text-xs font-mono">input.query</span>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => insertSnippet('{{input.headers.[content-type]}}')}>
							<span className="text-xs font-mono">input.headers</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Faker Generators */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2">
							<Sparkles className="h-3 w-3" /> Faker
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-56 max-h-[300px] overflow-y-auto">
						<DropdownMenuGroup>
							<DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Person</DropdownMenuLabel>
							<DropdownMenuItem onClick={() => insertSnippet('{{faker.person.fullName}}')}>
								<span className="text-xs">Full Name</span>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => insertSnippet('{{faker.person.firstName}}')}>
								<span className="text-xs">First Name</span>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => insertSnippet('{{faker.internet.email}}')}>
								<span className="text-xs">Email Address</span>
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Commerce</DropdownMenuLabel>
							<DropdownMenuItem onClick={() => insertSnippet('{{faker.commerce.productName}}')}>
								<span className="text-xs">Product Name</span>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => insertSnippet('{{faker.commerce.price}}')}>
								<span className="text-xs">Price</span>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => insertSnippet('{{faker.commerce.department}}')}>
								<span className="text-xs">Department</span>
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">System</DropdownMenuLabel>
							<DropdownMenuItem onClick={() => insertSnippet('{{faker.string.uuid}}')}>
								<span className="text-xs font-mono uppercase text-[10px]">UUID</span>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => insertSnippet('{{faker.number.int({"min": 1, "max": 100})}}')}>
								<span className="text-xs">Random Int (1-100)</span>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => insertSnippet('{{faker.image.avatar}}')}>
								<span className="text-xs">Avatar URL</span>
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>

				<div className="flex-1" />

				{/* Help / Docs */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant="ghost" size="icon" className="h-6 w-6" asChild>
							<a href="/docs/reference/dynamic-interpolation" target="_blank" rel="noreferrer">
								<Info className="h-3 w-3 text-muted-foreground" />
							</a>
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p className="text-xs">View Handlebars documentation</p>
					</TooltipContent>
				</Tooltip>
			</div>

			{/* Editor */}
			<div className="relative group">
				<Textarea
					ref={textareaRef}
					value={internalValue}
					onChange={(e) => handleChange(e.target.value)}
					placeholder={placeholder}
					className={cn(
						'font-mono text-xs resize-y rounded-t-none border-t-0 bg-background transition-colors focus-visible:ring-1',
						!isValidJson &&
							internalValue.trim().startsWith('{') &&
							'border-orange-300 focus-visible:ring-orange-300',
						className
					)}
					rows={minLines}
				/>
				
				{!isValidJson && internalValue.trim().startsWith('{') && (
					<div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 text-[10px] font-medium rounded border border-orange-200 dark:border-orange-900 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
						Invalid JSON
					</div>
				)}
			</div>
		</div>
	);
}
