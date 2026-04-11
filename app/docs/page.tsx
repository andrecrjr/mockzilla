import {
	AlertCircle,
	BookOpen,
	Braces,
	Code2,
	Database,
	Lightbulb,
	Workflow,
	GitBranch,
} from 'lucide-react';
import Link from 'next/link';
import { ExtensionDocs } from '@/components/docs/extension-docs';
import { SchemaDocs } from '@/components/docs/schema-docs';
import { SchemaTesterDialog } from '@/components/docs/schema-tester-dialog';
import { WorkflowDocs } from '@/components/docs/workflow-docs';
import { Card } from '@/components/ui/card';

function WildcardVariantsDocs() {
	return (
		<div className="space-y-6">
			<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
				<div className="flex items-center gap-3 mb-6">
					<div className="p-2 bg-accent/10 rounded-lg">
						<GitBranch className="h-6 w-6 text-accent" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-foreground">
							Wildcard Variants
						</h2>
						<p className="text-muted-foreground">
							One endpoint, multiple responses — keyed by URL segments.
						</p>
					</div>
				</div>

				<div className="space-y-6">
					<div className="space-y-3">
						<h3 className="font-semibold text-lg">How It Works</h3>
						<p className="text-sm text-muted-foreground">
							When you create a <strong>Wildcard</strong> mock with a pattern like{' '}
							<code className="px-1.5 py-0.5 bg-muted rounded text-xs">
								/users/*
							</code>
							, each{' '}
							<code className="px-1.5 py-0.5 bg-muted rounded text-xs">*</code>{' '}
							captures a segment of the URL. The captured value becomes the{' '}
							<strong>capture key</strong>, which is matched against your variants
							table to return the right response.
						</p>
					</div>

					{/* Capture Key Examples */}
					<div className="border rounded-lg p-5">
						<h3 className="font-semibold mb-3">Capture Key Examples</h3>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b">
										<th className="text-left py-2 px-3 text-muted-foreground font-medium">
											Endpoint
										</th>
										<th className="text-left py-2 px-3 text-muted-foreground font-medium">
											Request URL
										</th>
										<th className="text-left py-2 px-3 text-muted-foreground font-medium">
											Capture Key
										</th>
									</tr>
								</thead>
								<tbody>
									<tr className="border-b">
										<td className="py-2 px-3 font-mono text-xs">
											/users/*
										</td>
										<td className="py-2 px-3 font-mono text-xs">
											/users/123
										</td>
										<td className="py-2 px-3 font-mono text-xs">123</td>
									</tr>
									<tr className="border-b">
										<td className="py-2 px-3 font-mono text-xs">
											/users/*/posts/*
										</td>
										<td className="py-2 px-3 font-mono text-xs">
											/users/alice/posts/42
										</td>
										<td className="py-2 px-3 font-mono text-xs">alice|42</td>
									</tr>
									<tr>
										<td className="py-2 px-3 font-mono text-xs">
											/api/*/status/*
										</td>
										<td className="py-2 px-3 font-mono text-xs">
											/api/bob/status/active
										</td>
										<td className="py-2 px-3 font-mono text-xs">bob|active</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>

					{/* Wildcard Fallback */}
					<div className="border rounded-lg p-5 border-accent/20 bg-accent/5">
						<h3 className="font-semibold mb-2 flex items-center gap-2">
							<Lightbulb className="h-4 w-4 text-yellow-500" />
							Wildcard Catch-All Variant (<code>*</code> Key)
						</h3>
						<p className="text-sm text-muted-foreground mb-3">
							Use <code className="px-1.5 py-0.5 bg-muted rounded text-xs">*</code>{' '}
							as a variant key to create a <strong>fallback</strong> response. When
							no exact capture key matches, Mockzilla falls back to this variant.
							Exact matches always take priority.
						</p>
						<div className="grid md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<p className="text-xs font-semibold text-muted-foreground">
									Variants Config
								</p>
								<pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-auto">
									{`[
  { "key": "1",   "body": {"name":"Alice"} },
  { "key": "2",   "body": {"name":"Bob"}   },
  { "key": "*",   "body": {"error":"Not found"} }
]`}
								</pre>
							</div>
							<div className="space-y-2">
								<p className="text-xs font-semibold text-muted-foreground">
									Request → Response
								</p>
								<pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-auto">
									{`/users/1   → {"name":"Alice"}
/users/2   → {"name":"Bob"}
/users/999 → {"error":"Not found"}  ← fallback`}
								</pre>
							</div>
						</div>
					</div>

					{/* Require Match */}
					<div className="border rounded-lg p-5">
						<h3 className="font-semibold mb-2">Require Match Toggle</h3>
						<p className="text-sm text-muted-foreground mb-3">
							When <strong>Require Match</strong> is enabled, unmatched URLs
							return a <code className="px-1.5 py-0.5 bg-muted rounded text-xs">
								404
							</code>{' '}
							instead of falling through to the base mock response. This is useful
							for strict validation — e.g., only known IDs should be served.
						</p>
						<div className="grid md:grid-cols-2 gap-4">
							<div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
								<p className="text-xs font-semibold text-green-400 mb-1">
									Require Match OFF (default)
								</p>
								<p className="text-xs text-muted-foreground">
									No match → serve base mock body
								</p>
							</div>
							<div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
								<p className="text-xs font-semibold text-red-400 mb-1">
									Require Match ON
								</p>
								<p className="text-xs text-muted-foreground">
									No match → 404 Not Found
								</p>
							</div>
						</div>
					</div>

					{/* Full Example */}
					<div className="border rounded-lg p-5">
						<h3 className="font-semibold mb-3">
							Complete Example: User Lookup with Fallback
						</h3>
						<div className="bg-[#1e1e1e] text-white p-4 rounded-lg overflow-x-auto shadow-inner">
							<pre className="text-xs font-mono leading-relaxed">
								{`Endpoint:  /users/*
Match:     Wildcard
Require:   OFF

Variants:
  key "1"   → {"id":1,"name":"Alice","role":"admin"}
  key "2"   → {"id":2,"name":"Bob","role":"user"}
  key "*"   → {"error":"User not found","code":404}

Results:
  GET /api/mock/myfolder/users/1   → Alice (admin)
  GET /api/mock/myfolder/users/2   → Bob (user)
  GET /api/mock/myfolder/users/999 → 404 fallback`}
							</pre>
						</div>
					</div>

					{/* Chrome Extension Parity */}
					<div className="border rounded-lg p-5 border-primary/20 bg-primary/5">
						<h3 className="font-semibold mb-2">Chrome Extension Parity</h3>
						<p className="text-sm text-muted-foreground">
							The same wildcard variant logic works in both the Mockzilla server
							and the Chrome extension. Variants synced from the extension are
							preserved with their capture keys, and the <code className="px-1.5 py-0.5 bg-muted rounded text-xs">*</code> fallback works identically on both sides.
						</p>
					</div>
				</div>
			</Card>
		</div>
	);
}

