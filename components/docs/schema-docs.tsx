'use client';

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
							Mockzilla's powerful extensions.
						</p>
					</div>
				</div>

				<div className="grid md:grid-cols-2 gap-6">
					<div className="space-y-4">
						<h3 className="font-semibold text-lg flex items-center gap-2">
							<Code2 className="h-4 w-4 text-primary" />
							The Foundation
						</h3>
						<p className="text-sm text-muted-foreground">
							Mockzilla uses{' '}
							<a
								href="https://json-schema.org/"
								target="_blank"
								rel="noopener noreferrer"
								className="underline hover:text-foreground"
							>
								JSON Schema
							</a>{' '}
							to define the structure of your data. We adhere to standard validation rules, so any valid JSON Schema works out of the box.
						</p>
					</div>
					<div className="space-y-4">
						<h3 className="font-semibold text-lg flex items-center gap-2">
							<RefreshCw className="h-4 w-4 text-primary" />
							The Randomness
						</h3>
						<p className="text-sm text-muted-foreground">
							We integrate{' '}
							<a
								href="https://fakerjs.dev/"
								target="_blank"
								rel="noopener noreferrer"
								className="underline hover:text-foreground"
							>
								Faker.js
							</a>{' '}
							directly. You can use any Faker module (person, internet, finance, etc.) to generate realistic data for your fields.
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
									Add a <code>faker</code> property to your schema definition to specify which Faker method to use.
								</p>
								<div className="grid md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<p className="text-xs font-semibold text-muted-foreground">Schema</p>
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
    },
    "avatar": { 
      "type": "string", 
      "faker": "image.avatar" 
    }
  }
}`}
										</pre>
									</div>
									<div className="space-y-2">
										<p className="text-xs font-semibold text-muted-foreground">Generated Output</p>
										<pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-auto">
{`{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "avatar": "https://avatars.github..."
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
									Use the <code>{`{$.path.to.field}`}</code> syntax to reference values generated elsewhere in the same document.
									This is crucial for keeping data consistent.
								</p>
								<div className="bg-blue-500/10 p-3 rounded-md border border-blue-500/20 mb-4">
									<p className="text-xs text-blue-500">
										<strong>Note:</strong> References are resolved after generation. You can reference deep nested fields or array items.
									</p>
									<p className="text-xs text-blue-500 mt-2">
										<strong>Pro Tip:</strong> When you use <code>{`{$.path}`}</code> inside a <code>pattern</code> field, Mockzilla automatically treats it as a template instead of a Regex.
									</p>
								</div>
								
								<div className="space-y-2">
									<p className="text-xs font-semibold text-muted-foreground">Example: Welcome Message</p>
									<pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-auto">
{`{
  "type": "object",
  "properties": {
    "user": {
      "type": "object",
      "properties": {
        "firstName": { "type": "string", "faker": "person.firstName" }
      }
    },
    "message": {
      "type": "string",
      // References the firstName generated above
      "pattern": "Hello {$.user.firstName}, welcome back!"
    }
  }
}`}
									</pre>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</Card>

			{/* Advanced Extensions */}
			<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
				<div className="flex items-center gap-3 mb-6">
					<div className="p-2 bg-accent/10 rounded-lg">
						<Variable className="h-6 w-6 text-accent" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-foreground">
							Mockzilla Extensions
						</h2>
						<p className="text-muted-foreground">
							Powerful custom keywords to handle complex data relationships.
						</p>
					</div>
				</div>

				<div className="grid gap-6">
					{/* x-store-as & x-ref */}
					<div className="border rounded-lg p-5">
						<h3 className="font-bold flex items-center gap-2 mb-3">
							<LinkIcon className="h-4 w-4 text-primary" />
							Variable Storage & reuse
							<span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded ml-auto">
								x-store-as / x-ref
							</span>
						</h3>
						<p className="text-sm text-muted-foreground mb-4">
							Store a generated value into a global context key, then reuse it anywhere else—even if the fields aren't siblings. 
							Perfect for IDs that need to match across different sections of your API response.
						</p>
						
						<div className="grid md:grid-cols-2 gap-4">
							<div className="bg-muted p-4 rounded-lg">
								<p className="text-xs font-mono text-muted-foreground mb-1">{`// Define & Store`}</p>
								<pre className="text-xs font-mono">
{`{
  "type": "string", 
  "format": "x-store-as", 
  "x-key": "orderId" 
}`}
								</pre>
							</div>
							<div className="bg-muted p-4 rounded-lg">
								<p className="text-xs font-mono text-muted-foreground mb-1">{`// Retrieve`}</p>
								<pre className="text-xs font-mono">
{`{
  "type": "string", 
  "format": "x-ref", 
  "x-key": "orderId" 
}`}
								</pre>
							</div>
						</div>
					</div>

					{/* x-template */}
					<div className="border rounded-lg p-5">
						<h3 className="font-bold flex items-center gap-2 mb-3">
							<Lightbulb className="h-4 w-4 text-yellow-500" />
							Smart Templates
							<span className="text-[10px] bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded ml-auto">
								x-template
							</span>
						</h3>
						<p className="text-sm text-muted-foreground mb-4">
							Construct complex strings by combining static text with stored variables.
						</p>
						<pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-auto">
{`{
  "type": "string",
  "format": "x-template",
  "template": "Order {{orderId}} for {{customerName}} has been processed."
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

				{/* Example 1: Consistent Order Data */}
				<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6 overflow-hidden">
					<h3 className="text-lg font-bold mb-2">1. Relational Consistency: Order & Line Items</h3>
					<p className="text-sm text-muted-foreground mb-4">
						This example shows how to generate an Order ID once, and ensure every Line Item and the Invoice Summary references that exact ID.
					</p>

					<div className="bg-[#1e1e1e] text-white p-4 rounded-lg overflow-x-auto shadow-inner">
						<pre className="text-xs font-mono leading-relaxed">
{`{
  "type": "object",
  "properties": {
    // 1. Generate & Store Order ID
    "id": {
      "type": "string",
      "format": "x-store-as",
      "x-key": "currentOrderId",
      "faker": "string.uuid"
    },
    // 2. Generate Reference Number based on Order ID
    "reference": {
      "type": "string",
      "format": "x-template",
      "template": "REF-{{currentOrderId}}"
    },
    "items": {
      "type": "array",
      "minItems": 2,
      "maxItems": 2,
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "faker": "string.uuid" },
          "product": { "type": "string", "faker": "commerce.productName" },
          // 3. Each item references the parent Order ID
          "orderId": {
            "type": "string",
            "format": "x-ref",
            "x-key": "currentOrderId"
          }
        }
      }
    },
    "summary": {
      "type": "string",
      "format": "x-template",
      "template": "Summary for Order {{currentOrderId}}: 2 items included."
    }
  }
}`}
						</pre>
					</div>
				</Card>

				{/* Example 2: Dynamic User Profile */}
				<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6 overflow-hidden">
					<h3 className="text-lg font-bold mb-2">2. Coherent User Profile</h3>
					<p className="text-sm text-muted-foreground mb-4">
						Generating a username and ensuring the email address matches it, while also creating a bio that references the full name.
					</p>

					<div className="bg-[#1e1e1e] text-white p-4 rounded-lg overflow-x-auto shadow-inner">
						<pre className="text-xs font-mono leading-relaxed">
{`{
  "type": "object",
  "properties": {
    "firstName": {
      "type": "string",
      "format": "x-store-as",
      "x-key": "fname",
      "faker": "person.firstName"
    },
    "lastName": {
      "type": "string",
      "format": "x-store-as",
      "x-key": "lname",
      "faker": "person.lastName"
    },
    "username": {
      "type": "string",
      "format": "x-template",
      "template": "{{fname}}.{{lname}}"
    },
    "email": {
      "type": "string",
      "format": "x-template",
      "template": "{{fname}}.{{lname}}@example.com"
    },
    "bio": {
      "type": "string",
      "format": "x-template",
      "template": "Hi, I'm {{fname}} {{lname}}. I love coding!"
    }
  }
}`}
						</pre>
					</div>
				</Card>
			</div>
		</div>
	);
}
