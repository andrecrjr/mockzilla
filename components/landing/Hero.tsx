'use client';

import { ArrowRight, BookOpen, Code2, Copy, Terminal } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DynamicHeadline } from '@/components/landing/DynamicHeadline';
import { toast } from 'sonner';

const dockerCommand =
	'docker run -d -p 36666:36666 -v mockzilla-data:/app/data --name mockzilla andrecrjr/mockzilla:latest';

export function Hero() {
	const [copied, setCopied] = useState(false);

	const copyToClipboard = () => {
		navigator.clipboard.writeText(dockerCommand);
		setCopied(true);
		toast.success('Copied!', { description: 'Docker command copied to clipboard' });
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<section className="relative overflow-hidden py-20 md:py-28">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-12">
					{/* Badge */}
					<div className="inline-flex items-center gap-2 rounded-full border mockzilla-border bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
						<Terminal className="h-3.5 w-3.5" />
						Open Source API Mocking Platform
					</div>

					{/* Dynamic Headline */}
					<h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
						<DynamicHeadline />
					</h1>

					{/* Subtitle */}
					<p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-4">
						Chrome Extension for instant interception. HTTP Server for dynamic
						mocking.{' '}
						<span className="text-foreground font-semibold">
							Two tools, one ecosystem.
						</span>
					</p>
					<p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-8">
						Mock APIs in 30 seconds with JSON Schema + Faker, MCP integration,
						and stateful workflows.
					</p>

					{/* CTA Buttons */}
					<div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
						<a href="#server">
							<Button size="lg" className="gap-2 text-base px-8">
								Deploy Server
								<ArrowRight className="h-4 w-4" />
							</Button>
						</a>
						<a
							href="https://chromewebstore.google.com/detail/gpbfcijfelgnaabjodgifeopbmnbjpnk/preview"
							target="_blank"
							rel="noopener noreferrer"
						>
							<Button
								size="lg"
								variant="outline"
								className="gap-2 text-base px-8 mockzilla-border"
							>
								Install Extension
							</Button>
						</a>
						<a href="#features">
							<Button
								size="lg"
								variant="ghost"
								className="gap-2 text-base px-8"
							>
								View Features
							</Button>
						</a>
					</div>
				</div>

				{/* Preview Cards */}
				<div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-8">
					{/* HTTP Server Card */}
					<Card className="mockzilla-border bg-card/50 backdrop-blur-sm overflow-hidden">
						<div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-muted/50">
							<div className="h-3 w-3 rounded-full bg-red-500" />
							<div className="h-3 w-3 rounded-full bg-yellow-500" />
							<div className="h-3 w-3 rounded-full bg-green-500" />
							<span className="ml-2 text-xs text-muted-foreground font-mono">
								Mockzilla HTTP Server
							</span>
						</div>
						<div className="p-4 font-mono text-sm">
							<div className="text-muted-foreground mb-2">
								<span className="text-green-600 dark:text-green-400">GET</span>{' '}
								/api/users
							</div>
							<div className="text-muted-foreground mb-2">
								<span className="text-green-600 dark:text-green-400">POST</span>{' '}
								/api/products
							</div>
							<div className="text-muted-foreground mb-4">
								<span className="text-green-600 dark:text-green-400">PUT</span>{' '}
								/api/orders/123
							</div>
							<div className="text-xs text-muted-foreground">
								// Dynamic responses with Faker.js
							</div>
							<pre className="text-xs overflow-x-auto text-foreground mt-1">
{`{
  "id": "{{faker.string.uuid()}}",
  "name": "{{faker.person.fullName()}}",
  "email": "{{faker.internet.email()}}"
}`}
							</pre>
						</div>
					</Card>

					{/* Chrome Extension Card */}
					<Card className="mockzilla-border bg-card/50 backdrop-blur-sm overflow-hidden">
						<div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-muted/50">
							<div className="h-3 w-3 rounded-full bg-red-500" />
							<div className="h-3 w-3 rounded-full bg-yellow-500" />
							<div className="h-3 w-3 rounded-full bg-green-500" />
							<span className="ml-2 text-xs text-muted-foreground font-mono">
								Mockzilla Extension
							</span>
						</div>
						<div className="p-4 font-mono text-sm space-y-3">
							<div className="border border-border rounded p-2">
								<div className="flex items-center justify-between mb-1">
									<span className="text-primary text-xs font-semibold">
										/api/users
									</span>
									<span className="text-xs text-muted-foreground">Hits: 5</span>
								</div>
								<div className="text-xs text-muted-foreground">
									Type: JSON | Status: 200
								</div>
							</div>
							<div className="border border-border rounded p-2">
								<div className="flex items-center justify-between mb-1">
									<span className="text-primary text-xs font-semibold">
										/api/products/*
									</span>
									<span className="text-xs text-muted-foreground">Hits: 2</span>
								</div>
								<div className="text-xs text-muted-foreground">
									Type: JSON | Status: 200
								</div>
							</div>
							<div className="text-xs text-muted-foreground mt-2">
								✓ Intercepting fetch() and XMLHttpRequest
							</div>
						</div>
					</Card>
				</div>

				{/* Quick Docker Command */}
				<div className="max-w-3xl mx-auto">
					<Card className="mockzilla-border bg-card/80 backdrop-blur-sm p-4">
						<div className="flex items-center gap-4">
							<div className="flex-1 font-mono text-sm text-muted-foreground overflow-x-auto whitespace-nowrap">
								$ {dockerCommand}
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={copyToClipboard}
								className="shrink-0 gap-2"
							>
								<Copy className="h-4 w-4" />
								{copied ? 'Copied!' : 'Copy'}
							</Button>
						</div>
					</Card>
				</div>
			</div>
		</section>
	);
}
