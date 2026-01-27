'use client';

import { ArrowLeft, Ban } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';

import { ExtensionMockTable } from '@/components/extension-mock-table';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ExtensionMock {
	id: string;
	name: string;
	method: string;
	statusCode: number;
	enabled: boolean;
	pattern?: string;
	body?: string;
	response?: string;
	matchType?: string;
	variants?: Array<{
		id: string;
		name: string;
		statusCode: number;
	}>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ExtensionFolderPage() {
	const params = useParams();
	const slug = params.slug as string;

	const { data, isLoading } = useSWR<{
		id: string;
		name: string;
		slug: string;
		meta?: Record<string, unknown>;
	}>(
		slug ? `/api/folders?slug=${slug}` : null,
		fetcher,
	);

	if (isLoading) {
		return (
			<div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen p-8">
				<div className="mx-auto max-w-7xl">
					<p>Loading...</p>
				</div>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen p-8">
				<div className="mx-auto max-w-7xl">
					<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-12 text-center">
						<h2 className="text-xl font-bold">Folder not found</h2>
						<Button asChild className="mt-4">
							<Link href="/extension-data">Back to Extension Sync</Link>
						</Button>
					</Card>
				</div>
			</div>
		);
	}

	const extensionData = (data.meta?.extensionSyncData as { mocks?: ExtensionMock[] }) || {};
	const mocks = extensionData.mocks || [];

	return (
		<div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen">
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="mb-8 flex items-center justify-between">
					<Button variant="ghost" asChild>
						<Link href="/extension-data">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to List
						</Link>
					</Button>
					<ThemeSwitcher />
				</div>

				<div className="mb-8">
					<div className="flex items-center gap-3">
						<h1 className="text-4xl font-bold tracking-tight text-foreground">
							{data.name}
						</h1>
						<span className="rounded-full bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-500 border border-indigo-500/20">
							Browser Extension Sync
						</span>
					</div>
					<p className="mt-1 text-muted-foreground">/{data.slug}</p>
					
					{/* Metadata Summary Card could go here */}
				</div>

				<div className="grid gap-8">
					{/* Read-Only Warning */}
					<div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 text-yellow-600 dark:text-yellow-400 flex items-center gap-3">
						<Ban className="h-5 w-5" />
						<p className="text-sm font-medium">
							This folder is synced from the browser extension. Mocks here are read-only and managed by the extension.
						</p>
					</div>

					<div>
						<h2 className="mb-4 text-2xl font-semibold text-foreground">
							Synced Mocks
						</h2>
						<ExtensionMockTable 
							mocks={mocks} 
							folderId={data.id}
							folderName={data.name}
							folderSlug={data.slug}
							folderMeta={data.meta}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
