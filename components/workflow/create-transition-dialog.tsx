'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Braces, Loader2, Pencil, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import useSWRMutation from 'swr/mutation';
import * as z from 'zod';
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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
import { Textarea } from '../ui/textarea';
import { type EffectItem, EffectsEditor } from './effects-editor';

// --- Schema ---
const transitionSchema = z.object({
	name: z.string().optional(),
	description: z.string().optional(),
	path: z
		.string()
		.min(1, 'Path is required')
		.startsWith('/', 'Path must start with /'),
	method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
	responseStatus: z.coerce.number().min(100).max(599),
	responseBody: z.string().min(1, 'Response body is required'),
	conditions: z.any().optional(),
});

type TransitionFormValues = z.infer<typeof transitionSchema>;

export interface Transition {
	id: number;
	scenarioId: string;
	name: string;
	description?: string;
	path: string;
	method: string;
	conditions: object | any[];
	effects: any[];
	response: { status: number; body: any };
	meta: object;
	createdAt: string;
	updatedAt?: string;
}

interface TransitionDialogProps {
	scenarioId: string;
	onSuccess: () => void;
	// Edit mode props
	transition?: Transition;
	mode?: 'create' | 'edit';
	trigger?: React.ReactNode;
	// Controlled open state (for external control)
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

// SWR Mutation fetchers
async function createTransition(url: string, { arg }: { arg: any }) {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(arg),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error || 'Failed to create transition');
	}
	return res.json();
}

async function updateTransition(url: string, { arg }: { arg: any }) {
	const res = await fetch(url, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(arg),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error || 'Failed to update transition');
	}
	return res.json();
}

