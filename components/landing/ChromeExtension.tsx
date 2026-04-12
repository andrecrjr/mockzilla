'use client';

import { BarChart3, Bolt, FolderSync, Globe, Sliders } from 'lucide-react';
import { Card } from '@/components/ui/card';

const features = [
	{
		icon: Bolt,
		title: 'Real-time Interception',
		description: 'Intercept fetch() and XMLHttpRequest instantly as they happen in your browser.',
	},
	{
		icon: Sliders,
		title: 'Flexible Matching',
		description: 'Pattern-based matching with wildcards, regex, and exact URL matching.',
	},
	{
		icon: BarChart3,
		title: 'Hit Tracking',
		description: 'Track how many times each mock rule is triggered with built-in analytics.',
	},
	{
		icon: FolderSync,
		title: 'Cross-device Sync',
		description: 'Sync your mock rules across machines with the HTTP Server integration.',
	},
];

export function ChromeExtension() {
	return (
		<section id="extension" className="py-20 md:py-28 bg-gradient-to-br from-primary/5 to-purple-500/5 dark:from-primary/5 dark:to-purple-900/10">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="grid lg:grid-cols-2 gap-12 items-start">
					{/* Left: Extension Preview */}
					<div className="order-2 lg:order-1">
						<Card className="mockzilla-border bg-card/50 backdrop-blur-sm overflow-hidden">
							<div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-muted/50">
								<img
									src="/mockzilla-logo.png"
									alt="Mockzilla"
									className="h-5 w-5 invert dark:filter-none"
								/>
								<span className="text-sm font-semibold text-foreground">
									Mockzilla Extension
								</span>
								<span className="ml-auto text-xs text-muted-foreground">
									v1.0.0
								</span>
							</div>

							<div className="p-4 space-y-4">
								{/* Rule 1 */}
								<div className="border border-border rounded-lg p-3">
									<div className="flex items-center justify-between mb-2">
										<div className="flex items-center gap-2">
											<div className="h-2 w-2 rounded-full bg-green-500" />
											<span className="text-sm font-mono text-primary font-semibold">
												/api/users
											</span>
										</div>
										<span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
											JSON
										</span>
									</div>
									<div className="bg-muted/50 rounded p-2 font-mono text-xs mb-2">
										<span className="text-muted-foreground">// Response Body</span>
										<div className="text-foreground mt-1">
											{'{'} "users": [{'{'} "id": 1, "name": "John" {'}'}] {'}'}
										</div>
									</div>
									<div className="flex items-center justify-between text-xs text-muted-foreground">
										<span>Hits: 5</span>
										<span>Enabled</span>
									</div>
								</div>

								{/* Rule 2 */}
								<div className="border border-border rounded-lg p-3">
									<div className="flex items-center justify-between mb-2">
										<div className="flex items-center gap-2">
											<div className="h-2 w-2 rounded-full bg-green-500" />
											<span className="text-sm font-mono text-primary font-semibold">
												/api/products/*
											</span>
										</div>
										<span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
											JSON
										</span>
									</div>
									<div className="bg-muted/50 rounded p-2 font-mono text-xs mb-2">
										<span className="text-muted-foreground">// Response Body</span>
										<div className="text-foreground mt-1">
											{'{'} "products": [{'{'} "id": 42, "price": 29.99 {'}'}] {'}'}
										</div>
									</div>
									<div className="flex items-center justify-between text-xs text-muted-foreground">
										<span>Hits: 2</span>
										<span>Enabled</span>
									</div>
								</div>

								<div className="border-2 border-dashed border-border rounded-lg p-3 text-center">
									<span className="text-sm text-muted-foreground">
										+ Add Rule
									</span>
								</div>
							</div>
						</Card>
					</div>

					{/* Right: Features */}
					<div className="order-1 lg:order-2">
						<div className="flex items-center gap-3 mb-4">
							<div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
								<Globe className="h-6 w-6 text-primary" />
							</div>
							<div>
								<h2 className="text-3xl font-bold text-foreground">
									Mockzilla Chrome Extension
								</h2>
								<p className="text-sm text-muted-foreground">
									Browser-based API interception
								</p>
							</div>
						</div>

						<p className="text-muted-foreground mb-8">
							A lightweight Chrome extension that intercepts fetch() and
							XMLHttpRequest calls in real-time, allowing you to mock API
							responses without any server setup. Perfect for frontend developers
							who need instant feedback.
						</p>

						<div className="space-y-6 mb-8">
							{features.map((feature) => (
								<div key={feature.title} className="flex gap-4">
									<div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
										<feature.icon className="h-5 w-5 text-primary" />
									</div>
									<div>
										<h3 className="font-semibold text-foreground mb-1">
											{feature.title}
										</h3>
										<p className="text-sm text-muted-foreground">
											{feature.description}
										</p>
									</div>
								</div>
							))}
						</div>

						<a
							href="https://chromewebstore.google.com/detail/gpbfcijfelgnaabjodgifeopbmnbjpnk/preview"
							target="_blank"
							rel="noopener noreferrer"
						>
							<span className="inline-flex items-center gap-2 text-primary hover:underline font-medium">
								Install from Chrome Web Store →
							</span>
						</a>
					</div>
				</div>
			</div>
		</section>
	);
}
