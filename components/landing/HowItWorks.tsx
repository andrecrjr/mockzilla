'use client';

import { ArrowRight, Check, Code2, Server, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';

const steps = [
	{
		number: 1,
		title: 'Choose Your Tool',
		description: 'Use the HTTP Server for dynamic mocking, the Chrome Extension for instant interception, or both together for the full experience.',
		tools: ['HTTP Server', 'Chrome Extension', 'Both (Recommended)'],
	},
	{
		number: 2,
		title: 'Configure Mocks',
		description: 'Define your mock endpoints with static JSON, dynamic schemas with Faker.js, or stateful workflow scenarios.',
		tools: ['Static JSON', 'JSON Schema + Faker', 'Workflows'],
	},
	{
		number: 3,
		title: 'Use in Development',
		description: 'Point your frontend to Mockzilla and start building. The Chrome Extension intercepts calls automatically when synced.',
		tools: ['Frontend Dev', 'QA Testing', 'AI Agents'],
	},
];

export function HowItWorks() {
	return (
		<section className="py-20 md:py-28">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
						How Mockzilla Works
					</h2>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						Three simple steps to start mocking like a pro
					</p>
				</div>

				<div className="grid lg:grid-cols-2 gap-12 items-start">
					{/* Steps */}
					<div className="space-y-8">
						{steps.map((step) => (
							<div key={step.number} className="flex gap-4">
								<div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0">
									<span className="text-white font-bold">{step.number}</span>
								</div>
								<div className="flex-1">
									<h3 className="text-xl font-semibold text-foreground mb-2">
										{step.title}
									</h3>
									<p className="text-muted-foreground mb-3">
										{step.description}
									</p>
									<div className="flex flex-wrap gap-2">
										{step.tools.map((tool) => (
											<span
												key={tool}
												className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full"
											>
												{tool}
											</span>
										))}
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Visual Diagram */}
					<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
						<div className="text-center mb-6">
							<h3 className="text-lg font-semibold text-foreground">
								Your Development Stack
							</h3>
						</div>

						<div className="space-y-4">
							{/* Frontend App */}
							<div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/30">
								<div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
									<Code2 className="h-5 w-5 text-blue-500" />
								</div>
								<div className="flex-1 text-left">
									<div className="text-sm font-semibold text-foreground">Your Frontend App</div>
									<div className="text-xs text-muted-foreground">React, Vue, Angular, etc.</div>
								</div>
							</div>

							{/* Arrows */}
							<div className="flex items-center justify-center gap-2 text-primary">
								<ArrowRight className="h-4 w-4 rotate-90" />
								<span className="text-xs font-mono">fetch() / XHR</span>
								<ArrowRight className="h-4 w-4 rotate-90" />
							</div>

							{/* Mockzilla */}
							<div className="grid grid-cols-2 gap-3">
								<div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-primary/5">
									<Server className="h-5 w-5 text-primary" />
									<div>
										<div className="text-sm font-semibold text-foreground">HTTP Server</div>
										<div className="text-xs text-muted-foreground">Dynamic mocks</div>
									</div>
								</div>
								<div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-primary/5">
									<Zap className="h-5 w-5 text-primary" />
									<div>
										<div className="text-sm font-semibold text-foreground">Extension</div>
										<div className="text-xs text-muted-foreground">Interception</div>
									</div>
								</div>
							</div>

							{/* Checkmarks */}
							<div className="mt-4 space-y-2">
								<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
									<Check className="h-4 w-4" />
									<span>Real-time responses</span>
								</div>
								<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
									<Check className="h-4 w-4" />
									<span>No backend required</span>
								</div>
								<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
									<Check className="h-4 w-4" />
									<span>Sync across devices</span>
								</div>
							</div>
						</div>
					</Card>
				</div>
			</div>
		</section>
	);
}
