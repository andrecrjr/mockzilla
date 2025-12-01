"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BookOpen, Code2, Lightbulb, AlertCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DocsPage() {
  return (
    <div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4 -ml-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-foreground">Documentation</h1>
              <p className="mt-1 text-sm font-medium text-primary/80">String Interpolation & Field Referencing</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 mockzilla-border bg-card/50 backdrop-blur-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="syntax">Syntax</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="mockzilla-border mockzilla-glow border-2 bg-card/50 backdrop-blur-sm p-6">
              <h2 className="text-2xl font-bold text-card-foreground mb-4">What is String Interpolation?</h2>
              <p className="text-muted-foreground mb-4">
                String interpolation allows you to reference and reuse generated values within your JSON Schema Faker mocks. 
                This means you can create consistent mock data where the same randomly generated value appears in multiple fields.
              </p>
              
              <div className="grid gap-4 md:grid-cols-3 mt-6">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <Code2 className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold text-foreground mb-2">Field References</h3>
                  <p className="text-sm text-muted-foreground">
                    Reference any field using <code className="bg-muted px-1 py-0.5 rounded">{"{$.field}"}</code> syntax
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                  <Lightbulb className="h-8 w-8 text-accent mb-2" />
                  <h3 className="font-semibold text-foreground mb-2">Consistent Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Reuse the same random value across multiple fields for realistic mock data
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/20 border border-border">
                  <AlertCircle className="h-8 w-8 text-foreground mb-2" />
                  <h3 className="font-semibold text-foreground mb-2">Dynamic Responses</h3>
                  <p className="text-sm text-muted-foreground">
                    Each request generates fresh random data with maintained internal consistency
                  </p>
                </div>
              </div>
            </Card>

            <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
              <h3 className="text-xl font-bold text-card-foreground mb-4">Quick Example</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">JSON Schema:</p>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "message": {
      "const": "Your ID is {$.id}"
    }
  }
}`}
                  </pre>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Generated Output:</p>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "id": "a7c3f821-9b4d-...",
  "message": "Your ID is a7c3f821-9b4d-..."
}`}
                  </pre>
                  <p className="text-xs text-primary mt-2">
                    ✨ Notice how the message contains the actual generated ID!
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Syntax Tab */}
          <TabsContent value="syntax" className="space-y-6">
            <Card className="mockzilla-border mockzilla-glow border-2 bg-card/50 backdrop-blur-sm p-6">
              <h2 className="text-2xl font-bold text-card-foreground mb-4">Template Syntax</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Basic Field Reference</h3>
                  <p className="text-muted-foreground mb-3">
                    Use <code className="bg-muted px-2 py-1 rounded">{"{$.fieldName}"}</code> to reference a field at the root level.
                  </p>
                  <pre className="bg-muted p-4 rounded-lg text-sm">
{`"message": {
  "const": "Hello {$.userName}!"
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Nested Object Reference</h3>
                  <p className="text-muted-foreground mb-3">
                    Use dot notation to access nested properties.
                  </p>
                  <pre className="bg-muted p-4 rounded-lg text-sm">
{`"greeting": {
  "const": "Hello, {$.user.firstName} {$.user.lastName}!"
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Array Element Reference</h3>
                  <p className="text-muted-foreground mb-3">
                    Use bracket notation to access array elements by index.
                  </p>
                  <pre className="bg-muted p-4 rounded-lg text-sm">
{`"featured": {
  "const": "Try our {$.items[0].name}!"
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Multiple References</h3>
                  <p className="text-muted-foreground mb-3">
                    You can use multiple references in a single string.
                  </p>
                  <pre className="bg-muted p-4 rounded-lg text-sm">
{`"status": {
  "const": "Order {$.orderId} for {$.customerName} is {$.status}"
}`}
                  </pre>
                </div>
              </div>
            </Card>

            <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
              <h3 className="text-xl font-bold text-card-foreground mb-4">Alternative Syntax</h3>
              <p className="text-muted-foreground mb-3">
                Both single and double braces work identically:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Single Braces:</p>
                  <code className="text-sm">{"{$.field}"}</code>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Double Braces:</p>
                  <code className="text-sm">{"{{$.field}}"}</code>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Examples Tab */}
          <TabsContent value="examples" className="space-y-6">
            <Card className="mockzilla-border mockzilla-glow border-2 bg-card/50 backdrop-blur-sm p-6">
              <h2 className="text-2xl font-bold text-card-foreground mb-4">Real-World Examples</h2>
              
              <div className="space-y-6">
                {/* Example 1 */}
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Ticket System</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create a support ticket with consistent ID across multiple fields.
                  </p>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "type": "object",
  "properties": {
    "ticketId": {
      "type": "string",
      "format": "uuid"
    },
    "message": {
      "const": "Your ticket {$.ticketId} has been created"
    },
    "confirmationNumber": {
      "const": "{$.ticketId}"
    }
  }
}`}
                  </pre>
                </div>

                {/* Example 2 */}
                <div className="border-l-4 border-accent pl-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2">User Profile</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Generate personalized messages using user data.
                  </p>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "type": "object",
  "properties": {
    "user": {
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
      }
    },
    "welcome": {
      "const": "Welcome, {$.user.name}!"
    },
    "emailSubject": {
      "const": "Hello {$.user.name}, verify {$.user.email}"
    }
  }
}`}
                  </pre>
                </div>

                {/* Example 3 */}
                <div className="border-l-4 border-secondary pl-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2">E-commerce Order</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Reference array elements for featured products.
                  </p>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "type": "object",
  "properties": {
    "products": {
      "type": "array",
      "minItems": 3,
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "faker": "commerce.productName"
          },
          "price": {
            "type": "number",
            "minimum": 10,
            "maximum": 500
          }
        }
      }
    },
    "featuredProduct": {
      "const": "{$.products[0].name}"
    },
    "summary": {
      "const": "Featuring {$.products[0].name} at just $\${$.products[0].price}!"
    }
  }
}`}
                  </pre>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
              <h2 className="text-2xl font-bold text-card-foreground mb-4">Echo Request Body</h2>
              <p className="text-muted-foreground mb-4">
                For POST, PUT, and PATCH methods, you can enable "Echo Request Body" to return exactly what was sent in the request.
              </p>
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex gap-3">
                  <Lightbulb className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground mb-1">JSON Handling</p>
                    <p className="text-sm text-muted-foreground">
                      If the request Content-Type is <code>application/json</code>, the body will be parsed and returned as a proper JSON object.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="mockzilla-border mockzilla-glow border-2 bg-card/50 backdrop-blur-sm p-6">
              <h2 className="text-2xl font-bold text-card-foreground mb-4">Custom Formats</h2>
              <p className="text-muted-foreground mb-4">
                For advanced use cases, you can use custom format keywords for explicit control over value generation and storage.
              </p>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm">x-store-as</code>
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    Generates a value and stores it in a named variable for later reference.
                  </p>
                  <pre className="bg-muted p-4 rounded-lg text-sm">
{`"userId": {
  "type": "string",
  "format": "x-store-as",
  "x-key": "mainUserId"
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm">x-ref</code>
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    Retrieves a previously stored value by its variable name.
                  </p>
                  <pre className="bg-muted p-4 rounded-lg text-sm">
{`"createdBy": {
  "type": "string",
  "format": "x-ref",
  "x-key": "mainUserId"
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Complete Example</h3>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "type": "object",
  "properties": {
    "userId": {
      "type": "string",
      "format": "x-store-as",
      "x-key": "mainUserId"
    },
    "createdBy": {
      "type": "string",
      "format": "x-ref",
      "x-key": "mainUserId"
    },
    "modifiedBy": {
      "type": "string",
      "format": "x-ref",
      "x-key": "mainUserId"
    }
  }
}`}
                  </pre>
                  <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm text-foreground">
                      <strong>Result:</strong> All three fields will have the same generated UUID value.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
              <h3 className="text-xl font-bold text-card-foreground mb-4">Important Notes</h3>
              
              <div className="space-y-3">
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">Template Resolution Order</p>
                      <p className="text-sm text-muted-foreground">
                        Template references are resolved <strong>after</strong> the entire JSON is generated. 
                        Make sure referenced fields exist in your schema.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">Case Sensitivity</p>
                      <p className="text-sm text-muted-foreground">
                        Field references are case-sensitive. <code className="bg-muted px-1 rounded">{"{$.Id}"}</code> is 
                        different from <code className="bg-muted px-1 rounded">{"{$.id}"}</code>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">Array Index Bounds</p>
                      <p className="text-sm text-muted-foreground">
                        Make sure array indices exist. Referencing <code className="bg-muted px-1 rounded">{"{$.items[10]}"}</code> when 
                        the array only has 3 items will fail gracefully.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer CTA */}
        <Card className="mockzilla-border mockzilla-glow mt-8 border-2 bg-gradient-to-br from-primary/10 to-accent/10 p-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-foreground mb-2">Ready to try it out?</h3>
            <p className="text-muted-foreground mb-4">
              Create a new mock with "Dynamic Response" enabled and use string interpolation in your JSON Schema.
            </p>
            <Link href="/">
              <Button className="bg-primary hover:bg-primary/90">
                Create Your First Mock
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
