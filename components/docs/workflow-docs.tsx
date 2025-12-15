'use client';

import { Box, Braces, Database, Lightbulb, Workflow } from 'lucide-react';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';

export function WorkflowDocs() {
	return (
		<div className="space-y-6">
			{/* Motivation Section */}
			<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
				<div className="flex items-center gap-3 mb-6">
					<div className="p-2 bg-primary/10 rounded-lg">
						<Lightbulb className="h-6 w-6 text-primary" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-foreground">
							Why Workflow Mode?
						</h2>
						<p className="text-muted-foreground">
							Go beyond static mocks. Build stateful, intelligent API
							simulations.
						</p>
					</div>
				</div>

				<div className="grid md:grid-cols-2 gap-6 mb-6">
					<div className="space-y-3">
						<h3 className="font-semibold text-lg flex items-center gap-2">
							<span className="text-muted-foreground line-through">
								Static Mocks
							</span>
							<span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
								The Old Way
							</span>
						</h3>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li className="flex gap-2">❌ Always returns the same JSON.</li>
							<li className="flex gap-2">❌ No memory of previous requests.</li>
							<li className="flex gap-2">
								❌ Impossible to test logical flows (e.g. Empty Cart vs Full
								Cart).
							</li>
						</ul>
					</div>
					<div className="space-y-3">
						<h3 className="font-semibold text-lg flex items-center gap-2">
							<span className="text-primary">Workflow Mode</span>
							<span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
								The New Way
							</span>
						</h3>
						<ul className="space-y-2 text-sm">
							<li className="flex gap-2">
								✅ <strong className="text-foreground">Stateful:</strong>{' '}
								Remembers logic variables (isLoggedIn, cartCount).
							</li>
							<li className="flex gap-2">
								✅ <strong className="text-foreground">Dynamic:</strong> CRUD
								operations on an in-memory database.
							</li>
							<li className="flex gap-2">
								✅ <strong className="text-foreground">Smart:</strong> Responses
								change based on input or state.
							</li>
						</ul>
					</div>
				</div>
			</Card>

			{/* Core Concepts Breakdown */}
			<div className="grid md:grid-cols-3 gap-4">
				<Card className="p-4 bg-card border-l-4 border-l-blue-500">
					<h3 className="font-bold mb-2 flex items-center gap-2">
						<Box className="h-4 w-4 text-blue-500" />
						Scenario
					</h3>
					<p className="text-xs text-muted-foreground">
						A named container (e.g. "auth-flow"). It holds all your state and variables in isolation.
					</p>
				</Card>
				<Card className="p-4 bg-card border-l-4 border-l-green-500">
					<h3 className="font-bold mb-2 flex items-center gap-2">
						<Workflow className="h-4 w-4 text-green-500" />
						Transition
					</h3>
					<p className="text-xs text-muted-foreground">
						A rule: "WHEN a request matches X, THEN do Y and return Z".
					</p>
				</Card>
				<Card className="p-4 bg-card border-l-4 border-l-purple-500">
					<h3 className="font-bold mb-2 flex items-center gap-2">
						<Database className="h-4 w-4 text-purple-500" />
						Mini-DB
					</h3>
					<p className="text-xs text-muted-foreground">
						A temporary database for each scenario. Push items, query them, and update them.
					</p>
				</Card>
			</div>

			<h3 className="text-xl font-bold mt-8 mb-4">Deep Dive: Core Concepts</h3>
			<Accordion type="single" collapsible className="space-y-4">
				<AccordionItem value="wf-transitions">
					<AccordionTrigger>Transitions & Conditions</AccordionTrigger>
					<AccordionContent>
						<div className="space-y-4 pt-2">
							<p className="text-sm text-muted-foreground">
								A transition links an incoming request to effects and a response.
							</p>
							
							<div className="border rounded-lg p-4 bg-muted/20">
								<h4 className="font-semibold text-sm mb-3">Condition Builder</h4>
								<div className="grid grid-cols-2 gap-4 text-xs">
									<div>
										<span className="block font-medium mb-1">Selectors</span>
										<ul className="space-y-1 font-mono text-muted-foreground">
											<li>input.body.field</li>
											<li>input.query.param</li>
											<li>input.headers.auth</li>
											<li>input.params.id</li>
										</ul>
									</div>
									<div>
										<span className="block font-medium mb-1">Operators</span>
										<ul className="space-y-1 font-mono text-muted-foreground">
											<li>==, !=</li>
											<li>&gt;, &lt;, &gt;=, &lt;=</li>
											<li>exists</li>
											<li>contains</li>
										</ul>
									</div>
								</div>
							</div>

							<div className="bg-blue-500/10 p-3 rounded-md text-sm border border-blue-500/20">
								<span className="font-semibold block mb-1 text-blue-500">
									Pro Tip: Shorthand Access
								</span>
								<p className="text-xs text-muted-foreground">
									You can omit <code>input.body</code> for top-level body
									fields. <br/>
									<code>amount &gt; 100</code> is the same as <code>input.body.amount &gt; 100</code>.
								</p>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="wf-interpolation">
					<AccordionTrigger>Dynamic Responses & Interpolation</AccordionTrigger>
					<AccordionContent>
						<div className="space-y-4 pt-2">
							<p className="text-sm text-muted-foreground">
								Inject data into your response using <code>{`{{ var }}`}</code>{' '}
								syntax.
							</p>
							<div className="grid gap-2 text-sm">
								<div className="border p-2 rounded flex justify-between items-center">
									<span className="font-mono text-xs text-primary">{`{{ input.body.id }}`}</span>
									<span className="text-xs text-muted-foreground">Echo request data</span>
								</div>
								<div className="border p-2 rounded flex justify-between items-center">
									<span className="font-mono text-xs text-primary">{`{{ state.token }}`}</span>
									<span className="text-xs text-muted-foreground">Return stored variable</span>
								</div>
								<div className="border p-2 rounded flex justify-between items-center">
									<span className="font-mono text-xs text-primary">{`{{ db.users }}`}</span>
									<span className="text-xs text-muted-foreground">Return full table</span>
								</div>
								<div className="border p-2 rounded flex justify-between items-center">
									<span className="font-mono text-xs text-primary">{`{{ db.cart.length }}`}</span>
									<span className="text-xs text-muted-foreground">Table count</span>
								</div>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6 mt-8">
				<h2 className="text-xl font-bold text-foreground mb-4">
					Example: Users CRUD Journey
				</h2>
				<div className="space-y-6">
					
					{/* Create */}
					<div className="relative border-l-2 border-primary pl-6 pb-2">
						<div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary" />
						<div className="mb-2">
							<span className="text-xs font-bold bg-primary/20 text-primary px-2 py-1 rounded">POST /users</span>
						</div>
						<div className="bg-muted p-4 rounded-lg text-xs font-mono">
							<span className="text-gray-500 block mb-1">{`// Effect: Store user in DB`}</span>
							{`{ "type": "db.push", "table": "users", "value": "{{ input.body }}" }`}
							
							<span className="text-gray-500 block mt-3 mb-1">{`// Response`}</span>
							{`{ "id": "{{ input.body.id }}", "status": "created" }`}
						</div>
					</div>

					{/* Read */}
					<div className="relative border-l-2 border-primary/50 pl-6 pb-2">
						<div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary/50" />
						<div className="mb-2">
							<span className="text-xs font-bold bg-muted text-foreground px-2 py-1 rounded">GET /users</span>
						</div>
						<div className="bg-muted p-4 rounded-lg text-xs font-mono">
							<span className="text-gray-500 block mb-1">{`// Response: Return all users`}</span>
							{`{{ db.users }}`}
						</div>
					</div>

					{/* Update */}
					<div className="relative border-l-2 border-primary/30 pl-6 pb-2">
						<div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary/30" />
						<div className="mb-2">
							<span className="text-xs font-bold bg-muted text-foreground px-2 py-1 rounded">PUT /users/:id</span>
						</div>
						<div className="bg-muted p-4 rounded-lg text-xs font-mono">
							<span className="text-gray-500 block mb-1">{`// Effect: Find by ID and update`}</span>
							{`{ 
  "type": "db.update", 
  "table": "users", 
  "match": { "id": "{{ input.params.id }}" }, 
  "set": "{{ input.body }}" 
}`}
						</div>
					</div>

					{/* Delete */}
					<div className="relative border-l-2 border-primary/10 pl-6">
						<div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary/10" />
						<div className="mb-2">
							<span className="text-xs font-bold bg-muted text-foreground px-2 py-1 rounded">DELETE /users/:id</span>
						</div>
						<div className="bg-muted p-4 rounded-lg text-xs font-mono">
							<span className="text-gray-500 block mb-1">{`// Effect: Remove from DB`}</span>
							{`{ 
  "type": "db.remove", 
  "table": "users", 
  "match": { "id": "{{ input.params.id }}" } 
}`}
						</div>
					</div>

				</div>
			</Card>

			{/* Debugging Tip */}
			<div className="mt-8 p-4 border border-dashed rounded-lg bg-orange-500/5 border-orange-500/20">
				<h4 className="font-bold text-sm text-orange-600 mb-2 flex items-center gap-2">
					<Lightbulb className="h-4 w-4" />
					Debugging Tips
				</h4>
				<ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
					<li>Use the <strong>Inspect State</strong> tool in the MCP server to see what's currently in your properties.</li>
					<li>If a condition isn't triggering, check if you are using the correct type (string vs number) in your comparison.</li>
					<li>Remember that <code>input.params</code> comes from the URL path (e.g. <code>:id</code>), while <code>input.query</code> comes from <code>?id=...</code>.</li>
				</ul>
			</div>
		</div>
	);
}
