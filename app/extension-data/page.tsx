'use client';

import { MockExtensionList } from '@/components/mock-extension-list';

export default function ExtensionDataPage() {
	return (
		<div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen">
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						Extension Synchronization
					</h1>
					<p className="mt-2 text-muted-foreground">
						Manage mock data synced from the Mockzilla Browser Extension. These folders contain high-fidelity metadata stored for syncing purposes.
					</p>
				</div>
				<MockExtensionList />
			</div>
		</div>
	);
}
