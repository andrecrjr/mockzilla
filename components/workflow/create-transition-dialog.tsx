'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Braces, Loader2, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import useSWRMutation from 'swr/mutation';
import * as z from 'zod';
import { FieldTooltip } from '@/components/folder-tooltips';
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
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/components/ui/tabs';
import type { Condition, Effect } from '@/lib/engine/match';
import type { Transition } from '@/lib/types';
import { Textarea } from '../ui/textarea';
import { TooltipProvider } from '../ui/tooltip';
import { type EffectItem, EffectsEditor } from './effects-editor';
import { SmartHandlebarsEditor } from './smart-handlebars-editor';

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
	conditions: z.string().optional(), // This is for the raw JSON string input
});

type TransitionFormValues = z.infer<typeof transitionSchema>;

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
	// Context for autocomplete
	stateData?: {
		state: Record<string, unknown>;
		tables: Record<string, unknown[]>;
	};
}

// SWR Mutation fetchers
async function createTransition(
	url: string,
	{ arg }: { arg: Omit<Transition, 'id' | 'createdAt' | 'updatedAt'> },
) {
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

async function updateTransition(
	url: string,
	{ arg }: { arg: Partial<Transition> },
) {
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
	stateData,
}: TransitionDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const [useConditionBuilder, setUseConditionBuilder] = useState(true);
	const [useEffectsBuilder, setUseEffectsBuilder] = useState(true);
	const [activeTab, setActiveTab] = useState('trigger');

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
			conditions: '[]',
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
				responseStatus: transition.response.status,
				responseBody:
					typeof transition.response.body === 'object'
						? JSON.stringify(transition.response.body, null, 2)
						: String(transition.response.body || '{"success": true}'),
				conditions: JSON.stringify(transition.conditions || []),
			});

			// Populate conditions builder
			if (Array.isArray(transition.conditions)) {
				setConditionsList(
					(transition.conditions as Condition[]).map((c) => ({
						field: c.field || '',
						type: c.type || 'eq',
						value: String(c.value || ''),
					})),
				);
			} else {
				setConditionsList([]);
			}

			// Populate effects
			if (Array.isArray(transition.effects)) {
				setEffectsList(transition.effects as EffectItem[]);
			} else {
				setEffectsList([]);
			}
		}
	}, [open, isEditMode, transition, form]);

	// Reset form when closing
	useEffect(() => {
		if (!open && !isEditMode) {
			form.reset();
			setConditionsList([]);
			setEffectsList([]);
			setActiveTab('trigger');
		}
	}, [open, isEditMode, form]);

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
	};

	// --- Conditions Helpers ---
	const addCondition = () => {
		setConditionsList([
			...conditionsList,
			{ field: '', type: 'eq', value: '' },
		]);
	};

	const updateCondition = (
		index: number,
		key: keyof (typeof conditionsList)[0],
		val: string,
	) => {
		const newConditions = [...conditionsList];
		newConditions[index] = { ...newConditions[index], [key]: val };
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
		const current = form.getValues(field);
		form.setValue(field, (current || '') + variable);
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
		let finalConditions: Condition[];
		if (useConditionBuilder) {
			finalConditions = conditionsList.map((c) => ({
				type: c.type as Condition['type'],
				field: c.field,
				value: c.value,
			}));
		} else {
			try {
				finalConditions = JSON.parse(data.conditions || '[]');
			} catch {
				form.setError('conditions', { message: 'Invalid JSON conditions' });
				return;
			}
		}

		// 2. Process Response Body
		let finalResponseBody: unknown;
		try {
			finalResponseBody = JSON.parse(data.responseBody);
		} catch {
			finalResponseBody = data.responseBody;
		}

		const payload = {
			scenarioId,
			name: data.name || '',
			description: data.description || null,
			path: data.path,
			method: data.method,
			conditions: finalConditions,
			effects: effectsList,
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

	return (
		<TooltipProvider>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>{trigger}</DialogTrigger>
				<DialogContent className="sm:max-w-[90vw] lg:max-w-[1200px] max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
					<DialogHeader className="p-6 pb-2">
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
						className="flex-1 flex flex-col min-h-0 overflow-hidden"
					>
						<Tabs
							value={activeTab}
							onValueChange={setActiveTab}
							className="flex-1 flex flex-col overflow-hidden"
						>
							<div className="px-6 border-b">
								<TabsList className="h-12 w-full justify-start bg-transparent p-0 gap-6">
									<TabsTrigger
										value="trigger"
										className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none"
									>
										1. Trigger
									</TabsTrigger>
									<TabsTrigger
										value="logic"
										className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none"
									>
										2. Logic (Effects)
									</TabsTrigger>
									<TabsTrigger
										value="response"
										className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none"
									>
										3. Response
									</TabsTrigger>
								</TabsList>
							</div>

							<div className="flex-1 overflow-y-auto p-6">
								<TabsContent value="trigger" className="m-0 space-y-6">
									<div className="space-y-1">
										<h4 className="text-sm font-medium">1. Trigger Configuration</h4>
										<p className="text-xs text-muted-foreground">
											Define <strong>when</strong> this rule should run. Mockzilla matches incoming requests based on the HTTP method, path, and optional logic-based conditions.
											<a href="/docs/reference/workflow-syntax#1-conditions" target="_blank" className="ml-1 text-primary hover:underline">Learn more about triggers &rarr;</a>
										</p>
									</div>
									{/* Basics */}
									<div className="grid md:grid-cols-2 gap-6">
										<div className="space-y-3">
											<Label className="flex items-center gap-2">
												Name
												<FieldTooltip
													label="Name"
													description="A unique name for this transition."
													example="Register User"
												/>
											</Label>
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
										<div className="space-y-3">
											<Label className="flex items-center gap-2">
												Method
												<FieldTooltip
													label="Method"
													description="The HTTP method this transition responds to."
													example="POST"
												/>
											</Label>
											<Controller
												control={form.control}
												name="method"
												render={({ field }) => (
													<Select
														onValueChange={field.onChange}
														value={field.value}
													>
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

									<div className="grid md:grid-cols-3 gap-6">
										<div className="md:col-span-2 space-y-3">
											<Label className="flex items-center gap-2">
												Description{' '}
												<span className="text-muted-foreground text-xs">
													(optional)
												</span>
												<FieldTooltip
													label="Description"
													description="Internal documentation for what this transition does."
												/>
											</Label>
											<Input
												{...form.register('description')}
												placeholder="Adds an item to the shopping cart"
												className="h-9"
											/>
										</div>
										<div className="space-y-3">
											<Label className="flex items-center gap-2">
												Path
												<FieldTooltip
													label="Path"
													description="The URL pattern to match. Supports exact and parameterized paths."
													example="/users/:id"
													docsLink="/docs/reference/workflow-syntax"
												/>
											</Label>
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

									<div className="space-y-4">
										<div className="flex items-center justify-between">
											<Label className="flex items-center gap-2">
												Conditions (Optional)
												<FieldTooltip
													label="Conditions"
													description="Rules that must match for this transition to fire. If empty, it always matches."
													example='[{"type":"eq", "field":"state.isLoggedIn", "value":true}]'
													docsLink="/docs/reference/workflow-syntax#1-conditions"
												/>
											</Label>
											<div className="flex items-center gap-2">
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="h-7 text-xs text-muted-foreground"
													onClick={() =>
														setUseConditionBuilder(!useConditionBuilder)
													}
												>
													{useConditionBuilder
														? 'Switch to JSON'
														: 'Switch to Builder'}
												</Button>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															type="button"
															variant="outline"
															size="sm"
															className="h-7 text-xs"
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
															onClick={() =>
																insertConditionExample('headerAuth')
															}
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
											<div className="space-y-3 border rounded-lg p-4 bg-muted/20">
												{conditionsList.length === 0 ? (
													<p className="text-xs text-center text-muted-foreground py-4">
														No conditions defined. This transition will always
														fire when the path matches.
													</p>
												) : (
													conditionsList.map((cond, idx) => (
														<div
															key={`cond-${idx}`}
															className="flex items-center gap-3"
														>
															<Input
																placeholder="Field (e.g. input.body.id)"
																className="flex-1 h-9 text-xs font-mono"
																value={cond.field}
																onChange={(e) =>
																	updateCondition(idx, 'field', e.target.value)
																}
															/>
															<Select
																value={cond.type}
																onValueChange={(v) =>
																	updateCondition(idx, 'type', v)
																}
															>
																<SelectTrigger className="w-32 h-9 text-xs">
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="eq">Equals</SelectItem>
																	<SelectItem value="neq">Not Equals</SelectItem>
																	<SelectItem value="gt">Greater Than</SelectItem>
																	<SelectItem value="lt">Less Than</SelectItem>
																	<SelectItem value="exists">Exists</SelectItem>
																	<SelectItem value="contains">
																		Contains
																	</SelectItem>
																</SelectContent>
															</Select>
															{cond.type !== 'exists' && (
																<Input
																	placeholder="Value"
																	className="flex-1 h-9 text-xs"
																	value={cond.value}
																	onChange={(e) =>
																		updateCondition(
																			idx,
																			'value',
																			e.target.value,
																		)
																	}
																/>
															)}
															<Button
																type="button"
																variant="ghost"
																size="icon"
																className="h-9 w-9 text-muted-foreground hover:text-destructive"
																onClick={() => removeCondition(idx)}
															>
																<X className="h-4 w-4" />
															</Button>
														</div>
													))
												)}
												<Button
													type="button"
													variant="outline"
													size="sm"
													className="w-full text-xs h-9 border-dashed"
													onClick={addCondition}
												>
													<Plus className="h-3.5 w-3.5 mr-2" /> Add Rule
												</Button>
											</div>
										) : (
											<div className="space-y-2">
												<Controller
													control={form.control}
													name="conditions"
													render={({ field }) => (
														<SmartHandlebarsEditor
															value={field.value}
															onChange={field.onChange}
															stateData={stateData}
															minLines={10}
															placeholder='[{"type": "eq", "field": "state.isLoggedIn", "value": true}]'
														/>
													)}
												/>
												{form.formState.errors.conditions && (
													<p className="text-destructive text-xs">
														{form.formState.errors.conditions.message}
													</p>
												)}
											</div>
										)}
									</div>
								</TabsContent>

								<TabsContent value="logic" className="m-0 space-y-6">
									<div className="space-y-1">
										<h4 className="text-sm font-medium">2. Logic & Effects</h4>
										<p className="text-xs text-muted-foreground">
											Define <strong>what happens</strong> when the trigger fires. Use effects to update persistent state variables or perform CRUD operations on the mini-database tables.
											<a href="/docs/reference/workflow-syntax#2-effects" target="_blank" className="ml-1 text-primary hover:underline">Learn more about effects &rarr;</a>
										</p>
									</div>
									<div className="space-y-4">
										<div className="flex items-center justify-between">
											<div>
												<Label className="text-sm font-semibold">
													Active Effects
												</Label>
											</div>
											<div className="flex items-center gap-2">
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="h-7 text-xs text-muted-foreground"
													onClick={() =>
														setUseEffectsBuilder(!useEffectsBuilder)
													}
												>
													{useEffectsBuilder
														? 'Switch to JSON'
														: 'Switch to Builder'}
												</Button>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															type="button"
															variant="outline"
															size="sm"
															className="h-7 text-xs"
														>
															Examples
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
															onClick={() =>
																addEffectExample('removeCartBySku')
															}
														>
															Remove cart by sku
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</div>

										{useEffectsBuilder ? (
											<EffectsEditor
												effects={effectsList}
												onChange={setEffectsList}
												stateData={stateData}
											/>
										) : (
											<SmartHandlebarsEditor
												value={effectsList}
												onChange={(val) => {
													if (Array.isArray(val)) {
														setEffectsList(val as EffectItem[]);
													}
												}}
												stateData={stateData}
												minLines={20}
											/>
										)}
									</div>
								</TabsContent>

								<TabsContent value="response" className="m-0 space-y-6">
									<div className="space-y-1">
										<h4 className="text-sm font-medium">3. Client Response</h4>
										<p className="text-xs text-muted-foreground">
											Define <strong>what is returned</strong> to the client. You can use Handlebars logic and <code>{"{{ interpolation }}"}</code> to inject data from the scenario state, database, or original request.
											<a href="/docs/reference/dynamic-interpolation" target="_blank" className="ml-1 text-primary hover:underline">Learn more about dynamic responses &rarr;</a>
										</p>
									</div>
									<div className="grid md:grid-cols-4 gap-6">
										<div className="space-y-3">
											<Label className="flex items-center gap-2">
												Status Code
												<FieldTooltip
													label="Status"
													description="The HTTP status code to return."
													example="200"
												/>
											</Label>
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
										<div className="md:col-span-3 space-y-3">
											<div className="flex items-center justify-between">
												<Label className="flex items-center gap-2">
													Response Body (JSON)
													<FieldTooltip
														label="Response Body"
														description="The JSON or text to return. Use {{ interpolation }} to inject dynamic data."
														example='{ "user": "{{ state.username }}" }'
													/>
												</Label>
												<div className="flex items-center gap-2">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																type="button"
																variant="ghost"
																size="sm"
																className="h-7 gap-1 text-xs"
															>
																<Braces className="h-3.5 w-3.5" />
																Insert Var
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem
																onClick={() =>
																	insertVariable(
																		'responseBody',
																		'{{ db.items }}',
																	)
																}
															>
																All Items (DB)
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() =>
																	insertVariable(
																		'responseBody',
																		'{{ state.token }}',
																	)
																}
															>
																State Token
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() =>
																	insertVariable(
																		'responseBody',
																		'{{ input.body.name }}',
																	)
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
																className="h-7 text-xs"
															>
																Examples
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem
																onClick={() =>
																	setResponseExample('successUser')
																}
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
																onClick={() =>
																	setResponseExample('paramIdResponse')
																}
															>
																Return param id
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</div>
											<Controller
												control={form.control}
												name="responseBody"
												render={({ field }) => (
													<SmartHandlebarsEditor
														value={field.value}
														onChange={field.onChange}
														stateData={stateData}
														minLines={12}
													/>
												)}
											/>
											{form.formState.errors.responseBody && (
												<p className="text-destructive text-xs">
													{form.formState.errors.responseBody.message}
												</p>
											)}
										</div>
									</div>
								</TabsContent>
							</div>
						</Tabs>

						<div className="px-6 py-4 border-t bg-muted/10 flex items-center justify-between shrink-0">
							<div className="flex items-center gap-2">
								{activeTab === 'logic' && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => setActiveTab('trigger')}
									>
										Back to Trigger
									</Button>
								)}
								{activeTab === 'response' && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => setActiveTab('logic')}
									>
										Back to Logic
									</Button>
								)}
							</div>
							<div className="flex items-center gap-3">
								<Button type="button" variant="outline" onClick={handleClose}>
									Cancel
								</Button>
								{activeTab !== 'response' ? (
									<Button
										type="button"
										onClick={() => {
											if (activeTab === 'trigger') setActiveTab('logic');
											else if (activeTab === 'logic') setActiveTab('response');
										}}
									>
										Next Step
									</Button>
								) : (
									<Button type="submit" disabled={isMutating}>
										{isMutating && (
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										)}
										{isEditMode ? 'Save Changes' : 'Create Rule'}
									</Button>
								)}
							</div>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</TooltipProvider>
	);
}

// Keep backward compatible export
export { TransitionDialog as CreateTransitionDialog, Dialog };
