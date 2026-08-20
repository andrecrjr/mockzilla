'use client';

import { ArrowLeft, BookOpen, Play, Plus, RotateCcw, Route, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { swrFetcher } from '@/lib/swr-fetcher';

type Scalar = string | number | boolean | null;
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
type Journey = { id: string; name: string; slug: string; description: string | null; definition: { lifecycles: Array<{ key: string; name: string; states: string[]; initialState: string }>; fields: Array<{ key: string; type: string; initialValue: Scalar }> }; runtime: { state: Record<string, string>; fields: Record<string, Scalar> } };
type Action = { id: string; name: string; method: HttpMethod; path: string; requires: Record<string, string>; transitions: Record<string, string>; setFields: Record<string, string>; statusCode: number; headers: Record<string, string>; body: unknown; bodyType: 'json' | 'text' };

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const asMap = (value: string): Record<string, string> => { try { const parsed: unknown = JSON.parse(value); return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string')) : {}; } catch { return {}; } };
const displayMap = (value: Record<string, string>) => Object.entries(value).length ? Object.entries(value).map(([key, item]) => `${key}: ${item}`).join(' · ') : 'None';
const formatBody = (body: unknown) => typeof body === 'string' ? body : JSON.stringify(body, null, 2);

export default function JourneyDetailPage() {
	const params = useParams<{ slug: string }>();
	const slug = params.slug;
	const { data: journey, mutate: refreshJourney } = useSWR<Journey>(`/api/journeys/${slug}`, swrFetcher);
	const { data: actions = [], mutate: refreshActions } = useSWR<Action[]>(`/api/journeys/${slug}/actions`, swrFetcher);
	const [requestMethod, setRequestMethod] = useState<HttpMethod>('POST');
	const [requestPath, setRequestPath] = useState('/');
	const [requestBody, setRequestBody] = useState('{}');
	const [result, setResult] = useState('Choose an Action, then run a request to inspect its rendered response.');
	const [actionName, setActionName] = useState('');
	const [actionMethod, setActionMethod] = useState<HttpMethod>('POST');
	const [actionPath, setActionPath] = useState('/');
	const [requires, setRequires] = useState('{}');
	const [transitions, setTransitions] = useState('{}');
	const [setFields, setSetFields] = useState('{}');
	const [responseHeaders, setResponseHeaders] = useState('{}');
	const [responseBody, setResponseBody] = useState('{}');
	const [responseBodyType, setResponseBodyType] = useState<'json' | 'text'>('json');

	if (!journey) return <main className="container mx-auto max-w-7xl py-8 text-muted-foreground">Loading Journey…</main>;

	const endpoint = `/api/journeys/${slug}/run${requestPath === '/' ? '' : requestPath}`;
	const selectActionForRun = (action: Action) => { setRequestMethod(action.method); setRequestPath(action.path); setResult(`Ready to run ${action.name}. Replace any :parameters in the path before sending the request.`); };
	const addAction = async () => {
		let body: unknown = responseBody;
		if (responseBodyType === 'json') {
			try { body = JSON.parse(responseBody); } catch { toast.error('Response body must be valid JSON when body type is JSON'); return; }
		}
		const response = await fetch(`/api/journeys/${slug}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: actionName, method: actionMethod, path: actionPath, requires: asMap(requires), transitions: asMap(transitions), setFields: asMap(setFields), statusCode: 200, headers: asMap(responseHeaders), body, bodyType: responseBodyType }) });
		if (!response.ok) { toast.error((await response.json()).error ?? 'Could not add Action'); return; }
		setActionName(''); setResponseHeaders('{}'); setResponseBody('{}'); setResponseBodyType('json'); await refreshActions(); toast.success('Action added');
	};
	const run = async () => {
		let parsedBody: unknown = requestBody;
		try { parsedBody = JSON.parse(requestBody); } catch { /* Text request bodies are valid. */ }
		const beforeRuntime = journey.runtime;
		const response = await fetch(endpoint, { method: requestMethod, headers: { 'Content-Type': 'application/json' }, body: requestMethod === 'GET' || requestMethod === 'HEAD' ? undefined : JSON.stringify(parsedBody) });
		const payload: unknown = await response.json().catch(async () => await response.text());
		const after = await refreshJourney();
		setResult(JSON.stringify({ status: response.status, response: payload, runtimeBefore: beforeRuntime, runtimeAfter: after?.runtime ?? beforeRuntime }, null, 2));
		if (response.status === 409) toast.error('No Action is available for the current Journey state.');
	};
	const reset = async () => { const response = await fetch(`/api/journeys/${slug}/reset`, { method: 'POST' }); if (!response.ok) { toast.error('Could not reset the Journey runtime'); return; } await refreshJourney(); setResult('Runtime reset to every Lifecycle and Field initial value.'); toast.success('Runtime reset'); };

	return <main className="container mx-auto max-w-7xl space-y-6 py-6 sm:py-8">
		<div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between"><div className="space-y-3"><Link href="/app/journeys" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> All Journeys</Link><div><div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant="secondary">Stateful API story</Badge><Badge variant="outline">{actions.length} Actions</Badge></div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{journey.name}</h1><p className="mt-2 max-w-3xl text-muted-foreground">{journey.description || 'No description yet. Describe the product flow this Journey simulates.'}</p></div></div><div className="flex flex-wrap gap-2"><Link href="/docs/guides/creating-journeys"><Button variant="outline"><BookOpen /> Journey guide</Button></Link><Button variant="outline" onClick={reset}><RotateCcw /> Reset runtime</Button></div></div>

		<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
			<div className="space-y-6">
				<Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Route className="size-5 text-primary" /> Runtime now</CardTitle><CardDescription>State updates before an Action response is rendered. Reset restores the declared initial values.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2"><section><h2 className="mb-3 text-sm font-semibold">Lifecycle tracks</h2><div className="space-y-3">{journey.definition.lifecycles.map((lifecycle) => <div key={lifecycle.key} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><div><p className="font-medium">{lifecycle.name}</p><p className="text-xs text-muted-foreground">{lifecycle.key} · initial: {lifecycle.initialState}</p></div><Badge>{journey.runtime.state[lifecycle.key]}</Badge></div><div className="mt-3 flex flex-wrap gap-1.5">{lifecycle.states.map((state) => <Badge key={state} variant={state === journey.runtime.state[lifecycle.key] ? 'default' : 'outline'}>{state}</Badge>)}</div></div>)}</div></section><section><h2 className="mb-3 text-sm font-semibold">Carried Fields</h2>{journey.definition.fields.length ? <div className="space-y-2">{journey.definition.fields.map((field) => <div key={field.key} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between gap-3"><code>{field.key}</code><Badge variant="outline">{field.type}</Badge></div><p className="mt-2 text-muted-foreground">Current: <span className="font-medium text-foreground">{String(journey.runtime.fields[field.key] ?? 'null')}</span></p><p className="text-xs text-muted-foreground">Initial: {String(field.initialValue)}</p></div>)}</div> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No Fields declared. Add one only for a small scalar value that must carry through the story.</p>}</section></CardContent></Card>
				<Card><CardHeader><CardTitle>Actions</CardTitle><CardDescription>Actions match request method, path, and optional current Lifecycle states.</CardDescription></CardHeader><CardContent className="space-y-3">{actions.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No Actions yet. Add the first request that moves this Journey forward.</div> : actions.map((action) => <div key={action.id} className="rounded-lg border p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><div className="flex flex-wrap items-center gap-2"><Badge>{action.method}</Badge><code className="text-sm font-medium">{action.path}</code></div><h3 className="mt-2 font-semibold">{action.name}</h3></div><Button size="sm" variant="outline" onClick={() => selectActionForRun(action)}><Play /> Run this Action</Button></div><dl className="mt-4 grid gap-3 text-sm md:grid-cols-3"><div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Requires</dt><dd className="mt-1">{displayMap(action.requires)}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Transitions</dt><dd className="mt-1">{displayMap(action.transitions)}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Field writes</dt><dd className="mt-1">{displayMap(action.setFields)}</dd></div></dl><div className="mt-4 rounded-md bg-muted/60 p-3 text-xs"><span className="font-medium">{action.statusCode} {action.bodyType}</span><pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap text-muted-foreground">{formatBody(action.body)}</pre></div></div>)}</CardContent></Card>
			</div>
			<div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
				<Card><CardHeader><CardTitle>Request runner</CardTitle><CardDescription>Run the same endpoint your client will call. A rejected request includes the current runtime and candidate requirements.</CardDescription></CardHeader><CardContent><Tabs defaultValue="request"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="request">Request</TabsTrigger><TabsTrigger value="result">Last result</TabsTrigger></TabsList><TabsContent value="request" className="space-y-4 pt-3"><div><Label>Endpoint</Label><code className="mt-1 block overflow-x-auto rounded-md bg-muted p-2 text-xs">{endpoint}</code></div><div className="grid grid-cols-[120px_1fr] gap-2"><Select value={requestMethod} onValueChange={(value) => setRequestMethod(value as HttpMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{methods.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Input value={requestPath} onChange={(event) => setRequestPath(event.target.value)} placeholder="/orders/:id/pay" /></div><div><Label htmlFor="request-body">Request body</Label><Textarea id="request-body" value={requestBody} onChange={(event) => setRequestBody(event.target.value)} className="mt-1 min-h-32 font-mono text-xs" /></div><Button className="w-full" onClick={run}><Play /> Run request</Button></TabsContent><TabsContent value="result" className="pt-3"><pre className="max-h-[28rem] overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">{result}</pre></TabsContent></Tabs></CardContent></Card>
				<Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="size-5 text-primary" /> Add an Action</CardTitle><CardDescription>Use declared Lifecycle and Field keys. Handlebars can reference <code>{'{{request}}'}</code>, <code>{'{{params}}'}</code>, <code>{'{{state}}'}</code>, <code>{'{{fields}}'}</code>, and <code>{'{{faker}}'}</code>.</CardDescription></CardHeader><CardContent className="space-y-3"><Input value={actionName} onChange={(event) => setActionName(event.target.value)} placeholder="Action name" /><div className="grid grid-cols-[120px_1fr] gap-2"><Select value={actionMethod} onValueChange={(value) => setActionMethod(value as HttpMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{methods.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Input value={actionPath} onChange={(event) => setActionPath(event.target.value)} placeholder="/orders/:id/pay" /></div><Textarea value={requires} onChange={(event) => setRequires(event.target.value)} className="min-h-20 font-mono text-xs" placeholder={'Requires JSON, e.g. {"auth":"signedIn"}'} /><Textarea value={transitions} onChange={(event) => setTransitions(event.target.value)} className="min-h-20 font-mono text-xs" placeholder={'Transitions JSON, e.g. {"checkout":"paid"}'} /><Textarea value={setFields} onChange={(event) => setSetFields(event.target.value)} className="min-h-20 font-mono text-xs" placeholder={'Field writes JSON, e.g. {"orderId":"{{params.id}}"}'} /><Select value={responseBodyType} onValueChange={(value) => setResponseBodyType(value as 'json' | 'text')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="json">JSON response</SelectItem><SelectItem value="text">Text response</SelectItem></SelectContent></Select><Textarea value={responseHeaders} onChange={(event) => setResponseHeaders(event.target.value)} className="min-h-20 font-mono text-xs" placeholder={'Response headers JSON, e.g. {"content-type":"text/plain"}'} /><Textarea value={responseBody} onChange={(event) => setResponseBody(event.target.value)} className="min-h-28 font-mono text-xs" placeholder={responseBodyType === 'json' ? 'Response JSON / Handlebars template' : 'Text response / Handlebars template'} /><Button className="w-full" disabled={!actionName || !actionPath} onClick={addAction}><Sparkles /> Add Action</Button></CardContent></Card>
			</div>
		</div>
	</main>;
}