export function TransitionDialog({
	scenarioId,
	onSuccess,
	transition,
	mode = 'create',
	trigger,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
}: TransitionDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const [useConditionBuilder, setUseConditionBuilder] = useState(true);
	const [useEffectsBuilder, setUseEffectsBuilder] = useState(true);
	const [rawEffectsJson, setRawEffectsJson] = useState('');

	// Use controlled state if provided, otherwise use internal state
	const isControlled = controlledOpen !== undefined;
	const open = isControlled ? controlledOpen : internalOpen;
	const setOpen = (value: boolean) => {
		if (isControlled) {
			controlledOnOpenChange?.(value);
		} else {
			setInternalOpen(value);
		}
	};

	const isEditMode = mode === 'edit' && transition;

	// UI State for builders
	const [conditionsList, setConditionsList] = useState<
		{ field: string; type: string; value: string }[]
	>([]);
	const [effectsList, setEffectsList] = useState<EffectItem[]>([]);

	const form = useForm<TransitionFormValues>({
		resolver: zodResolver(transitionSchema),
		defaultValues: {
			name: '',
			description: '',
			path: '',
			method: 'POST',
			responseStatus: 200,
			responseBody: '{"success": true}',
			conditions: '{}',
		},
	});

	// Populate form when editing
	useEffect(() => {
		if (open && isEditMode && transition) {
			form.reset({
				name: transition.name || '',
				description: transition.description || '',
				path: transition.path,
				method: transition.method as 'GET' | 'POST' | 'PUT' | 'DELETE',
				responseStatus: transition.response?.status || 200,
				responseBody:
					typeof transition.response?.body === 'object'
						? JSON.stringify(transition.response.body, null, 2)
						: transition.response?.body || '{"success": true}',
				conditions: JSON.stringify(transition.conditions || {}),
			});

			// Populate conditions builder
			if (Array.isArray(transition.conditions)) {
				setConditionsList(
					transition.conditions.map((c: any) => ({
						field: c.field || '',
						type: c.type || 'eq',
						value: c.value || '',
					})),
				);
			} else {
				setConditionsList([]);
			}

			// Populate effects
			if (Array.isArray(transition.effects)) {
				const parsedEffects: EffectItem[] = transition.effects.map((e: any) => {
					if (e.type === 'state.set') {
						return {
							type: 'state.set',
							raw: typeof e.raw === 'object' ? e.raw : e.raw || {},
						};
					}
					if (e.type === 'db.push') {
						return {
							type: 'db.push',
							table: e.table || '',
							value: typeof e.value === 'object' ? e.value : e.value || '',
						};
					}
					if (e.type === 'db.update') {
						return {
							type: 'db.update',
							table: e.table || '',
							match: typeof e.match === 'object' ? e.match : e.match || '',
							set: typeof e.set === 'object' ? e.set : e.set || '',
						};
					}
					if (e.type === 'db.remove') {
						return {
							type: 'db.remove',
							table: e.table || '',
							match: typeof e.match === 'object' ? e.match : e.match || '',
						};
					}
					return {
						type: 'unknown',
						raw: e,
					};
				});

				setEffectsList(parsedEffects);
				setRawEffectsJson(JSON.stringify(transition.effects, null, 2));
			} else {
				setEffectsList([]);
				setRawEffectsJson('[]');
			}
		}
	}, [open, isEditMode, transition, form]);

	// Reset form when closing
	useEffect(() => {
		if (!open && !isEditMode) {
			form.reset();
			setConditionsList([]);
			setEffectsList([]);
			setRawEffectsJson('[]');
		}
	}, [open, isEditMode, form]);

	// Sync effectsList and raw JSON when switching modes
	useEffect(() => {
		if (useEffectsBuilder) {
			// When switching to builder mode, effectsList is already properly formatted
		} else {
			// When switching to JSON mode, ensure rawEffectsJson reflects the current effectsList
			setRawEffectsJson(JSON.stringify(effectsList, null, 2));
		}
	}, [useEffectsBuilder, effectsList]);

	const { trigger: triggerCreate, isMutating: isCreating } = useSWRMutation(
		'/api/workflow/transitions',
		createTransition,
		{
			onSuccess: () => {
				toast.success('Transition Created');
				handleClose();
				onSuccess();
			},
			onError: (err) => {
				toast.error(err.message || 'Error creating transition');
			},
		},
	);

	const { trigger: triggerUpdate, isMutating: isUpdating } = useSWRMutation(
		transition ? `/api/workflow/transitions/${transition.id}` : null,
		updateTransition,
		{
			onSuccess: () => {
				toast.success('Transition Updated');
				handleClose();
				onSuccess();
			},
			onError: (err) => {
				toast.error(err.message || 'Error updating transition');
			},
		},
	);

	const isMutating = isCreating || isUpdating;

	const handleClose = () => {
		setOpen(false);
		form.reset();
		setConditionsList([]);
		setEffectsList([]);
	};

	// --- Effects Helpers ---
	// Moved to EffectsEditor but kept example helpers for dropdown usage that now feeds into EffectsEditor state.

	// --- Conditions Helpers ---
	const addCondition = () => {
		setConditionsList([
			...conditionsList,
			{ field: '', type: 'eq', value: '' },
		]);
	};

	const updateCondition = (index: number, key: string, val: string) => {
		const newConditions = [...conditionsList];
		(newConditions[index] as any)[key] = val;
		setConditionsList(newConditions);
	};

	const removeCondition = (index: number) => {
		setConditionsList(conditionsList.filter((_, i) => i !== index));
	};

	// --- Insert Var ---
	const insertVariable = (
		field: 'responseBody' | 'conditions',
		variable: string,
	) => {
		if (field === 'conditions' && useConditionBuilder) return;
		const current = form.getValues(field as any);
		form.setValue(field as any, (current || '') + variable);
	};

	const insertConditionExample = (
		example: 'loggedIn' | 'queryPage' | 'headerAuth' | 'paramEq',
	) => {
		if (useConditionBuilder) {
			if (example === 'loggedIn') {
				setConditionsList([
					...conditionsList,
					{ field: 'state.isLoggedIn', type: 'eq', value: 'true' },
				]);
			} else if (example === 'queryPage') {
				setConditionsList([
					...conditionsList,
					{ field: 'input.query.page', type: 'exists', value: '' },
					{ field: 'input.query.page', type: 'gt', value: '1' },
				]);
			} else if (example === 'headerAuth') {
				setConditionsList([
					...conditionsList,
					{ field: 'input.headers.authorization', type: 'exists', value: '' },
				]);
			} else if (example === 'paramEq') {
				setConditionsList([
					...conditionsList,
					{ field: 'input.params.id', type: 'eq', value: '42' },
				]);
			}
			return;
		}
		if (example === 'loggedIn') {
			form.setValue(
				'conditions',
				'[\n  { "type": "eq", "field": "state.isLoggedIn", "value": true }\n]',
			);
		} else if (example === 'queryPage') {
			form.setValue(
				'conditions',
				'[\n  { "type": "exists", "field": "input.query.page" },\n  { "type": "gt", "field": "input.query.page", "value": 1 }\n]',
			);
		} else if (example === 'headerAuth') {
			form.setValue(
				'conditions',
				'[\n  { "type": "exists", "field": "input.headers.authorization" }\n]',
			);
		} else if (example === 'paramEq') {
			form.setValue(
				'conditions',
				'[\n  { "type": "eq", "field": "input.params.id", "value": "42" }\n]',
			);
		}
	};

	const addEffectExample = (
		example: 'stateLogin' | 'pushUsers' | 'updateUser' | 'removeCartBySku',
	) => {
		if (example === 'stateLogin') {
			setEffectsList([
				...effectsList,
				{
					type: 'state.set',
					raw: { isLoggedIn: true, userId: '{{ input.body.id }}' },
				},
			]);
		} else if (example === 'pushUsers') {
			setEffectsList([
				...effectsList,
				{ type: 'db.push', table: 'users', value: '{{ input.body }}' },
			]);
		} else if (example === 'updateUser') {
			setEffectsList([
				...effectsList,
				{
					type: 'db.update',
					table: 'users',
					match: { id: '{{ input.params.id }}' },
					set: { role: 'admin' },
				},
			]);
		} else if (example === 'removeCartBySku') {
			setEffectsList([
				...effectsList,
				{
					type: 'db.remove',
					table: 'cart',
					match: { sku: '{{ input.params.sku }}' },
				},
			]);
		}
	};

	const setResponseExample = (
		example:
			| 'successUser'
			| 'usersTable'
			| 'echoName'
			| 'cartCount'
			| 'paramIdResponse',
	) => {
		if (example === 'successUser') {
			form.setValue(
				'responseBody',
				JSON.stringify({ success: true, user: '{{ state.userId }}' }, null, 2),
			);
		} else if (example === 'usersTable') {
			form.setValue('responseBody', '{{ db.users }}');
		} else if (example === 'echoName') {
			form.setValue(
				'responseBody',
				JSON.stringify({ echo: '{{ input.body.name }}' }, null, 2),
			);
		} else if (example === 'cartCount') {
			form.setValue(
				'responseBody',
				JSON.stringify(
					{ success: true, count: '{{ db.cart.length }}' },
					null,
					2,
				),
			);
		} else if (example === 'paramIdResponse') {
			form.setValue(
				'responseBody',
				JSON.stringify({ id: '{{ input.params.id }}' }, null, 2),
			);
		}
	};

	const onSubmit = async (data: TransitionFormValues) => {
		// 1. Process Conditions
		let finalConditions: any;
		if (useConditionBuilder) {
			finalConditions = conditionsList.map((c) => ({
				type: c.type,
				field: c.field,
				value: c.value,
			}));
		} else {
			try {
				finalConditions = JSON.parse(data.conditions || '{}');
			} catch {
				form.setError('conditions', { message: 'Invalid JSON conditions' });
				return;
			}
		}

		// 2. Process Response Body
		let finalResponseBody: string;
		try {
			finalResponseBody = JSON.parse(data.responseBody);
		} catch {
			finalResponseBody = data.responseBody;
		}

		// 3. Process Effects
		let finalEffects: any;
		if (useEffectsBuilder) {
			// When using the builder, effectsList is already properly formatted
			finalEffects = effectsList;
		} else {
			// When in JSON mode, effectsList is already updated from the textarea via onChange
			finalEffects = effectsList;
		}

		const payload = {
			scenarioId,
			name: data.name,
			description: data.description || null,
			path: data.path,
			method: data.method,
			conditions: finalConditions,
			effects: finalEffects,
			response: {
				status: data.responseStatus,
				body: finalResponseBody,
			},
		};

		if (isEditMode) {
			await triggerUpdate(payload);
		} else {
			await triggerCreate(payload);
		}
	};

	const defaultTrigger = isEditMode ? (
		<Button variant="ghost" size="sm">
			<Pencil className="mr-2 h-4 w-4" />
			Edit
		</Button>
	) : (
		<Button>
			<Plus className="mr-2 h-4 w-4" />
			Add Transition
		</Button>
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
			<DialogContent className="sm:max-w-[90vw] lg:max-w-[1400px] max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? 'Edit Transition' : 'Create Transition'}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? 'Update this transition rule.'
							: 'Define a new rule for this scenario.'}
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="grid gap-x-6 gap-y-4 py-6"
				>
					{/* Basics */}
					<div className="grid md:grid-cols-12 gap-x-6 gap-y-4">
						<div className="md:col-span-6 space-y-3">
							<Label>Name</Label>
							<Input
								{...form.register('name')}
								placeholder="e.g. Add Item"
								className="h-9"
							/>
							{form.formState.errors.name && (
								<p className="text-destructive text-xs">
									{form.formState.errors.name.message}
								</p>
							)}
						</div>
						<div className="md:col-span-6 space-y-3">
							<Label>Method</Label>
							<Controller
								control={form.control}
								name="method"
								render={({ field }) => (
									<Select onValueChange={field.onChange} value={field.value}>
										<SelectTrigger className="h-9">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="GET">GET</SelectItem>
											<SelectItem value="POST">POST</SelectItem>
											<SelectItem value="PUT">PUT</SelectItem>
											<SelectItem value="DELETE">DELETE</SelectItem>
										</SelectContent>
									</Select>
								)}
							/>
						</div>
					</div>

					{/* Description & Path */}
					<div className="grid md:grid-cols-12 gap-x-6 gap-y-4">
						<div className="md:col-span-8 space-y-3">
							<Label>
								Description{' '}
								<span className="text-muted-foreground text-xs">
									(optional)
								</span>
							</Label>
							<Input
								{...form.register('description')}
								placeholder="Adds an item to the shopping cart"
								className="h-9"
							/>
						</div>
						<div className="md:col-span-4 space-y-3">
							<Label>Path</Label>
							<Input
								{...form.register('path')}
								placeholder="/cart/items"
								className="h-9"
							/>
							{form.formState.errors.path && (
								<p className="text-destructive text-xs">
									{form.formState.errors.path.message}
								</p>
							)}
						</div>
					</div>

					{/* Conditions Section */}
					<div className="flex justify-between space-y-3 gap-3">
						<div className="w-full">
							<div className="flex items-center justify-between">
								<Label className="flex items-center gap-2">
									Conditions
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-5 px-2 text-[10px] text-muted-foreground bg-muted/50 hover:bg-muted"
										onClick={() => setUseConditionBuilder(!useConditionBuilder)}
									>
										{useConditionBuilder
											? 'Switch to JSON'
											: 'Switch to Builder'}
									</Button>
								</Label>
								<div className="flex items-center gap-2">
									{!useConditionBuilder && (
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="h-6 gap-1 text-xs"
												>
													<Braces className="h-3 w-3" />
													Insert Var
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													onClick={() =>
														insertVariable('conditions', '{{ input.body.id }}')
													}
												>
													Body ID
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() =>
														insertVariable(
															'conditions',
															'{{ input.query.search }}',
														)
													}
												>
													Query Param
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() =>
														insertVariable(
															'conditions',
															'{{ state.isLoggedIn }}',
														)
													}
												>
													State Var
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() =>
														insertVariable(
															'conditions',
															'{{ db.users.length }}',
														)
													}
												>
													DB Count
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									)}
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												type="button"
												variant="outline"
												size="sm"
												className="h-6 text-xs"
											>
												Examples
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem
												onClick={() => insertConditionExample('loggedIn')}
											>
												Logged-in guard
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => insertConditionExample('queryPage')}
											>
												Pagination guard
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => insertConditionExample('headerAuth')}
											>
												Require Authorization header
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => insertConditionExample('paramEq')}
											>
												Param equals (id)
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>

							{useConditionBuilder ? (
								<div className="space-y-3 border rounded-md p-4 bg-muted/10">
									{conditionsList.map((cond, idx) => (
										<div
											key={`cond-${idx + cond.type}`}
											className="grid grid-cols-12 gap-3 items-center"
										>
											<Input
												placeholder="Field (e.g. input.body.id)"
												className="col-span-5 h-9 text-xs font-mono"
												value={cond.field}
												onChange={(e) =>
													updateCondition(idx, 'field', e.target.value)
												}
											/>
											<Select
												value={cond.type}
												onValueChange={(v) => updateCondition(idx, 'type', v)}
											>
												<SelectTrigger className="col-span-2 h-9 w-full text-xs">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="eq">==</SelectItem>
													<SelectItem value="neq">!=</SelectItem>
													<SelectItem value="gt">&gt;</SelectItem>
													<SelectItem value="lt">&lt;</SelectItem>
													<SelectItem value="exists">Exists</SelectItem>
													<SelectItem value="contains">In</SelectItem>
												</SelectContent>
											</Select>
											{cond.type !== 'exists' && (
												<Input
													placeholder="Value"
													className="col-span-4 h-9 text-xs"
													value={cond.value}
													onChange={(e) =>
														updateCondition(idx, 'value', e.target.value)
													}
												/>
											)}
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="col-span-1 h-9 w-9 justify-self-end text-muted-foreground hover:text-destructive"
												onClick={() => removeCondition(idx)}
											>
												<X className="h-3 w-3" />
											</Button>
										</div>
									))}
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="w-full text-xs h-9 border-dashed"
										onClick={addCondition}
									>
										<Plus className="h-3 w-3 mr-1" /> Add Rule
									</Button>
								</div>
							) : (
								<>
									<Textarea
										{...form.register('conditions')}
										className="font-mono text-xs"
										rows={8}
									/>
									{form.formState.errors.conditions && (
										<p className="text-destructive text-xs">
											{String(form.formState.errors.conditions.message)}
										</p>
									)}
								</>
							)}
						</div>

						{/* Effects Builder */}
						<div className="border rounded-md p-4 bg-muted/10 w-full">
							<div className="flex items-center justify-between mb-4">
								<Label className="flex items-center gap-2">
									Effects
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-5 px-2 text-[10px] text-muted-foreground bg-muted/50 hover:bg-muted"
										onClick={() => setUseEffectsBuilder(!useEffectsBuilder)}
									>
										{useEffectsBuilder ? 'Switch to JSON' : 'Switch to Builder'}
									</Button>
								</Label>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-6 text-xs"
										>
											Load Example
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											onClick={() => addEffectExample('stateLogin')}
										>
											Set login state
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => addEffectExample('pushUsers')}
										>
											Push body to users
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => addEffectExample('updateUser')}
										>
											Update user by param
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => addEffectExample('removeCartBySku')}
										>
											Remove cart by sku
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>

							{useEffectsBuilder ? (
								<EffectsEditor
									effects={effectsList}
									onChange={setEffectsList}
									scenarioId={scenarioId}
								/>
							) : (
								<Textarea
									value={JSON.stringify(effectsList, null, 2)}
									onChange={(e) => {
										try {
											const parsed = JSON.parse(e.target.value);
											if (Array.isArray(parsed)) {
												setEffectsList(parsed);
											}
										} catch {
											// If JSON is invalid, we won't update the state
											// But we should allow the user to continue typing
										}
									}}
									className="font-mono text-xs"
									rows={8}
								/>
							)}
						</div>
					</div>

					{/* Response */}
					<div className="grid md:grid-cols-12 gap-x-6 gap-y-4">
						<div className="md:col-span-2 space-y-3">
							<Label>Status</Label>
							<Input
								type="number"
								{...form.register('responseStatus')}
								className="h-9"
							/>
							{form.formState.errors.responseStatus && (
								<p className="text-destructive text-xs">
									{form.formState.errors.responseStatus.message}
								</p>
							)}
						</div>
						<div className="md:col-span-10 space-y-3">
							<div className="flex items-center justify-between">
								<Label>Response Body (JSON)</Label>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-6 gap-1 text-xs"
										>
											<Braces className="h-3 w-3" />
											Insert Var
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											onClick={() =>
												insertVariable('responseBody', '{{ db.items }}')
											}
										>
											All Items (DB)
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() =>
												insertVariable('responseBody', '{{ state.token }}')
											}
										>
											State Token
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() =>
												insertVariable('responseBody', '{{ input.body.name }}')
											}
										>
											Echo Name
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="h-6 text-xs"
										>
											Examples
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											onClick={() => setResponseExample('successUser')}
										>
											Success + state user
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setResponseExample('usersTable')}
										>
											Return users table
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setResponseExample('echoName')}
										>
											Echo name from body
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setResponseExample('cartCount')}
										>
											Cart count
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setResponseExample('paramIdResponse')}
										>
											Return param id
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
							<Textarea
								{...form.register('responseBody')}
								className="font-mono text-xs min-h-52"
								rows={12}
							/>
							{form.formState.errors.responseBody && (
								<p className="text-destructive text-xs">
									{form.formState.errors.responseBody.message}
								</p>
							)}
						</div>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={handleClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={isMutating}>
							{isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{isEditMode ? 'Save Changes' : 'Create Rule'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// Keep backward compatible export
export { TransitionDialog as CreateTransitionDialog };
