'use client';

import {
	BarChart3,
	Brain,
	Database,
	Globe,
	Network,
	Repeat,
	Server,
	Sliders,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const features = [
	{
		icon: Database,
		title: 'JSON Schema + Faker',
		description:
			'Define mock data using JSON Schema with built-in Faker.js interpolation for dynamic, realistic responses.',
		product: 'server' as const,
	},
	{
		icon: Server,
		title: 'PostgreSQL-Powered',
		description:
			'Reliable data persistence with PostgreSQL. Store and manage all your mocks in a mini-database.',
		product: 'server' as const,
	},
	{
		icon: Repeat,
		title: 'Wildcard Variants',
		description:
			'Create flexible route patterns with wildcard support. Match multiple URL patterns with a single mock.',
		product: 'server' as const,
	},
	{
		icon: Network,
		title: 'Workflow Mode',
		description:
			'Build stateful scenarios with workflow mode. Simulate complex API interactions and multi-step processes.',
		product: 'server' as const,
	},
	{
		icon: Brain,
		title: 'MCP Integration',
		description:
			'24 Model Context Protocol tools for AI agents. Seamlessly integrate with Claude Desktop, Cursor, and more.',
		product: 'server' as const,
	},
	{
		icon: Globe,
		title: 'Real-time Interception',
		description:
			'Intercept fetch() and XMLHttpRequest in real-time. Mock API responses instantly in your browser.',
		product: 'extension' as const,
	},
	{
		icon: Sliders,
		title: 'Flexible Matching',
		description:
			'Pattern-based matching with wildcards, regex, and exact URL matching for precise control.',
		product: 'extension' as const,
	},
	{
		icon: BarChart3,
		title: 'Hit Tracking',
		description:
			'Track how many times each mock rule is triggered with built-in analytics and counters.',
		product: 'extension' as const,
	},
	{
		icon: Network,
		title: 'Cross-device Sync',
		description:
			'Sync your mock rules across machines with the HTTP Server integration for team collaboration.',
		product: 'both' as const,
	},
];

const productLabels = {
	server: 'HTTP Server',
	extension: 'Extension',
	both: 'Both Products',
};

export function Features() {
	return (
		<section id="features" className="py-20 md:py-28">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
						Platform Features
					</h2>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						Two powerful tools working together as one ecosystem
					</p>
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
					{features.map((feature) => (
						<Card
							key={feature.title}
							className="mockzilla-border mockzilla-card-hover group border bg-card/50 backdrop-blur-sm p-6"
						>
							<div className="flex items-start justify-between mb-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-linear-to-br from-primary/20 to-accent/20 transition-all group-hover:from-primary/30 group-hover:to-accent/30">
									<feature.icon className="h-6 w-6 text-primary" />
								</div>
								<Badge variant="secondary" className="text-xs">
									{productLabels[feature.product]}
								</Badge>
							</div>
							<h3 className="text-lg font-semibold text-foreground mb-2">
								{feature.title}
							</h3>
							<p className="text-sm text-muted-foreground">
								{feature.description}
							</p>
						</Card>
					))}
				</div>

				{/* Stats */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6 text-center">
						<div className="text-3xl font-bold text-primary mb-1">24</div>
						<div className="text-sm text-muted-foreground">MCP Tools</div>
					</Card>
					<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6 text-center">
						<div className="text-3xl font-bold text-primary mb-1">&lt;30s</div>
						<div className="text-sm text-muted-foreground">Deploy Time</div>
					</Card>
					<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6 text-center">
						<div className="text-3xl font-bold text-primary mb-1">2</div>
						<div className="text-sm text-muted-foreground">Products</div>
					</Card>
					<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6 text-center">
						<div className="text-3xl font-bold text-primary mb-1">100%</div>
						<div className="text-sm text-muted-foreground">Open Source</div>
					</Card>
				</div>
			</div>
		</section>
	);
}
