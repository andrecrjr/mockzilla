'use client';

import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { FieldTooltip } from '@/components/folder-tooltips';
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
import type {
	DbPushEffect,
	DbRemoveEffect,
	DbUpdateEffect,
	Effect,
	StateSetEffect,
} from '@/lib/engine/match';
import { cn } from '@/lib/utils';
import { SmartHandlebarsEditor } from './smart-handlebars-editor';

export type EffectType = Effect['type'];

export type EffectItem = Effect;

interface EffectsEditorProps {
	effects: EffectItem[];
	onChange: (effects: EffectItem[]) => void;
	stateData?: {
		state: Record<string, unknown>;
		tables: Record<string, unknown[]>;
	};
}

export function EffectsEditor({ effects, onChange, stateData }: EffectsEditorProps) {
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
								table:{' '}
								{(effect as DbPushEffect | DbUpdateEffect | DbRemoveEffect)
									.table || '(empty)'}
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
							onChange={(val) =>
								updateEffect(index, { raw: val } as Partial<StateSetEffect>)
							}
							stateData={stateData}
						/>
					)}
					{effect.type === 'db.push' && (
						<DbPushEditor
							table={(effect as DbPushEffect).table || ''}
							value={(effect as DbPushEffect).value}
							onTableChange={(t) =>
								updateEffect(index, { table: t } as Partial<DbPushEffect>)
							}
							onValueChange={(v) =>
								updateEffect(index, { value: v } as Partial<DbPushEffect>)
							}
							stateData={stateData}
						/>
					)}
					{effect.type === 'db.update' && (
						<DbUpdateEditor
							table={(effect as DbUpdateEffect).table || ''}
							match={(effect as DbUpdateEffect).match}
							set={(effect as DbUpdateEffect).set}
							onTableChange={(t) =>
								updateEffect(index, { table: t } as Partial<DbUpdateEffect>)
							}
							onMatchChange={(m) =>
								updateEffect(index, { match: m } as Partial<DbUpdateEffect>)
							}
							onSetChange={(s) =>
								updateEffect(index, { set: s } as Partial<DbUpdateEffect>)
							}
							stateData={stateData}
						/>
					)}
					{effect.type === 'db.remove' && (
						<DbRemoveEditor
							table={(effect as DbRemoveEffect).table || ''}
							match={(effect as DbRemoveEffect).match}
							onTableChange={(t) =>
								updateEffect(index, { table: t } as Partial<DbRemoveEffect>)
							}
							onMatchChange={(m) =>
								updateEffect(index, { match: m } as Partial<DbRemoveEffect>)
							}
							stateData={stateData}
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
							className={cn(
								'text-[10px] uppercase tracking-wider px-2 py-0.5 rounded transition-all',
								activeTab === 'all' && 'bg-background shadow-sm text-foreground',
							)}
						>
							All
						</button>
						<button
							type="button"
							onClick={() => setActiveTab('state')}
							className={cn(
								'text-[10px] uppercase tracking-wider px-2 py-0.5 rounded transition-all',
								activeTab === 'state' && 'bg-background shadow-sm text-foreground',
							)}
						>
							State
						</button>
						<button
							type="button"
							onClick={() => setActiveTab('db')}
							className={cn(
								'text-[10px] uppercase tracking-wider px-2 py-0.5 rounded transition-all',
								activeTab === 'db' && 'bg-background shadow-sm text-foreground',
							)}
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
	stateData,
}: {
	value: Record<string, unknown>;
	onChange: (val: Record<string, unknown>) => void;
	stateData?: EffectsEditorProps['stateData'];
}) {
	return (
		<div className="grid gap-2">
			<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
				Variables
				<FieldTooltip
					label="Variables"
					description="Set or update state variables for this scenario. State is a persistent key-value store."
					example='{ "isLoggedIn": true, "userId": "{{ input.body.id }}" }'
					docsLink="/docs/workflows#state-set"
				/>
			</Label>
			<KeyValueEditor
				data={value}
				onChange={onChange}
				keyPlaceholder="Variable Name"
				valuePlaceholder="Value (supports interpolation)"
				suggestions={Object.keys(stateData?.state || {})}
				addButtonLabel="Add Variable"
			/>
		</div>
	);
}

