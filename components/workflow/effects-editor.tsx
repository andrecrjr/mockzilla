'use client';

import {
	Braces,
	Database,
	GripVertical,
	MoreHorizontal,
	Plus,
	Trash2,
	X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type EffectType =
	| 'state.set'
	| 'db.push'
	| 'db.update'
	| 'db.remove'
	| 'unknown';

export interface EffectItem {
	type: EffectType;
	// state.set
	raw?: any;
	// db operations
	table?: string;
	value?: any;
	match?: any;
	set?: any;
}

interface EffectsEditorProps {
	effects: EffectItem[];
	onChange: (effects: EffectItem[]) => void;
	scenarioId?: string; // For future autocomplete/suggestions
}

export function EffectsEditor({
	effects,
	onChange,
	scenarioId,
}: EffectsEditorProps) {
	const [activeTab, setActiveTab] = useState<'all' | 'state' | 'db'>('all');

	const addEffect = (type: EffectType) => {
		const newEffect: EffectItem = { type };
		if (type === 'state.set') {
			newEffect.raw = {};
		} else if (type === 'db.push') {
			newEffect.table = '';
			newEffect.value = '';
		} else if (type === 'db.update') {
			newEffect.table = '';
			newEffect.match = {};
			newEffect.set = {};
		} else if (type === 'db.remove') {
			newEffect.table = '';
			newEffect.match = {};
		}
		onChange([...effects, newEffect]);
	};

	const updateEffect = (index: number, updates: Partial<EffectItem>) => {
		const newEffects = [...effects];
		newEffects[index] = { ...newEffects[index], ...updates };
		onChange(newEffects);
	};

	const removeEffect = (index: number) => {
		const newEffects = effects.filter((_, i) => i !== index);
		onChange(newEffects);
	};

	const renderEffectItem = (effect: EffectItem, index: number) => {
		return (
			<div
				key={index}
				className="group relative flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md"
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Badge
							variant="outline"
							className={cn(
								'font-mono text-[10px] uppercase tracking-wider',
								effect.type.startsWith('db.')
									? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300'
									: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300',
							)}
						>
							{effect.type}
						</Badge>
						{effect.type.startsWith('db.') && (
							<span className="text-xs text-muted-foreground font-mono">
								table: {effect.table || '(empty)'}
							</span>
						)}
					</div>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-muted-foreground hover:text-destructive"
							onClick={() => removeEffect(index)}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>

				<div className="pl-1">
					{effect.type === 'state.set' && (
						<StateSetEditor
							value={effect.raw}
							onChange={(val) => updateEffect(index, { raw: val })}
						/>
					)}
					{effect.type === 'db.push' && (
						<DbPushEditor
							table={effect.table || ''}
							value={effect.value}
							onTableChange={(t) => updateEffect(index, { table: t })}
							onValueChange={(v) => updateEffect(index, { value: v })}
						/>
					)}
					{effect.type === 'db.update' && (
						<DbUpdateEditor
							table={effect.table || ''}
							match={effect.match}
							set={effect.set}
							onTableChange={(t) => updateEffect(index, { table: t })}
							onMatchChange={(m) => updateEffect(index, { match: m })}
							onSetChange={(s) => updateEffect(index, { set: s })}
						/>
					)}
					{effect.type === 'db.remove' && (
						<DbRemoveEditor
							table={effect.table || ''}
							match={effect.match}
							onTableChange={(t) => updateEffect(index, { table: t })}
							onMatchChange={(m) => updateEffect(index, { match: m })}
						/>
					)}
				</div>
			</div>
		);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<Tabs
					value={activeTab}
					onValueChange={(v) => setActiveTab(v as any)}
					className="w-[200px]"
				>
					<TabsList className="grid w-full grid-cols-3 h-8">
						<TabsTrigger value="all" className="text-xs">
							All
						</TabsTrigger>
						<TabsTrigger value="state" className="text-xs">
							State
						</TabsTrigger>
						<TabsTrigger value="db" className="text-xs">
							DB
						</TabsTrigger>
					</TabsList>
				</Tabs>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size="sm" className="h-8 text-xs gap-1">
							<Plus className="h-3.5 w-3.5" />
							Add Effect
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-48">
						<DropdownMenuLabel className="text-xs text-muted-foreground">
							State Operations
						</DropdownMenuLabel>
						<DropdownMenuItem
							className="text-xs cursor-pointer"
							onClick={() => addEffect('state.set')}
						>
							Set State Variable
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuLabel className="text-xs text-muted-foreground">
							Database Operations
						</DropdownMenuLabel>
						<DropdownMenuItem
							className="text-xs cursor-pointer"
							onClick={() => addEffect('db.push')}
						>
							Push (Insert)
						</DropdownMenuItem>
						<DropdownMenuItem
							className="text-xs cursor-pointer"
							onClick={() => addEffect('db.update')}
						>
							Update Row
						</DropdownMenuItem>
						<DropdownMenuItem
							className="text-xs cursor-pointer"
							onClick={() => addEffect('db.remove')}
						>
							Remove Row
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="flex flex-col gap-3">
				{effects.length === 0 ? (
					<div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center text-muted-foreground">
						<p className="text-sm">No effects defined yet.</p>
						<p className="text-xs mt-1">
							Add an effect to modify state or database when this transition
							runs.
						</p>
					</div>
				) : (
					effects
						.filter((e) => {
							if (activeTab === 'state') return e.type.startsWith('state');
							if (activeTab === 'db') return e.type.startsWith('db');
							return true;
						})
						.map(renderEffectItem)
				)}
			</div>
		</div>
	);
}

// --- Sub-Editors ---

function StateSetEditor({
	value,
	onChange,
}: {
	value: any;
	onChange: (val: any) => void;
}) {
	// Value is expected to be an object { key: value }
	// We'll treat it as a JSON string for flexibility, or maybe a key-value list later.
	// For now, let's use a smart JSON input.
	return (
		<div className="grid gap-2">
			<Label className="text-xs text-muted-foreground">
				Variables (JSON Object)
			</Label>
			<JsonOrStringInput
				value={value}
				onChange={onChange}
				placeholder='{ "isLoggedIn": true, "userId": "{{ input.body.id }}" }'
				minLines={2}
			/>
		</div>
	);
}

function DbPushEditor({
	table,
	value,
	onTableChange,
	onValueChange,
}: {
	table: string;
	value: any;
	onTableChange: (t: string) => void;
	onValueChange: (v: any) => void;
}) {
	return (
		<div className="grid gap-3">
			<div className="grid gap-1.5">
				<Label className="text-xs text-muted-foreground">Table Name</Label>
				<Input
					value={table}
					onChange={(e) => onTableChange(e.target.value)}
					placeholder="e.g. users, cart, orders"
					className="h-8 font-mono text-xs"
				/>
			</div>
			<div className="grid gap-1.5">
				<Label className="text-xs text-muted-foreground">
					Value to Push (Row)
				</Label>
				<JsonOrStringInput
					value={value}
					onChange={onValueChange}
					placeholder='{ "id": "{{ input.body.id }}", "name": "New Item" }'
					minLines={3}
				/>
			</div>
		</div>
	);
}

function DbUpdateEditor({
	table,
	match,
	set,
	onTableChange,
	onMatchChange,
	onSetChange,
}: {
	table: string;
	match: any;
	set: any;
	onTableChange: (t: string) => void;
	onMatchChange: (m: any) => void;
	onSetChange: (s: any) => void;
}) {
	return (
		<div className="grid gap-3">
			<div className="grid gap-1.5">
				<Label className="text-xs text-muted-foreground">Table Name</Label>
				<Input
					value={table}
					onChange={(e) => onTableChange(e.target.value)}
					placeholder="e.g. users"
					className="h-8 font-mono text-xs"
				/>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="grid gap-1.5">
					<Label className="text-xs text-muted-foreground">
						Match Criteria (Where)
					</Label>
					<JsonOrStringInput
						value={match}
						onChange={onMatchChange}
						placeholder='{ "id": "{{ input.params.id }}" }'
						minLines={3}
					/>
				</div>
				<div className="grid gap-1.5">
					<Label className="text-xs text-muted-foreground">
						Set Fields (Update)
					</Label>
					<JsonOrStringInput
						value={set}
						onChange={onSetChange}
						placeholder='{ "status": "active", "updatedAt": "now" }'
						minLines={3}
					/>
				</div>
			</div>
		</div>
	);
}

function DbRemoveEditor({
	table,
	match,
	onTableChange,
	onMatchChange,
}: {
	table: string;
	match: any;
	onTableChange: (t: string) => void;
	onMatchChange: (m: any) => void;
}) {
	return (
		<div className="grid gap-3">
			<div className="grid gap-1.5">
				<Label className="text-xs text-muted-foreground">Table Name</Label>
				<Input
					value={table}
					onChange={(e) => onTableChange(e.target.value)}
					placeholder="e.g. cart"
					className="h-8 font-mono text-xs"
				/>
			</div>
			<div className="grid gap-1.5">
				<Label className="text-xs text-muted-foreground">
					Match Criteria (Where)
				</Label>
				<JsonOrStringInput
					value={match}
					onChange={onMatchChange}
					placeholder='{ "sku": "{{ input.params.sku }}" }'
					minLines={2}
				/>
			</div>
		</div>
	);
}

// --- Helper Components ---

function JsonOrStringInput({
	value,
	onChange,
	placeholder,
	minLines = 2,
}: {
	value: any;
	onChange: (val: any) => void;
	placeholder?: string;
	minLines?: number;
}) {
	// If value is an object, stringify it for display
	const stringValue =
		typeof value === 'object' && value !== null
			? JSON.stringify(value, null, 2)
			: value || '';

	const [internalValue, setInternalValue] = useState(stringValue);
	const [isValidJson, setIsValidJson] = useState(true);

	useEffect(() => {
		const val =
			typeof value === 'object' && value !== null
				? JSON.stringify(value, null, 2)
				: value || '';
		setInternalValue(val);
	}, [value]);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const newVal = e.target.value;
		setInternalValue(newVal);

		// Try to parse as JSON
		try {
			// If it looks like JSON object/array, try to parse
			if (newVal.trim().startsWith('{') || newVal.trim().startsWith('[')) {
				const parsed = JSON.parse(newVal);
				onChange(parsed);
				setIsValidJson(true);
			} else {
				// Otherwise treat as string (e.g. simple template or empty)
				onChange(newVal);
				setIsValidJson(true);
			}
		} catch {
			// If it looks like JSON but fails, keep as string but maybe mark as invalid if we want strict mode?
			// For now, we allow loose strings (templates) so we just pass the string.
			// But if the user intended JSON, they might want to know it's broken.
			// Let's rely on the fact that if it fails parse, it's just a string.
			onChange(newVal);
			setIsValidJson(false);
		}
	};

	const handleInsert = (v: string) => {
		const toInsert = `{{ ${v} }}`;
		const newVal = internalValue + toInsert;
		setInternalValue(newVal);
		// Trigger change logic
		handleChange({ target: { value: newVal } } as any);
	};

	return (
		<div className="relative">
			<Textarea
				value={internalValue}
				onChange={handleChange}
				placeholder={placeholder}
				className={cn(
					'font-mono text-xs resize-y min-h-[60px]',
					!isValidJson &&
						internalValue.trim().startsWith('{') &&
						'border-orange-300 focus-visible:ring-orange-300',
				)}
				rows={minLines}
			/>
			<div className="absolute right-2 top-2 flex gap-1">
				<InsertVariableMenu onInsert={handleInsert} />
			</div>
		</div>
	);
}

function InsertVariableMenu({ onInsert }: { onInsert: (v: string) => void }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-5 w-5 opacity-50 hover:opacity-100"
					title="Insert Variable"
				>
					<Braces className="h-3 w-3" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="text-xs">
					Insert Variable
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="text-xs"
					onClick={() => onInsert('input.body')}
				>
					Body (Full)
				</DropdownMenuItem>
				<DropdownMenuItem
					className="text-xs"
					onClick={() => onInsert('input.body.id')}
				>
					Body ID
				</DropdownMenuItem>
				<DropdownMenuItem
					className="text-xs"
					onClick={() => onInsert('input.params.id')}
				>
					Param ID
				</DropdownMenuItem>
				<DropdownMenuItem
					className="text-xs"
					onClick={() => onInsert('input.query.q')}
				>
					Query Param
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="text-xs"
					onClick={() => onInsert('state.userId')}
				>
					State Var
				</DropdownMenuItem>
				<DropdownMenuItem
					className="text-xs"
					onClick={() => onInsert('db.users')}
				>
					DB Table (Full)
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
