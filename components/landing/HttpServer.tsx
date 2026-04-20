'use client';

import { Bot, Cog, Database, Server } from 'lucide-react';
import { Card } from '@/components/ui/card';

const features = [
	{
		icon: Database,
		title: 'Mini-Database',
		description:
			'Scenario-based data persistence with PostgreSQL. Store and query mock data like a real database.',
	},
	{
		icon: Bot,
		title: 'MCP Integration',
		description:
			'First-class support for AI agents. 24 Model Context Protocol tools for Claude, Cursor, and more.',
	},
	{
		icon: Cog,
		title: 'Workflow Scenarios',
		description:
			'Complex stateful scenarios that simulate multi-step API interactions and user flows.',
	},
];

export function HttpServer() {
	return (
		<section id="server" className="py-20 md:py-28">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="grid lg:grid-cols-2 gap-12 items-start">
					{/* Left: Features */}
					<div>
						<div className="flex items-center gap-3 mb-4">
							<div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
								<Server className="h-6 w-6 text-primary" />
							</div>
							<div>
								<h2 className="text-3xl font-bold text-foreground">
									Mockzilla HTTP Server
								</h2>
								<p className="text-sm text-muted-foreground">
									Next.js + PostgreSQL mock server
								</p>
							</div>
						</div>

						<p className="text-muted-foreground mb-8">
							A powerful, self-hosted mock server that lets you create dynamic
							API endpoints with JSON Schema interpolation, wildcard routes, and
							stateful workflows. Perfect for teams that need reliable,
							consistent mock data during development.
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

						<div className="bg-muted/50 rounded-lg p-4 font-mono text-sm border border-border">
							<div className="text-muted-foreground mb-2">
								$ docker pull andrecrjr/mockzilla:latest
							</div>
							<div className="text-green-600 dark:text-green-400">
								✓ Latest version ready
							</div>
						</div>
					</div>

					{/* Right: Terminal Preview + Stats */}
					<div className="space-y-6">
						<Card className="mockzilla-border bg-card/50 backdrop-blur-sm overflow-hidden">
							<div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-muted/50">
								<div className="h-3 w-3 rounded-full bg-red-500" />
								<div className="h-3 w-3 rounded-full bg-yellow-500" />
								<div className="h-3 w-3 rounded-full bg-green-500" />
								<span className="ml-2 text-xs text-muted-foreground font-mono">
									GET /api/users
								</span>
							</div>
							<div className="p-4 font-mono text-sm">
								<pre className="text-xs overflow-x-auto">
									{`{
  "id": "usr_abc123",
  "name": "{{faker.person.fullName()}}",
  "email": "{{faker.internet.email()}}",
  "role": "admin",
  "created_at": "2024-01-15T10:30:00Z"
}`}
								</pre>
							</div>
						</Card>

						<div className="grid grid-cols-2 gap-4">
							<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-4">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
										<Database className="h-5 w-5 text-primary" />
									</div>
									<div>
										<div className="text-sm font-semibold text-foreground">
											Folders
										</div>
										<div className="text-xs text-muted-foreground">
											Organize mocks
										</div>
									</div>
								</div>
							</Card>
							<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-4">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
										<Cog className="h-5 w-5 text-primary" />
									</div>
									<div>
										<div className="text-sm font-semibold text-foreground">
											Workflows
										</div>
										<div className="text-xs text-muted-foreground">
											Stateful scenarios
										</div>
									</div>
								</div>
							</Card>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