function DbPushEditor({
	table,
	value,
	onTableChange,
	onValueChange,
	stateData,
}: {
	table: string;
	value: unknown;
	onTableChange: (t: string) => void;
	onValueChange: (v: unknown) => void;
	stateData?: EffectsEditorProps['stateData'];
}) {
	return (
		<div className="grid gap-3">
			<div className="grid gap-1.5">
				<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
					Table Name
					<FieldTooltip
						label="Table Name"
						description="The name of the mini-database table to operate on."
						example="users"
					/>
				</Label>
				<AutocompleteInput
					value={table}
					onChange={onTableChange}
					suggestions={Object.keys(stateData?.tables || {})}
					placeholder="e.g. users, cart, orders"
				/>
			</div>
			<div className="grid gap-1.5">
				<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
					Value to Push (Row)
					<FieldTooltip
						label="Value to Push"
						description="The data to append to the table."
						example="{{ input.body }}"
					/>
				</Label>
				<JsonOrStringInput
					value={value}
					onChange={onValueChange}
					placeholder='{ "id": "{{ input.body.id }}", "name": "New Item" }'
					minLines={3}
					stateData={stateData}
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
	stateData,
}: {
	table: string;
	match: Record<string, unknown>;
	set: Record<string, unknown>;
	onTableChange: (t: string) => void;
	onMatchChange: (m: Record<string, unknown>) => void;
	onSetChange: (s: Record<string, unknown>) => void;
	stateData?: EffectsEditorProps['stateData'];
}) {
	return (
		<div className="grid gap-3">
			<div className="grid gap-1.5">
				<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
					Table Name
					<FieldTooltip
						label="Table Name"
						description="The name of the mini-database table to operate on."
						example="users"
					/>
				</Label>
				<AutocompleteInput
					value={table}
					onChange={onTableChange}
					suggestions={Object.keys(stateData?.tables || {})}
					placeholder="e.g. users"
				/>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div className="grid gap-1.5">
					<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
						Match Criteria (Where)
						<FieldTooltip
							label="Match Criteria"
							description="Filter which rows to update."
							example='{ "id": "{{ input.params.id }}" }'
						/>
					</Label>
					<KeyValueEditor
						data={match}
						onChange={onMatchChange}
						keyPlaceholder="Field"
						valuePlaceholder="Value"
						addButtonLabel="Add Match"
					/>
				</div>
				<div className="grid gap-1.5">
					<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
						Set Fields (Update)
						<FieldTooltip
							label="Set Fields"
							description="Fields to update in the matching rows."
							example='{ "status": "active" }'
						/>
					</Label>
					<KeyValueEditor
						data={set}
						onChange={onSetChange}
						keyPlaceholder="Field"
						valuePlaceholder="New Value"
						addButtonLabel="Add Field"
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
	stateData,
}: {
	table: string;
	match: Record<string, unknown>;
	onTableChange: (t: string) => void;
	onMatchChange: (m: Record<string, unknown>) => void;
	stateData?: EffectsEditorProps['stateData'];
}) {
	return (
		<div className="grid gap-3">
			<div className="grid gap-1.5">
				<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
					Table Name
					<FieldTooltip
						label="Table Name"
						description="The name of the mini-database table to operate on."
						example="cart"
					/>
				</Label>
				<AutocompleteInput
					value={table}
					onChange={onTableChange}
					suggestions={Object.keys(stateData?.tables || {})}
					placeholder="e.g. cart"
				/>
			</div>
			<div className="grid gap-1.5">
				<Label className="text-xs text-muted-foreground flex items-center gap-1.5">
					Match Criteria (Where)
					<FieldTooltip
						label="Match Criteria"
						description="Filter which rows to remove."
						example='{ "sku": "{{ input.params.sku }}" }'
					/>
				</Label>
				<KeyValueEditor
					data={match}
					onChange={onMatchChange}
					keyPlaceholder="Field"
					valuePlaceholder="Value"
					addButtonLabel="Add Match"
				/>
			</div>
		</div>
	);
}

