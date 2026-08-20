'use client';

import { Plus, Route } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { swrFetcher } from '@/lib/swr-fetcher';

type Journey = { id: string; name: string; slug: string; description: string | null };

export default function JourneysPage() {
	const router = useRouter();
	const { data: journeys = [], mutate } = useSWR<Journey[]>('/api/journeys', swrFetcher);
	const [open, setOpen] = useState(false);
	const [name, setName] = useState('');
	const [slug, setSlug] = useState('');
	const [description, setDescription] = useState('');
	const create = async () => {
		const response = await fetch('/api/journeys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, slug, description: description || undefined, lifecycles: [{ key: 'flow', name: 'Flow', states: ['start', 'complete'], initialState: 'start' }], fields: [] }) });
		if (!response.ok) { toast.error((await response.json()).error ?? 'Could not create Journey'); return; }
		const journey: Journey = await response.json();
		await mutate(); setOpen(false); router.push(`/app/journeys/${journey.slug}`);
	};
	return <main className="container mx-auto max-w-7xl py-8">
		<div className="mb-8 flex items-start justify-between"><div><h1 className="text-4xl font-bold tracking-tight">Journeys</h1><p className="mt-2 text-muted-foreground">Stateful API stories. Use folders for ordinary mocks.</p></div><Button onClick={() => setOpen((value) => !value)}><Plus /> New Journey</Button></div>
		{open && <Card className="mb-6"><CardHeader><CardTitle>Create a Journey</CardTitle></CardHeader><CardContent className="grid gap-4"><div><Label>Name</Label><Input value={name} onChange={(event) => { setName(event.target.value); setSlug(event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} placeholder="Checkout simulation" /></div><div><Label>Slug</Label><Input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="checkout" /></div><div><Label>Description</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} /></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!name || !slug} onClick={create}>Create Journey</Button></div></CardContent></Card>}
		{journeys.length === 0 ? <Card><CardContent className="py-16 text-center text-muted-foreground">No Journeys yet. Create one when an earlier request changes the next response.</CardContent></Card> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{journeys.map((journey) => <Link key={journey.id} href={`/app/journeys/${journey.slug}`}><Card className="h-full transition-colors hover:bg-accent/40"><CardHeader><Route className="text-primary" /><CardTitle>{journey.name}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{journey.description || 'No description'}</p><code className="mt-4 block text-xs">{journey.slug}</code></CardContent></Card></Link>)}</div>}
	</main>;
}
