'use client';

import {
	Plus,
	Trash2,
	Braces,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import type { Effect, StateSetEffect, DbPushEffect, DbUpdateEffect, DbRemoveEffect } from '@/lib/engine/match';

export type EffectType = Effect['type'];

export type EffectItem = Effect;

interface EffectsEditorProps {
	effects: EffectItem[];
	onChange: (effects: EffectItem[]) => void;
}

export function EffectsEditor({
	effects,
	onChange,
}: EffectsEditorProps) {
	const [activeTab, setActiveTab] = useState<'all' | 'state' | 'db'>('all');

	const addEffect = (type: EffectType) => {
		let newEffect: Effect;
		if (type === 'state.set') {
			newEffect = { type: 'state.set', raw: {} };
		} else if (type === 'db.push') {
			newEffect = { type: 'db.push', table: '', value: '' };
		} else if (type === 'db.update') {
			newEffect = { type: 'db.update', table: '', match: {}, set: {} };
		} else if (type === 'db.remove') {
			newEffect = { type: 'db.remove', table: '', match: {} };
		} else {
			newEffect = { type: 'unknown', raw: {} };
		}
		onChange([...effects, newEffect]);
	};

	const updateEffect = (index: number, updates: Partial<EffectItem>) => {
		const newEffects = [...effects];
		newEffects[index] = { ...newEffects[index], ...updates } as EffectItem;
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
								table: {(effect as DbPushEffect | DbUpdateEffect | DbRemoveEffect).table || '(empty)'}
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
							value={(effect as StateSetEffect).raw || {}}
							onChange={(val) => updateEffect(index, { raw: val } as Partial<StateSetEffect>)}
						/>
					)}
					{effect.type === 'db.push' && (
						<DbPushEditor
							table={(effect as DbPushEffect).table || ''}
							value={(effect as DbPushEffect).value}
							onTableChange={(t) => updateEffect(index, { table: t } as Partial<DbPushEffect>)}
							onValueChange={(v) => updateEffect(index, { value: v } as Partial<DbPushEffect>)}
						/>
					)}
					{effect.type === 'db.update' && (
						<DbUpdateEditor
							table={(effect as DbUpdateEffect).table || ''}
							match={(effect as DbUpdateEffect).match}
							set={(effect as DbUpdateEffect).set}
							onTableChange={(t) => updateEffect(index, { table: t } as Partial<DbUpdateEffect>)}
							onMatchChange={(m) => updateEffect(index, { match: m } as Partial<DbUpdateEffect>)}
							onSetChange={(s) => updateEffect(index, { set: s } as Partial<DbUpdateEffect>)}
						/>
					)}
					{effect.type === 'db.remove' && (
						<DbRemoveEditor
							table={(effect as DbRemoveEffect).table || ''}
							match={(effect as DbRemoveEffect).match}
							onTableChange={(t) => updateEffect(index, { table: t } as Partial<DbRemoveEffect>)}
							onMatchChange={(m) => updateEffect(index, { match: m } as Partial<DbRemoveEffect>)}
						/>
					)}
				</div>
			</div>
		);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="w-[200px]">
					<div className="grid w-full grid-cols-3 h-8 border rounded-md p-1 bg-muted/50">
						<button 
							type="button"
							onClick={() => setActiveTab('all')}
							className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded", activeTab === 'all' && "bg-background shadow-sm")}
						>
							All
						</button>
						<button 
							type="button"
							onClick={() => setActiveTab('state')}
							className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded", activeTab === 'state' && "bg-background shadow-sm")}
						>
							State
						</button>
						<button 
							type="button"
							onClick={() => setActiveTab('db')}
							className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded", activeTab === 'db' && "bg-background shadow-sm")}
						>
							DB
						</button>
					</div>
				</div>

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
	value: Record<string, unknown>;
	onChange: (val: Record<string, unknown>) => void;
}) {
	return (
		<div className="grid gap-2">
			<Label className="text-xs text-muted-foreground">
				Variables (JSON Object)
			</Label>
			<JsonOrStringInput
				value={value}
				onChange={(val) => {
					if (typeof val === 'object' && val !== null) {
						onChange(val as Record<string, unknown>);
					}
				}}
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
	value: unknown;
	onTableChange: (t: string) => void;
	onValueChange: (v: unknown) => void;
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
	match: Record<string, unknown>;
	set: Record<string, unknown>;
	onTableChange: (t: string) => void;
	onMatchChange: (m: Record<string, unknown>) => void;
	onSetChange: (s: Record<string, unknown>) => void;
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
						onChange={(val) => {
							if (typeof val === 'object' && val !== null) {
								onMatchChange(val as Record<string, unknown>);
							}
						}}
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
						onChange={(val) => {
							if (typeof val === 'object' && val !== null) {
								onSetChange(val as Record<string, unknown>);
							}
						}}
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
	match: Record<string, unknown>;
	onTableChange: (t: string) => void;
	onMatchChange: (m: Record<string, unknown>) => void;
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
					onChange={(val) => {
						if (typeof val === 'object' && val !== null) {
							onMatchChange(val as Record<string, unknown>);
						}
					}}
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
	value: unknown;
	onChange: (val: unknown) => void;
	placeholder?: string;
	minLines?: number;
}) {
	const stringValue =
		typeof value === 'object' && value !== null
			? JSON.stringify(value, null, 2)
			: String(value || '');

	const [internalValue, setInternalValue] = useState(stringValue);
	const [isValidJson, setIsValidJson] = useState(true);

	useEffect(() => {
		const val =
			typeof value === 'object' && value !== null
				? JSON.stringify(value, null, 2)
				: String(value || '');
		setInternalValue(val);
	}, [value]);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement> | { target: { value: string } }) => {
		const newVal = e.target.value;
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

	const handleInsert = (v: string) => {
		const toInsert = `{{ ${v} }}`;
		const newVal = internalValue + toInsert;
		setInternalValue(newVal);
		handleChange({ target: { value: newVal } });
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
