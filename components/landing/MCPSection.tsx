'use client';

import { Bot, Code2, Cpu, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const tools = [
	{ name: 'Claude Desktop', icon: MessageSquare },
	{ name: 'Cursor', icon: Code2 },
	{ name: 'Windsurf', icon: Cpu },
	{ name: 'Custom MCP Clients', icon: Bot },
];

export function MCPSection() {
	return (
		<section className="py-24">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="grid gap-12 lg:grid-cols-2 items-center">
					<div>
						<h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
							AI-Ready with{' '}
							<span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
								MCP Integration
							</span>
						</h2>
						<p className="mt-4 text-lg text-muted-foreground">
							Mockzilla exposes 24 Model Context Protocol tools, allowing AI
							agents to interact with your mocks programmatically. Perfect for
							testing AI-powered workflows.
						</p>
						<div className="mt-6 flex flex-wrap gap-3">
							{tools.map((tool) => (
								<div
									key={tool.name}
									className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-4 py-2"
								>
									<tool.icon className="h-4 w-4 text-primary" />
									<span className="text-sm text-foreground">{tool.name}</span>
								</div>
							))}
						</div>
						<div className="mt-8">
							<Link href="/docs">
								<Button variant="outline" className="gap-2 mockzilla-border">
									Learn More About MCP
								</Button>
							</Link>
						</div>
					</div>

					<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
						<div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
							<Bot className="h-5 w-5 text-primary" />
							<span className="font-semibold text-foreground">
								MCP Tools Available
							</span>
						</div>
						<div className="space-y-2 font-mono text-sm">
							<div className="text-green-600 dark:text-green-400">
								✓ list_folders
							</div>
							<div className="text-green-600 dark:text-green-400">
								✓ create_folder
							</div>
							<div className="text-green-600 dark:text-green-400">
								✓ get_mocks
							</div>
							<div className="text-green-600 dark:text-green-400">
								✓ create_mock
							</div>
							<div className="text-green-600 dark:text-green-400">
								✓ update_mock
							</div>
							<div className="text-green-600 dark:text-green-400">
								✓ delete_mock
							</div>
							<div className="text-green-600 dark:text-green-400">
								✓ manage_workflows
							</div>
							<div className="text-muted-foreground">+ 17 more tools...</div>
						</div>
					</Card>
				</div>
			</div>
		</section>
	);
}
