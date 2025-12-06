
'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Braces, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import useSWRMutation from 'swr/mutation';

// --- Schema ---
const transitionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  path: z.string().min(1, "Path is required").startsWith("/", "Path must start with /"),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]),
  responseStatus: z.coerce.number().min(100).max(599),
  responseBody: z.string().min(1, "Response body is required"),
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
    body: JSON.stringify(arg)
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
    body: JSON.stringify(arg)
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
  onOpenChange: controlledOnOpenChange
}: TransitionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [useConditionBuilder, setUseConditionBuilder] = useState(true);
  
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
  const [conditionsList, setConditionsList] = useState<{field: string, type: string, value: string}[]>([]);
  const [effectsList, setEffectsList] = useState<any[]>([]);

  const form = useForm<TransitionFormValues>({
    resolver: zodResolver(transitionSchema),
    defaultValues: {
      name: '',
      description: '',
      path: '',
      method: 'POST',
      responseStatus: 200,
      responseBody: '{"success": true}',
      conditions: '{}'
    }
  });

  // Populate form when editing
  useEffect(() => {
    if (open && isEditMode && transition) {
      form.reset({
        name: transition.name || '',
        description: transition.description || '',
        path: transition.path,
        method: transition.method as "GET" | "POST" | "PUT" | "DELETE",
        responseStatus: transition.response?.status || 200,
        responseBody: typeof transition.response?.body === 'object' 
          ? JSON.stringify(transition.response.body, null, 2)
          : (transition.response?.body || '{"success": true}'),
        conditions: JSON.stringify(transition.conditions || {})
      });
      
      // Populate conditions builder
      if (Array.isArray(transition.conditions)) {
        setConditionsList(transition.conditions.map((c: any) => ({
          field: c.field || '',
          type: c.type || 'eq',
          value: c.value || ''
        })));
      } else {
        setConditionsList([]);
      }
      
      // Populate effects
      if (Array.isArray(transition.effects)) {
        setEffectsList(transition.effects.map((e: any) => {
          if (e.type === 'state.set') {
            return { 
              type: 'state.set', 
              raw: typeof e.raw === 'object' ? JSON.stringify(e.raw) : (e.raw || '{}') 
            };
          }
          if (e.type === 'db.push') {
            return { 
              type: 'db.push', 
              table: e.table || '', 
              value: typeof e.value === 'object' ? JSON.stringify(e.value) : (e.value || '') 
            };
          }
          return e;
        }));
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
      }
    }
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
      }
    }
  );

  const isMutating = isCreating || isUpdating;

  const handleClose = () => {
    setOpen(false);
    form.reset();
    setConditionsList([]);
    setEffectsList([]);
  };

  // --- Effects Helpers ---
  const addEffect = (type: string) => {
    if (type === 'state.set') {
      setEffectsList([...effectsList, { type: 'state.set', raw: '{"key": "value"}' }]);
    } else if (type === 'db.push') {
      setEffectsList([...effectsList, { type: 'db.push', table: 'table_name', value: '{{input.body}}' }]);
    }
  };

  const removeEffect = (index: number) => {
    setEffectsList(effectsList.filter((_, i) => i !== index));
  };

  const updateEffect = (index: number, field: string, value: any) => {
    const newEffects = [...effectsList];
    newEffects[index] = { ...newEffects[index], [field]: value };
    setEffectsList(newEffects);
  };

  // --- Conditions Helpers ---
  const addCondition = () => {
    setConditionsList([...conditionsList, { field: '', type: 'eq', value: '' }]);
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
  const insertVariable = (field: 'responseBody' | 'conditions', variable: string) => {
    if (field === 'conditions' && useConditionBuilder) return;
    const current = form.getValues(field as any);
    form.setValue(field as any, (current || '') + variable);
  };

  const onSubmit = async (data: TransitionFormValues) => {
    // 1. Process Conditions
    let finalConditions: any;
    if (useConditionBuilder) {
      finalConditions = conditionsList.map(c => ({
        type: c.type,
        field: c.field,
        value: c.value
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
    let finalResponseBody;
    try {
      finalResponseBody = JSON.parse(data.responseBody);
    } catch {
      finalResponseBody = data.responseBody;
    }

    // 3. Process Effects
    const finalEffects = effectsList.map(e => {
      if (e.type === 'state.set' && typeof e.raw === 'string' && e.raw.trim().startsWith('{')) {
        try { return { ...e, raw: JSON.parse(e.raw) }; } catch { return e; }
      }
      if (e.type === 'db.push' && typeof e.value === 'string' && e.value.trim().startsWith('{')) {
        try { return { ...e, value: JSON.parse(e.value) }; } catch { return e; }
      }
      return e;
    });

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
        body: finalResponseBody
      }
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
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Transition' : 'Create Transition'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update this transition rule.' : 'Define a new rule for this scenario.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          {/* Basics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register('name')} placeholder="e.g. Add Item" />
              {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Controller 
                control={form.control}
                name="method"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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

          {/* Description */}
          <div className="space-y-2">
            <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input {...form.register('description')} placeholder="Adds an item to the shopping cart" />
          </div>
          
          <div className="space-y-2">
            <Label>Path</Label>
            <Input {...form.register('path')} placeholder="/cart/items" />
            {form.formState.errors.path && <p className="text-destructive text-xs">{form.formState.errors.path.message}</p>}
          </div>

          {/* Conditions Section */}
          <div className="space-y-2">
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
                  {useConditionBuilder ? 'Switch to JSON' : 'Switch to Builder'}
                </Button>
              </Label>
              {!useConditionBuilder && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs">
                      <Braces className="h-3 w-3" />
                      Insert Var
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => insertVariable('conditions', '{{ input.body.id }}')}>Body ID</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertVariable('conditions', '{{ input.query.search }}')}>Query Param</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertVariable('conditions', '{{ state.isLoggedIn }}')}>State Var</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertVariable('conditions', '{{ db.users.length }}')}>DB Count</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {useConditionBuilder ? (
              <div className="space-y-2 border rounded-md p-3 bg-muted/10">
                {conditionsList.map((cond, idx) => (
                  <div key={`cond-${idx}`} className="flex gap-2 items-center">
                    <Input 
                      placeholder="Field (e.g. input.body.id)" 
                      className="h-7 text-xs font-mono flex-1"
                      value={cond.field}
                      onChange={e => updateCondition(idx, 'field', e.target.value)}
                    />
                    <Select value={cond.type} onValueChange={v => updateCondition(idx, 'type', v)}>
                      <SelectTrigger className="h-7 w-[80px] text-xs"><SelectValue /></SelectTrigger>
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
                        className="h-7 text-xs flex-1"
                        value={cond.value}
                        onChange={e => updateCondition(idx, 'value', e.target.value)}
                      />
                    )}
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeCondition(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="w-full text-xs h-7 border-dashed" onClick={addCondition}>
                  <Plus className="h-3 w-3 mr-1" /> Add Rule
                </Button>
              </div>
            ) : (
              <>
                <Textarea 
                  {...form.register('conditions')}
                  className="font-mono text-xs"
                  rows={3}
                />
                {form.formState.errors.conditions && <p className="text-destructive text-xs">{String(form.formState.errors.conditions.message)}</p>}
              </>
            )}
          </div>

          {/* Effects Builder */}
          <div className="space-y-2 border rounded-md p-3 bg-muted/10">
            <div className="flex items-center justify-between">
              <Label>Effects</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="h-6 text-xs" onClick={() => addEffect('state.set')}>+ Set State</Button>
                <Button type="button" variant="outline" size="sm" className="h-6 text-xs" onClick={() => addEffect('db.push')}>+ DB Push</Button>
              </div>
            </div>
            
            <div className="space-y-2 mt-2">
              {effectsList.map((effect, idx) => (
                <div key={`effect-${idx}`} className="flex items-start gap-2 bg-background p-2 rounded border">
                  <div className="flex-1 grid gap-2">
                    <span className="text-xs font-bold uppercase">{effect.type}</span>
                    {effect.type === 'state.set' && (
                      <Input 
                        placeholder='{"key": "val"}' 
                        className="h-7 text-xs font-mono"
                        value={typeof effect.raw === 'object' ? JSON.stringify(effect.raw) : effect.raw}
                        onChange={e => updateEffect(idx, 'raw', e.target.value)}
                      />
                    )}
                    {effect.type === 'db.push' && (
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Table Name" 
                          className="h-7 text-xs w-1/3"
                          value={effect.table}
                          onChange={e => updateEffect(idx, 'table', e.target.value)}
                        />
                        <Input 
                          placeholder="Value (JSON or {{...}})" 
                          className="h-7 text-xs font-mono flex-1"
                          value={typeof effect.value === 'object' ? JSON.stringify(effect.value) : effect.value}
                          onChange={e => updateEffect(idx, 'value', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeEffect(idx)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {effectsList.length === 0 && <p className="text-xs text-muted-foreground italic">No effects defined.</p>}
            </div>
          </div>

          {/* Response */}
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-1 space-y-2">
              <Label>Status</Label>
              <Input 
                type="number" 
                {...form.register('responseStatus')}
              />
              {form.formState.errors.responseStatus && <p className="text-destructive text-xs">{form.formState.errors.responseStatus.message}</p>}
            </div>
            <div className="col-span-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label>Response Body (JSON)</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs">
                      <Braces className="h-3 w-3" />
                      Insert Var
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => insertVariable('responseBody', '{{ db.items }}')}>All Items (DB)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertVariable('responseBody', '{{ state.token }}')}>State Token</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertVariable('responseBody', '{{ input.body.name }}')}>Echo Name</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Textarea 
                {...form.register('responseBody')}
                className="font-mono text-xs"
                rows={3}
              />
              {form.formState.errors.responseBody && <p className="text-destructive text-xs">{form.formState.errors.responseBody.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
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
