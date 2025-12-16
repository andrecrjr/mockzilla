'use client';

import {
	AlertCircle,
	BookOpen,
	Braces,
	Code2,
	Database,
	Lightbulb,
	Workflow,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SchemaDocs } from '@/components/docs/schema-docs';
import { SchemaTesterDialog } from '@/components/docs/schema-tester-dialog';
import { WorkflowDocs } from '@/components/docs/workflow-docs';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DocsPage() {
	const tabKeys = [
		'overview',
		'syntax',
		'examples',
		'workflows',
		'advanced',
		'mcp',
	] as const;
	type TabKey = (typeof tabKeys)[number];

	const [activeTab, setActiveTab] = useState<TabKey>('overview');

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const readHash = (): TabKey | null => {
			const raw = window.location.hash.replace('#', '');
			return tabKeys.includes(raw as TabKey) ? (raw as TabKey) : null;
		};

		const initial = readHash();
		if (initial) {
			setActiveTab(initial);
		}

		const handleHashChange = () => {
			const next = readHash();
			if (next) {
				setActiveTab(next);
			}
		};

		window.addEventListener('hashchange', handleHashChange);
		return () => window.removeEventListener('hashchange', handleHashChange);
	}, []);

	const handleTabChange = (value: string) => {
		const next = value as TabKey;
		setActiveTab(next);
		if (typeof window !== 'undefined') {
			const target = `#${next}`;
			if (window.location.hash !== target) {
				window.history.replaceState(null, '', target);
			}
		}
	};

	return (
		<div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen">
			{/* ... */}

			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<Tabs
					value={activeTab}
					onValueChange={handleTabChange}
					className="flex flex-col md:flex-row gap-8"
					orientation="vertical"
				>
					{/* Sidebar Navigation */}
					<div className="w-full md:w-64 flex-shrink-0">
						<div className="sticky top-24">
							<div className="flex items-center gap-2 mb-6">
								<BookOpen className="h-5 w-5 text-primary" />
								<h1 className="text-xl font-bold tracking-tight">
									Documentation
								</h1>
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
									Schema & Data
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
						<TabsContent
							value="overview"
							id="overview"
							className="mt-0 space-y-6"
						>
							<Card className="mockzilla-border mockzilla-glow border-2 bg-card/50 backdrop-blur-sm p-6">
								<h2 className="text-2xl font-bold text-card-foreground mb-4">
									Overview
								</h2>
								<p className="text-muted-foreground mb-4">
									Mockzilla is a powerful API mocking tool designed for modern
									development workflows. It supports dynamic response
									generation, stateful workflows, and AI integration via MCP.
								</p>

								<div className="grid gap-6 md:grid-cols-2 mt-8">
									<div className="p-4 rounded-lg bg-card border border-border">
										<h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
											<Code2 className="h-4 w-4 text-primary" />
											Dynamic Mocks
										</h3>
										<p className="text-sm text-muted-foreground">
											Generate realistic data using JSON Schema + Faker. Ensure
											your UI handles varied data correctly.
										</p>
									</div>
									<div className="p-4 rounded-lg bg-card border border-border">
										<h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
											<Workflow className="h-4 w-4 text-accent" />
											Stateful Workflows
										</h3>
										<p className="text-sm text-muted-foreground">
											Simulate complex user flows (Cart &rarr; Checkout) with
											persistent state and logic.
										</p>
									</div>
									<div className="p-4 rounded-lg bg-card border border-border">
										<h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
											<Database className="h-4 w-4 text-secondary-foreground" />
											Mini-Database
										</h3>
										<p className="text-sm text-muted-foreground">
											Each scenario gets a transient database to push, update,
											and query items during a session.
										</p>
									</div>
									<div className="p-4 rounded-lg bg-card border border-border">
										<h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
											<Lightbulb className="h-4 w-4 text-yellow-500" />
											MCP Support
										</h3>
										<p className="text-sm text-muted-foreground">
											First-class support for AI agents. Let Claude or other
											LLMs control your mocks directly.
										</p>
									</div>
								</div>
							</Card>

							<Accordion type="single" collapsible className="space-y-4">
								<AccordionItem value="faq-1">
									<AccordionTrigger>
										Why use Mockzilla over straightforward mocks?
									</AccordionTrigger>
									<AccordionContent>
										Mockzilla allows for dynamic responses and stateful
										scenarios, which lets you test complex interactions even
										when backend APIs aren't ready.
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						</TabsContent>

						<TabsContent value="syntax" id="syntax" className="mt-0 space-y-6">
							<SchemaDocs />
						</TabsContent>

						<TabsContent
							value="examples"
							id="examples"
							className="mt-0 space-y-6"
						>
							<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
								<h2 className="text-2xl font-bold text-foreground mb-4">
									Schema & Interpolation Examples
								</h2>
								<div className="flex items-center justify-between gap-3 mb-6">
									<p className="text-muted-foreground">
										Drop these schemas into a mock&apos;s JSON Schema field when
										dynamic responses are enabled. Mockzilla will use
										json-schema-faker + Faker plus its own interpolation engine
										to generate fresh data on each request.
									</p>
									<SchemaTesterDialog />
								</div>

								<div className="space-y-6">
									<div className="border rounded-lg p-4">
										<h3 className="font-semibold mb-2">
											1. Simple Faker-Powered List
										</h3>
										<p className="text-sm text-muted-foreground mb-3">
											Generate an array of users with realistic names and
											avatars.
										</p>
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
										<h3 className="font-semibold mb-2">
											2. Referencing Another Field with {`{$.path}`}
										</h3>
										<p className="text-sm text-muted-foreground mb-3">
											Use JSONPath-style syntax to reuse generated values in
											other strings. References are resolved after the full JSON
											is generated.
										</p>
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

									<div className="border rounded-lg p-4">
										<h3 className="font-semibold mb-2">
											3. Coherent User Profile with Interpolation
										</h3>
										<p className="text-sm text-muted-foreground mb-3">
											Generate a name once, then build username, email, and bio
											from it using interpolation handled by the schema
											generator.
										</p>
										<pre className="bg-muted p-3 rounded text-xs font-mono overflow-auto">
											{`{
  "type": "object",
  "properties": {
    "firstName": {
      "type": "string",
      "faker": "person.firstName"
    },
    "lastName": {
      "type": "string",
      "faker": "person.lastName"
    },
    "username": {
      "type": "string",
      "pattern": "{{$.firstName}}.{{$.lastName}}"
    },
    "email": {
      "type": "string",
      "pattern": "{{$.firstName}}.{{$.lastName}}@example.com"
    },
    "bio": {
      "type": "string",
      "pattern": "Hi, I'm {$.firstName} {$.lastName}. I love coding!"
    }
  },
  "required": ["firstName", "lastName", "username", "email"]
}`}
										</pre>
									</div>

									<div className="border rounded-lg p-4">
										<h3 className="font-semibold mb-2">
											4. Reuse a Stored ID with Templates
										</h3>
										<p className="text-sm text-muted-foreground mb-3">
											Generate a value once and reference it in multiple fields
											using {`{$.path}`} interpolation.
										</p>
										<pre className="bg-muted p-3 rounded text-xs font-mono overflow-auto">
											{`{
  "type": "object",
  "properties": {
    "userId": {
      "type": "string",
      "format": "uuid"
    },
    "createdBy": {
      "const": "{$.userId}"
    },
    "modifiedBy": {
      "const": "{$.userId}"
    }
  }
}`}
										</pre>
									</div>
								</div>
							</Card>
						</TabsContent>

						<TabsContent
							value="workflows"
							id="workflows"
							className="mt-0 space-y-6"
						>
							<WorkflowDocs />
						</TabsContent>

						<TabsContent value="advanced" id="advanced" className="mt-0">
							<Card className="p-6 border-dashed">
								<p className="text-center text-muted-foreground">
									Advanced documentation is being updated.
								</p>
							</Card>
						</TabsContent>

						<TabsContent value="mcp" id="mcp" className="mt-0">
							<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
								<h2 className="text-2xl font-bold text-foreground mb-4">
									MCP Integration
								</h2>
								<p className="text-muted-foreground mb-4">
									Mockzilla exposes a Model Context Protocol server, allowing AI
									agents to fully control mocking.
								</p>
								<div className="bg-muted p-4 rounded-lg">
									<h3 className="font-bold text-sm mb-2">Available Tools</h3>
									<ul className="list-disc pl-4 text-sm space-y-1">
										<li>
											<code>create_mock</code> - Create new endpoints
										</li>
										<li>
											<code>create_workflow_transition</code> - Define workflow
											rules
										</li>
										<li>
											<code>inspect_workflow_state</code> - Read scenario state
										</li>
										<li>
											<code>reset_workflow_state</code> - Clear scenario data
										</li>
									</ul>
								</div>
							</Card>
							{/* Installation Section */}
							<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6 mt-3">
								<div className="flex items-center gap-3 mb-6">
									<div className="p-2 bg-primary/10 rounded-lg">
										<Braces className="h-6 w-6 text-primary" />
									</div>
									<div>
										<h2 className="text-2xl font-bold text-foreground">
											Installation & Setup
										</h2>
										<p className="text-muted-foreground">
											Configure Mockzilla with MCP server for advanced workflow
											capabilities.
										</p>
									</div>
								</div>

								<div className="space-y-4">
									<h3 className="font-semibold text-lg text-foreground">
										MCP Server Configuration
									</h3>
									<p className="text-sm text-muted-foreground">
										Add this configuration to your project's settings to connect
										Mockzilla with the MCP server:
									</p>
									<pre className="bg-muted p-4 rounded text-xs font-mono overflow-x-auto">
										{`{
  "mockzilla": {
    "command": "npx",
    "args": [
      "-y",
      "mcp-remote",
      "http://localhost:36666/api/mcp" # MCP server endpoint
    ]
  }
}`}
									</pre>
									<p className="text-sm text-muted-foreground">
										This configuration enables the MCP server to handle advanced
										tools with AI on port 36666 (locally) or using your own DNS.
									</p>
								</div>
							</Card>
						</TabsContent>
					</main>
				</Tabs>
			</div>
		</div>
	);
}
