import {
	Braces,
	Code2,
	FileJson,
	Lightbulb,
	Link as LinkIcon,
	RefreshCw,
	Variable,
} from 'lucide-react';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';

export function SchemaDocs() {
	return (
		<div className="space-y-6">
			{/* Intro Section */}
			<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
				<div className="flex items-center gap-3 mb-6">
					<div className="p-2 bg-primary/10 rounded-lg">
						<FileJson className="h-6 w-6 text-primary" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-foreground">
							Schema & Data Generation
						</h2>
						<p className="text-muted-foreground">
							Master the art of dynamic mocking with JSON Schema, Faker.js, and
							Mockzilla's powerful extensions. Paste these schemas into a
							mock&apos;s JSON Schema field when dynamic responses are enabled.
						</p>
					</div>
				</div>

				<div className="grid md:grid-cols-2 gap-6">
					<div className="space-y-4">
						<h3 className="font-semibold text-lg flex items-center gap-2">
							<Code2 className="h-4 w-4 text-primary" />
							The Foundation
						</h3>
						<div className="space-y-2 text-sm text-muted-foreground">
							<p>
								Mockzilla uses{' '}
								<a
									href="https://json-schema.org/"
									target="_blank"
									rel="noopener noreferrer"
									className="underline hover:text-foreground"
								>
									JSON Schema
								</a>{' '}
								plus{' '}
								<a
									href="https://raw.githubusercontent.com/json-schema-faker/json-schema-faker/refs/heads/master/docs/USAGE.md"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 underline hover:text-foreground"
								>
									json-schema-faker
									<LinkIcon className="h-3 w-3" />
								</a>{' '}
								to turn schemas into example payloads.
							</p>
							<p>
								If a schema is valid for json-schema-faker, it will generally
								work in Mockzilla. You can then layer on the extensions below
								for cross-field consistency.
							</p>
						</div>
					</div>
					<div className="space-y-4">
						<h3 className="font-semibold text-lg flex items-center gap-2">
							<RefreshCw className="h-4 w-4 text-primary" />
							The Randomness
						</h3>
						<p className="text-sm text-muted-foreground">
							We wire{' '}
							<a
								href="https://fakerjs.dev/"
								target="_blank"
								rel="noopener noreferrer"
								className="underline hover:text-foreground"
							>
								Faker.js
							</a>{' '}
							into json-schema-faker. Use the <code>faker</code> keyword (for
							example <code>"faker": "internet.email"</code>) to produce
							realistic test data.
						</p>
					</div>
				</div>
			</Card>

			{/* Core Syntax */}
			<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
				<h2 className="text-xl font-bold mb-4 flex items-center gap-2">
					<Braces className="h-5 w-5 text-accent" />
					Core Syntax
				</h2>

				<Accordion type="single" collapsible className="space-y-4">
					<AccordionItem value="faker">
						<AccordionTrigger>Using Faker.js</AccordionTrigger>
						<AccordionContent>
							<div className="space-y-4 pt-2">
								<p className="text-sm text-muted-foreground">
									Add a <code>faker</code> property to your schema to tell
									json-schema-faker which Faker method to call.
								</p>
								<div className="grid md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<p className="text-xs font-semibold text-muted-foreground">
											Schema
										</p>
										<pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-auto">
											{`{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "faker": "person.fullName"
    },
    "email": {
      "type": "string",
      "faker": "internet.email"
    }
  },
  "required": ["name", "email"]
}`}
										</pre>
									</div>
									<div className="space-y-2">
										<p className="text-xs font-semibold text-muted-foreground">
											Generated Output
										</p>
										<pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-auto">
											{`{
  "name": "Jane Doe",
  "email": "jane.doe@example.com"
}`}
										</pre>
									</div>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					<AccordionItem value="jsf-features">
						<AccordionTrigger>JSON Schema Faker Features</AccordionTrigger>
						<AccordionContent>
							<div className="space-y-4 pt-2">
								<p className="text-sm text-muted-foreground">
									Mockzilla uses <code>json-schema-faker v0.5.9</code> which
									primarily supports <strong>JSON Schema Draft-04</strong>. It
									comes pre-configured with options for better data generation.
								</p>
								<div className="grid md:grid-cols-2 gap-6">
									<div className="space-y-3">
										<h4 className="text-sm font-semibold">Configured Options</h4>
										<ul className="text-xs space-y-2 text-muted-foreground list-disc pl-4">
											<li>
												<code>alwaysFakeOptionals: true</code> — Always
												generates optional fields.
											</li>
											<li>
												<code>useDefaultValue: true</code> — Uses{' '}
												<code>default</code> values from schema.
											</li>
											<li>
												<code>useExamplesValue: true</code> — Picks random value from{' '}
												<code>examples</code> array.
											</li>
											<li>
												<code>minItems: 1</code> — At least one item in arrays.
											</li>
										</ul>
									</div>
									<div className="space-y-3">
										<h4 className="text-sm font-semibold">Passing Arguments</h4>
										<p className="text-xs text-muted-foreground">
											Pass arguments to Faker methods using an array:
										</p>
										<pre className="bg-muted p-3 rounded-lg text-[10px] font-mono overflow-auto">
											{`{
  "faker": {
    "finance.amount": [100, 1000, 2, "$"]
  }
}`}
										</pre>
									</div>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>

					<AccordionItem value="referencing">
						<AccordionTrigger>Referring to Other Fields</AccordionTrigger>
						<AccordionContent>
							<div className="space-y-4 pt-2">
								<p className="text-sm text-muted-foreground">
									Use the <code>{`{$.path.to.field}`}</code> syntax to reference
									values generated elsewhere in the same document. Mockzilla
									resolves these templates after json-schema-faker finishes.
								</p>
								<div className="bg-blue-500/10 p-3 rounded-md border border-blue-500/20 mb-4">
									<p className="text-xs text-blue-500">
										<strong>Note:</strong> When a <code>pattern</code> contains{' '}
										<code>{`{$.`}</code> or <code>{`{{$.`}</code>, Mockzilla
										treats it as a template string instead of a regular
										expression.
									</p>
								</div>

								<div className="grid md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<p className="text-xs font-semibold text-muted-foreground">
											Schema
										</p>
										<pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-auto">
											{`{
  "type": "object",
  "properties": {
    "user": {
      "type": "object",
      "properties": {
        "firstName": { "type": "string", "faker": "person.firstName" }
      },
      "required": ["firstName"]
    },
    "message": {
      "type": "string",
      "pattern": "Hello {$.user.firstName}, welcome back!"
    }
  },
  "required": ["user", "message"]
}`}
										</pre>
									</div>
									<div className="space-y-2">
										<p className="text-xs font-semibold text-muted-foreground">
											Generated Output
										</p>
										<pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-auto">
											{`{
  "user": {
    "firstName": "Lucas"
  },
  "message": "Hello Lucas, welcome back!"
}`}
										</pre>
									</div>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</Card>

			<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
				<div className="flex items-center gap-3 mb-6">
					<div className="p-2 bg-accent/10 rounded-lg">
						<Variable className="h-6 w-6 text-accent" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-foreground">
							Interpolation Patterns
						</h2>
						<p className="text-muted-foreground">
							Compose consistent payloads using only <code>{`{$.path}`}</code>{' '}
							templates on top of json-schema-faker.
						</p>
					</div>
				</div>

				<div className="grid gap-6">
					<div className="border rounded-lg p-5">
						<h3 className="font-bold flex items-center gap-2 mb-3">
							<LinkIcon className="h-4 w-4 text-primary" />
							Reuse IDs Across Fields
						</h3>
						<p className="text-sm text-muted-foreground mb-4">
							Generate a value once, then reference it anywhere else in the
							document. You can also access array items like <code>{`{$.items[0].id}`}</code>.
						</p>
						<div className="grid md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<p className="text-xs font-semibold text-muted-foreground">
									Schema
								</p>
								<pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-auto">
									{`{
  "type": "object",
  "properties": {
    "transactionId": {
      "type": "string",
      "format": "uuid"
    },
    "orderId": {
      "const": "{$.transactionId}"
    },
    "receiptId": {
      "const": "{$.transactionId}"
    }
  }
}`}
								</pre>
							</div>
							<div className="space-y-2">
								<p className="text-xs font-semibold text-muted-foreground">
									Generated Output
								</p>
								<pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-auto">
									{`{
  "transactionId": "50f2c2f3-3a2e-4f5b-9a1e-123456789abc",
  "orderId": "50f2c2f3-3a2e-4f5b-9a1e-123456789abc",
  "receiptId": "50f2c2f3-3a2e-4f5b-9a1e-123456789abc"
}`}
								</pre>
							</div>
						</div>
					</div>

					<div className="border rounded-lg p-5">
						<h3 className="font-bold flex items-center gap-2 mb-3">
							<Lightbulb className="h-4 w-4 text-yellow-500" />
							Human-Friendly Summaries
						</h3>
						<p className="text-sm text-muted-foreground mb-4">
							Combine multiple generated fields into one readable string.
						</p>
						<pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-auto">
							{`{
  "type": "object",
  "properties": {
    "orderId": {
      "type": "string",
      "format": "uuid"
    },
    "status": {
      "enum": ["pending", "shipped", "delivered"]
    },
    "summary": {
      "const": "Order {$.orderId} is currently {$.status}"
    }
  }
}`}
						</pre>
					</div>
				</div>
			</Card>

			{/* Real World Examples */}
			<div className="space-y-6">
				<h2 className="text-xl font-bold flex items-center gap-2 px-2">
					<Code2 className="h-5 w-5" />
					Real-World Recipes
				</h2>
				<p className="text-sm text-muted-foreground px-2">
					Use these patterns as starting points for common API shapes. Each
					schema can back a mock endpoint; Mockzilla will generate a fresh body
					on every request.
				</p>

				{/* Example 1: Consistent Order Data */}
				<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6 overflow-hidden">
					<h3 className="text-lg font-bold mb-2">
						1. Relational Consistency: Order & Line Items
					</h3>
					<p className="text-sm text-muted-foreground mb-4">
						Generate an order ID once and reuse it across line items and summary
						using JSONPath-style references.
					</p>

					<div className="bg-[#1e1e1e] text-white p-4 rounded-lg overflow-x-auto shadow-inner">
						<pre className="text-xs font-mono leading-relaxed">
							{`{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "reference": {
      "type": "string",
      "pattern": "REF-{$.id}"
    },
    "items": {
      "type": "array",
      "minItems": 2,
      "maxItems": 2,
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "product": { "type": "string", "faker": "commerce.productName" },
          "orderId": {
            "type": "string",
            "pattern": "{$.id}"
          }
        },
        "required": ["id", "product", "orderId"]
      }
    },
    "summary": {
      "type": "string",
      "pattern": "Summary for Order {$.id}: {$.items[0].product}, {$.items[1].product}"
    }
  },
  "required": ["id", "items", "summary"]
}`}
						</pre>
					</div>
				</Card>

				{/* Example 3: Paginated List */}
				<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6 overflow-hidden">
					<h3 className="text-lg font-bold mb-2">3. Paginated List Endpoint</h3>
					<p className="text-sm text-muted-foreground mb-4">
						Shape a typical paginated list response for endpoints like
						<code className="mx-1">GET /users</code> or
						<code className="mx-1">GET /orders</code>.
					</p>

					<div className="bg-[#1e1e1e] text-white p-4 rounded-lg overflow-x-auto shadow-inner">
						<pre className="text-xs font-mono leading-relaxed">
							{`{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "minItems": 3,
      "maxItems": 10,
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "faker": "string.uuid" },
          "name": { "type": "string", "faker": "person.fullName" },
          "email": { "type": "string", "faker": "internet.email" }
        },
        "required": ["id", "name", "email"]
      }
    },
    "page": { "type": "integer", "minimum": 1, "maximum": 5 },
    "pageSize": { "type": "integer", "minimum": 10, "maximum": 50 },
    "total": { "type": "integer", "minimum": 20, "maximum": 200 },
    "hasNext": { "type": "boolean" }
  },
  "required": ["items", "page", "pageSize", "total"]
}`}
						</pre>
					</div>
				</Card>

				{/* Example 4: Error Envelope */}
				<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6 overflow-hidden">
					<h3 className="text-lg font-bold mb-2">4. Error Envelope</h3>
					<p className="text-sm text-muted-foreground mb-4">
						Simulate structured error responses with stable codes and varied
						human-readable messages.
					</p>

					<div className="bg-[#1e1e1e] text-white p-4 rounded-lg overflow-x-auto shadow-inner">
						<pre className="text-xs font-mono leading-relaxed">
							{`{
  "type": "object",
  "properties": {
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string",
          "enum": ["USER_NOT_FOUND", "VALIDATION_FAILED", "RATE_LIMITED"]
        },
        "message": {
          "type": "string",
          "faker": "lorem.sentence"
        },
        "requestId": {
          "type": "string",
          "format": "uuid"
        }
      },
      "required": ["code", "message", "requestId"]
    },
    "trace": {
      "type": "string",
      "const": "support: attach logs and request {$.error.requestId}"
    }
  },
  "required": ["error"]
}`}
						</pre>
					</div>
				</Card>

				{/* Example 2: Dynamic User Profile */}
				<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6 overflow-hidden">
					<h3 className="text-lg font-bold mb-2">2. Coherent User Profile</h3>
					<p className="text-sm text-muted-foreground mb-4">
						Generate a name once and reuse it to build username, email, and bio
						using JSONPath-style references.
					</p>

					<div className="bg-[#1e1e1e] text-white p-4 rounded-lg overflow-x-auto shadow-inner">
						<pre className="text-xs font-mono leading-relaxed">
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
				</Card>
			</div>
		</div>
	);
}
