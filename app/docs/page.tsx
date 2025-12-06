'use client';

import {
	AlertCircle,
	BookOpen,
	Code2,
	Lightbulb,
	Database,
	Workflow,
} from 'lucide-react';
import Link from 'next/link';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkflowDocs } from '@/components/docs/workflow-docs';

export default function DocsPage() {
	return (
		<div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen">
            {/* ... */}

			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<Tabs defaultValue="overview" className="flex flex-col md:flex-row gap-8" orientation="vertical">
					{/* Sidebar Navigation */}
					<div className="w-full md:w-64 flex-shrink-0">
						<div className="sticky top-24">
							<div className="flex items-center gap-2 mb-6">
								<BookOpen className="h-5 w-5 text-primary" />
								<h1 className="text-xl font-bold tracking-tight">Documentation</h1>
							</div>
							
							<TabsList className="bg-transparent p-0 flex flex-col h-auto items-stretch space-y-1">
								<div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
									Getting Started
								</div>
								<TabsTrigger 
									value="overview" 
									className="justify-start px-2 py-1.5 h-auto text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md transition-colors hover:bg-muted"
								>
									Overview
								</TabsTrigger>
								<TabsTrigger 
									value="syntax" 
									className="justify-start px-2 py-1.5 h-auto text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md transition-colors hover:bg-muted"
								>
									Syntax Guide
								</TabsTrigger>
								<TabsTrigger 
									value="examples" 
									className="justify-start px-2 py-1.5 h-auto text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md transition-colors hover:bg-muted"
								>
									Examples
								</TabsTrigger>
								
								<div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 mt-4">
									Advanced
								</div>
								<TabsTrigger 
									value="workflows" 
									className="justify-start px-2 py-1.5 h-auto text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md transition-colors hover:bg-muted"
								>
									Workflow Mode
								</TabsTrigger>
								<TabsTrigger 
									value="advanced" 
									className="justify-start px-2 py-1.5 h-auto text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md transition-colors hover:bg-muted"
								>
									Advanced Features
								</TabsTrigger>
								<TabsTrigger 
									value="mcp" 
									className="justify-start px-2 py-1.5 h-auto text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md transition-colors hover:bg-muted"
								>
									MCP Integration
								</TabsTrigger>
							</TabsList>
						</div>
					</div>

					{/* Main Content */}
					<main className="flex-1 min-w-0">
						<TabsContent value="overview" className="mt-0 space-y-6">
							<Card className="mockzilla-border mockzilla-glow border-2 bg-card/50 backdrop-blur-sm p-6">
								<h2 className="text-2xl font-bold text-card-foreground mb-4">
									Overview
								</h2>
								<p className="text-muted-foreground mb-4">
									Mockzilla is a powerful API mocking tool designed for modern development workflows.
									It supports dynamic response generation, stateful workflows, and AI integration via MCP.
								</p>
								
								<div className="grid gap-6 md:grid-cols-2 mt-8">
									<div className="p-4 rounded-lg bg-card border border-border">
										<h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
											<Code2 className="h-4 w-4 text-primary" />
											Dynamic Mocks
										</h3>
										<p className="text-sm text-muted-foreground">
											Generate realistic data using JSON Schema + Faker. Ensure your UI handles varied data correctly.
										</p>
									</div>
									<div className="p-4 rounded-lg bg-card border border-border">
										<h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
											<Workflow className="h-4 w-4 text-accent" />
											Stateful Workflows
										</h3>
										<p className="text-sm text-muted-foreground">
											Simulate complex user flows (Cart &rarr; Checkout) with persistent state and logic.
										</p>
									</div>
									<div className="p-4 rounded-lg bg-card border border-border">
										<h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
											<Database className="h-4 w-4 text-secondary-foreground" />
											Mini-Database
										</h3>
										<p className="text-sm text-muted-foreground">
											Each scenario gets a transient database to push, update, and query items during a session.
										</p>
									</div>
									<div className="p-4 rounded-lg bg-card border border-border">
										<h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
											<Lightbulb className="h-4 w-4 text-yellow-500" />
											MCP Support
										</h3>
										<p className="text-sm text-muted-foreground">
											First-class support for AI agents. Let Claude or other LLMs control your mocks directly.
										</p>
									</div>
								</div>
							</Card>

                            <Accordion type="single" collapsible className="space-y-4">
                                <AccordionItem value="faq-1">
                                    <AccordionTrigger>Why use Mockzilla over straightforward mocks?</AccordionTrigger>
                                    <AccordionContent>
                                        Mockzilla allows for dynamic responses and stateful scenarios, which lets you test complex interactions even when backend APIs aren't ready.
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
						</TabsContent>

						<TabsContent value="syntax" className="mt-0 space-y-6">
							<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
								<h2 className="text-2xl font-bold text-foreground mb-4">Syntax Guide</h2>
								<p className="text-muted-foreground mb-6">
									Reference for dynamic value generation and string interpolation.
								</p>

								<Accordion type="single" collapsible className="space-y-4">
									<AccordionItem value="syntax-ref">
										<AccordionTrigger>Field References</AccordionTrigger>
										<AccordionContent>
											<div className="space-y-4">
												<p className="text-sm text-muted-foreground">
													Access other fields in your generated JSON using <code>{`{$.path.to.field}`}</code>.
												</p>
												<pre className="bg-muted p-3 rounded text-xs font-mono">
{`"message": "Hello {$.user.name}"`}
												</pre>
											</div>
										</AccordionContent>
									</AccordionItem>
									<AccordionItem value="syntax-faker">
										<AccordionTrigger>Faker Integration</AccordionTrigger>
										<AccordionContent>
											<div className="space-y-4">
												<p className="text-sm text-muted-foreground">
													Use any method from <a href="https://fakerjs.dev" target="_blank" className="underline hover:text-primary">Faker.js</a>.
												</p>
												<pre className="bg-muted p-3 rounded text-xs font-mono">
{`{
  "properties": {
    "name": { "type": "string", "faker": "person.fullName" },
    "email": { "type": "string", "faker": "internet.email" }
  }
}`}
												</pre>
											</div>
										</AccordionContent>
									</AccordionItem>
                                    <AccordionItem value="syntax-custom">
                                        <AccordionTrigger>Custom Formats</AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Use <code>x-store-as</code> and <code>x-ref</code> to generate a value once and reuse it across the document.
                                                </p>
                                                <pre className="bg-muted p-3 rounded text-xs font-mono">
{`{
    "id": { "type": "string", "format": "x-store-as", "x-key": "userId" },
    "ref": { "type": "string", "format": "x-ref", "x-key": "userId" }
}`}
                                                </pre>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
								</Accordion>
							</Card>
						</TabsContent>

						<TabsContent value="examples" className="mt-0 space-y-6">
							<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
								<h2 className="text-2xl font-bold text-foreground mb-4">Examples</h2>
								<p className="text-muted-foreground mb-6">Common patterns for mock responses.</p>
								
								<div className="space-y-6">
									<div className="border rounded-lg p-4">
										<h3 className="font-semibold mb-2">List of Users</h3>
										<pre className="bg-muted p-3 rounded text-xs font-mono overflow-auto">
{`{
  "type": "array",
  "minItems": 3,
  "maxItems": 5,
  "items": {
    "type": "object",
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "name": { "type": "string", "faker": "person.fullName" },
      "avatar": { "type": "string", "faker": "image.avatar" }
    },
    "required": ["id", "name"]
  }
}`}
										</pre>
									</div>
                                    
                                    <div className="border rounded-lg p-4">
                                        <h3 className="font-semibold mb-2">Nested Object with Refs</h3>
                                        <pre className="bg-muted p-3 rounded text-xs font-mono overflow-auto">
{`{
  "type": "object",
  "properties": {
    "orderId": { "type": "string", "format": "uuid" },
    "summary": { "const": "Order {$.orderId} confirmed" }
  }
}`}
                                        </pre>
                                    </div>
								</div>
							</Card>
						</TabsContent>

						<TabsContent value="workflows" className="mt-0 space-y-6">
                            <WorkflowDocs />
						</TabsContent>

						<TabsContent value="advanced" className="mt-0">
							<Card className="p-6 border-dashed">
								<p className="text-center text-muted-foreground">Advanced documentation is being updated.</p>
							</Card>
						</TabsContent>

						<TabsContent value="mcp" className="mt-0">
							<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
								<h2 className="text-2xl font-bold text-foreground mb-4">MCP Integration</h2>
								<p className="text-muted-foreground mb-4">
									Mockzilla exposes a Model Context Protocol server, allowing AI agents to fully control mocking.
								</p>
								<div className="bg-muted p-4 rounded-lg">
									<h3 className="font-bold text-sm mb-2">Available Tools</h3>
									<ul className="list-disc pl-4 text-sm space-y-1">
										<li><code>create_mock</code> - Create new endpoints</li>
										<li><code>create_workflow_transition</code> - Define workflow rules</li>
										<li><code>inspect_workflow_state</code> - Read scenario state</li>
										<li><code>reset_workflow_state</code> - Clear scenario data</li>
									</ul>
								</div>
							</Card>
						</TabsContent>
					</main>
				</Tabs>
			</div>
		</div>
	);
}