// --- Helper Components ---

function KeyValueEditor({
	data,
	onChange,
	keyPlaceholder = 'Key',
	valuePlaceholder = 'Value',
	suggestions = [],
	addButtonLabel = 'Add Pair',
}: {
	data: Record<string, unknown>;
	onChange: (val: Record<string, unknown>) => void;
	keyPlaceholder?: string;
	valuePlaceholder?: string;
	suggestions?: string[];
	addButtonLabel?: string;
}) {
	const items = Object.entries(data).map(([key, value]) => ({ key, value: String(value) }));

	const handleAdd = () => {
		onChange({ ...data, '': '' });
	};

	const handleRemove = (keyToRemove: string) => {
		const newData = { ...data };
		delete newData[keyToRemove];
		onChange(newData);
	};

	const handleUpdate = (oldKey: string, newKey: string, newValue: string) => {
		const newData: Record<string, unknown> = {};
		
		for (const [k, v] of Object.entries(data)) {
			if (k === oldKey) {
				newData[newKey] = newValue;
			} else {
				newData[k] = v;
			}
		}

		if (oldKey === '' && !Object.prototype.hasOwnProperty.call(data, '')) {
			newData[newKey] = newValue;
		}

		onChange(newData);
	};

	return (
		<div className="space-y-2">
			{items.length === 0 ? (
				<p className="text-[10px] text-muted-foreground italic py-1">No items defined.</p>
			) : (
				items.map((item, idx) => (
					<div key={idx} className="flex items-center gap-2">
						<AutocompleteInput
							value={item.key}
							onChange={(val) => handleUpdate(item.key, val, item.value)}
							suggestions={suggestions}
							placeholder={keyPlaceholder}
							className="flex-1 h-8 text-xs font-mono"
						/>
						<Input
							value={item.value}
							onChange={(e) => handleUpdate(item.key, item.key, e.target.value)}
							placeholder={valuePlaceholder}
							className="flex-1 h-8 text-xs"
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-muted-foreground hover:text-destructive"
							onClick={() => handleRemove(item.key)}
						>
							<X className="h-3 w-3" />
						</Button>
					</div>
				))
			)}
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="w-full h-7 text-[10px] border-dashed"
				onClick={handleAdd}
			>
				<Plus className="h-3 w-3 mr-1" /> {addButtonLabel}
			</Button>
		</div>
	);
}

function AutocompleteInput({
	value,
	onChange,
	suggestions,
	placeholder,
	className,
}: {
	value: string;
	onChange: (val: string) => void;
	suggestions: string[];
	placeholder?: string;
	className?: string;
}) {
	const listId = `list-${Math.random().toString(36).substr(2, 9)}`;

	return (
		<div className="relative w-full">
			<Input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={className}
				list={listId}
			/>
			<datalist id={listId}>
				{suggestions.map((s) => (
					<option key={s} value={s} />
				))}
			</datalist>
		</div>
	);
}

function JsonOrStringInput({
	value,
	onChange,
	placeholder,
	minLines = 2,
	stateData,
}: {
	value: unknown;
	onChange: (val: unknown) => void;
	placeholder?: string;
	minLines?: number;
	stateData?: EffectsEditorProps['stateData'];
}) {
	return (
		<SmartHandlebarsEditor
			value={value}
			onChange={onChange}
			placeholder={placeholder}
			minLines={minLines}
			stateData={stateData}
		/>
	);
}