export default function DocsPage() {
	return (
		<div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen">
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="flex flex-col md:flex-row gap-8">
					{/* Sidebar Navigation */}
					<div className="w-full md:w-64 flex-shrink-0">
						<div className="sticky top-24">
							<div className="flex items-center gap-2 mb-6">
								<BookOpen className="h-5 w-5 text-primary" />
								<h1 className="text-xl font-bold tracking-tight">
									Documentation
								</h1>
							</div>

							<nav className="bg-transparent p-0 flex flex-col h-auto items-stretch space-y-1">
								<div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
									Getting Started
								</div>
								<Link
									href="#overview"
									className="justify-start px-2 py-1.5 h-auto text-sm font-medium rounded-md transition-colors hover:bg-muted"
								>
									Overview
								</Link>
								<Link
									href="#syntax"
									className="justify-start px-2 py-1.5 h-auto text-sm font-medium rounded-md transition-colors hover:bg-muted"
								>
									Schema & Data
								</Link>
								<Link
									href="#wildcard-variants"
									className="justify-start px-2 py-1.5 h-auto text-sm font-medium rounded-md transition-colors hover:bg-muted"
								>
									Wildcard Variants
								</Link>
								<Link
									href="#examples"
									className="justify-start px-2 py-1.5 h-auto text-sm font-medium rounded-md transition-colors hover:bg-muted"
								>
									Examples
								</Link>

								<div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 mt-4">
									Advanced
								</div>
								<Link
									href="#workflows"
									className="justify-start px-2 py-1.5 h-auto text-sm font-medium rounded-md transition-colors hover:bg-muted"
								>
									Workflow Mode
								</Link>
								<Link
									href="#extension"
									className="justify-start px-2 py-1.5 h-auto text-sm font-medium rounded-md transition-colors hover:bg-muted"
								>
									Extension Sync
								</Link>
								<Link
									href="#mcp"
									className="justify-start px-2 py-1.5 h-auto text-sm font-medium rounded-md transition-colors hover:bg-muted"
								>
									MCP Integration
								</Link>
							</nav>
						</div>
					</div>

					{/* Main Content */}
					<main className="flex-1 min-w-0">
						<section id="overview" className="mt-0 space-y-6 scroll-mt-24">
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

							<div className="space-y-4">
								<details className="group border rounded-lg p-4 bg-card/50">
									<summary className="cursor-pointer list-none font-medium flex items-center justify-between">
										<span>Why use Mockzilla over straightforward mocks?</span>
										<AlertCircle className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
									</summary>
									<div className="mt-2 text-sm text-muted-foreground">
										Mockzilla allows for dynamic responses and stateful
										scenarios, which lets you test complex interactions even
										when backend APIs aren't ready.
									</div>
								</details>
							</div>
						</section>

						<section id="syntax" className="mt-0 space-y-6 scroll-mt-24">
							<SchemaDocs />
						</section>

						<section id="wildcard-variants" className="mt-0 space-y-6 scroll-mt-24">
							<WildcardVariantsDocs />
						</section>

						<section id="examples" className="mt-0 space-y-6 scroll-mt-24">
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
						</section>

						<section id="workflows" className="mt-0 space-y-6 scroll-mt-24">
							<WorkflowDocs />
						</section>
			
						<section id="extension" className="mt-0 space-y-6 scroll-mt-24">
							<ExtensionDocs />
						</section>


						<section id="mcp" className="mt-0 scroll-mt-24">
							<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
								<h2 className="text-2xl font-bold text-foreground mb-4">
									MCP Integration
								</h2>
								<p className="text-muted-foreground mb-4">
									Mockzilla exposes a Model Context Protocol server, allowing AI
									agents to fully control mocking.
								</p>
								<div className="bg-muted p-4 rounded-lg">
									<h3 className="font-bold text-sm mb-4">Available Tools</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Folders & Mocks</h4>
											<ul className="list-disc pl-4 text-sm space-y-1">
												<li><code>list_folders</code>, <code>create_folder</code>, <code>get_folder</code></li>
												<li><code>update_folder</code>, <code>delete_folder</code></li>
												<li><code>list_mocks</code>, <code>get_mock</code>, <code>delete_mock</code></li>
												<li><code>create_mock</code>, <code>update_mock</code></li>
												<li><code>create_schema_mock</code> (Advanced)</li>
												<li><code>preview_mock</code></li>
											</ul>
										</div>
										<div>
											<h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Workflows & State</h4>
											<ul className="list-disc pl-4 text-sm space-y-1">
												<li><code>list_workflow_scenarios</code></li>
												<li><code>create_workflow_scenario</code>, <code>delete_workflow_scenario</code></li>
												<li><code>list_workflow_transitions</code>, <code>get_workflow_transition</code></li>
												<li><code>create_workflow_transition</code>, <code>update_workflow_transition</code></li>
												<li><code>delete_workflow_transition</code></li>
												<li><code>inspect_workflow_state</code>, <code>reset_workflow_state</code></li>
												<li><code>test_workflow</code>, <code>export_workflow</code>, <code>import_workflow</code></li>
											</ul>
										</div>
									</div>
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

								<div className="space-y-6">
									<div>
										<h3 className="font-semibold text-lg text-foreground mb-2">
											Option 1: Direct URL (Streamable HTTP)
										</h3>
										<p className="text-sm text-muted-foreground mb-4">
											Mockzilla uses the <strong>WebStandardStreamableHTTPServerTransport</strong>. For modern clients that support the MCP Streamable HTTP protocol, you can connect directly using only the endpoint URL.
										</p>
										<div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
											<div className="flex items-center justify-between">
												<code className="text-sm font-bold text-primary">
													http://localhost:36666/api/mcp
												</code>
											</div>
										</div>
										<p className="text-xs text-muted-foreground mt-2 italic">
											Recommended for Cursor, internal agents, and modern MCP explorers.
										</p>
									</div>

									<div className="border-t pt-6">
										<h3 className="font-semibold text-lg text-foreground mb-2">
											Option 2: Stdio Bridge (mcp-remote)
										</h3>
										<p className="text-sm text-muted-foreground mb-4">
											For clients that primarily support local <code>stdio</code> servers (like Claude Desktop), use <code>mcp-remote</code> as a bridge to the remote server.
										</p>
										<pre className="bg-muted p-4 rounded text-xs font-mono overflow-x-auto">
											{`{
  "mockzilla": {
    "command": "npx",
    "args": [
      "-y",
      "mcp-remote",
      "http://localhost:36666/api/mcp"
    ]
  }
}`}
										</pre>
									</div>
								</div>
							</Card>
						</section>
					</main>
				</div>
			</div>
		</div>
	);
}
