'use client';

import { Workflow, Braces, Database, Box, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


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
            <h2 className="text-2xl font-bold text-foreground">Why Workflow Mode?</h2>
            <p className="text-muted-foreground">Go beyond static mocks. Build stateful, intelligent API simulations.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <span className="text-muted-foreground line-through">Static Mocks</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">The Old Way</span>
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">❌ Always returns the same JSON.</li>
                    <li className="flex gap-2">❌ No memory of previous requests.</li>
                    <li className="flex gap-2">❌ Impossible to test logical flows (e.g. Empty Cart vs Full Cart).</li>
                </ul>
            </div>
            <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <span className="text-primary">Workflow Mode</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">The New Way</span>
                </h3>
                <ul className="space-y-2 text-sm">
                    <li className="flex gap-2">✅ <strong className="text-foreground">Stateful:</strong> Remembers logic variables (isLoggedIn, cartCount).</li>
                    <li className="flex gap-2">✅ <strong className="text-foreground">Dynamic:</strong> CRUD operations on an in-memory database.</li>
                    <li className="flex gap-2">✅ <strong className="text-foreground">Smart:</strong> Responses change based on input or state.</li>
                </ul>
            </div>
        </div>
      </Card>

      {/* Baby Steps / Tutorial Section */}
       <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
                <Workflow className="h-6 w-6 text-primary" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-foreground">Baby Steps: Your First Workflow</h2>
                <p className="text-muted-foreground">Let's build a simple <strong>Login &rarr; Dashboard</strong> flow.</p>
            </div>
        </div>

        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {/* Step 1 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border border-primary bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 text-sm font-bold shadow shadow-primary/30">
                    1
                </div>
                <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2rem)] p-4 border-primary/20">
                    <h3 className="font-bold text-primary mb-1">Create a Scenario</h3>
                    <p className="text-xs text-muted-foreground mb-2">Think of a scenario as a container for one specific feature.</p>
                    <div className="bg-muted p-2 rounded text-xs font-mono text-muted-foreground">
                        Name: <strong>auth-flow</strong>
                    </div>
                </Card>
            </div>

            {/* Step 2 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border border-muted bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 text-sm font-bold text-muted-foreground">
                    2
                </div>
                 <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2rem)] p-4">
                    <h3 className="font-bold mb-1">Define Login Transition</h3>
                    <p className="text-xs text-muted-foreground mb-2">When user hits <code className="bg-muted px-1 rounded">POST /login</code>, set a flag.</p>
                    <div className="space-y-2">
                        <div className="text-xs">
                            <span className="font-semibold block text-primary mb-1">Effects (What happens):</span>
                            <pre className="bg-muted p-2 rounded font-mono text-[10px] overflow-x-auto">
{`[
  { "type": "state.set", "key": "isLoggedIn", "value": true },
  { "type": "state.set", "key": "user", "value": "{{input.body.username}}" }
]`}
                            </pre>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Step 3 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                 <div className="flex items-center justify-center w-8 h-8 rounded-full border border-muted bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 text-sm font-bold text-muted-foreground">
                    3
                </div>
                <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2rem)] p-4">
                    <h3 className="font-bold mb-1">Protect the Dashboard</h3>
                    <p className="text-xs text-muted-foreground mb-2">Create <code className="bg-muted px-1 rounded">GET /dashboard</code> that only works if logged in.</p>
                     <div className="space-y-2">
                        <div className="text-xs">
                            <span className="font-semibold block text-yellow-500 mb-1">Conditions (The Guard):</span>
                            <pre className="bg-muted p-2 rounded font-mono text-[10px] overflow-x-auto">
{`[
  { "type": "eq", "field": "state.isLoggedIn", "value": true }
]`}
                            </pre>
                             <p className="mt-1 text-[10px] text-muted-foreground">If this condition fails, it returns 404 (or the next matching transition).</p>
                        </div>
                    </div>
                </Card>
            </div>
            
             {/* Step 4 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                 <div className="flex items-center justify-center w-8 h-8 rounded-full border border-muted bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 text-sm font-bold text-muted-foreground">
                    4
                </div>
                <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2rem)] p-4">
                    <h3 className="font-bold mb-1">Test It!</h3>
                    <p className="text-xs text-muted-foreground mb-2">Use the <strong>Test Workflow</strong> tab or curl.</p>
                     <div className="text-xs font-mono bg-muted p-2 rounded">
                        1. POST /login (Success!)<br/>
                        2. GET /dashboard (Access Granted!)
                     </div>
                </Card>
            </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="font-semibold mb-1">1. Scenario</h3>
            <p className="text-xs text-muted-foreground">A named container for your flow (e.g. "auth-flow"). Isolates state.</p>
          </div>
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="font-semibold mb-1">2. Transitions</h3>
            <p className="text-xs text-muted-foreground">Rules that trigger on HTTP requests. "When POST /login &rarr; Set Token".</p>
          </div>
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="font-semibold mb-1">3. State</h3>
            <p className="text-xs text-muted-foreground">Variables and Tables (mini-db) persisted across requests.</p>
          </div>
        </div>

        <h3 className="text-xl font-bold mb-4">Deep Dive: Core Concepts</h3>
        <Accordion type="single" collapsible className="space-y-4">
          <AccordionItem value="wf-transitions">
            <AccordionTrigger>Transitions & Conditions</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  A transition links an incoming request to effects and a response.
                </p>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <span className="font-semibold block mb-2">Condition Builder</span>
                  <p className="mb-2">
                    Use the UI to check field values. Supported operators:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 font-mono text-xs">
                    <li>== (Equals)</li>
                    <li>!= (Not Equals)</li>
                    <li>&gt; (Greater Than)</li>
                    <li>&lt; (Less Than)</li>
                    <li>exists (Field is present)</li>
                    <li>contains (String/Array contains)</li>
                  </ul>
                </div>
                <div className="flex gap-2 text-sm mt-2">
                   <span className="font-mono bg-muted px-1 rounded">Example</span>
                   <span className="text-muted-foreground"><code>input.body.amount &gt; 100</code></span>
                </div>
                <div className="bg-blue-500/10 p-3 rounded-md text-sm mt-4 border border-blue-500/20">
                     <span className="font-semibold block mb-1 text-blue-500">Pro Tip: Shorthand Access</span>
                     <p className="text-xs text-muted-foreground">
                         You can omit <code>input.body</code> for top-level body fields. 
                         <br/>
                         <code>amount &gt; 100</code> is the same as <code>input.body.amount &gt; 100</code>.
                     </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="wf-interpolation">
              <AccordionTrigger>Dynamic Responses</AccordionTrigger>
              <AccordionContent>
                  <div className="space-y-4 pt-2">
                      <p className="text-sm text-muted-foreground">
                          Inject data into your response using <code>{`{{ var }}`}</code> syntax.
                      </p>
                      <div className="grid gap-2 text-sm">
                          <div className="border p-2 rounded">
                              <span className="font-mono text-xs text-primary">{`{{ input.body.id }}`}</span>
                              <span className="block text-xs text-muted-foreground">Echo data from the request body.</span>
                          </div>
                          <div className="border p-2 rounded">
                            <span className="font-mono text-xs text-primary">{`{{ state.token }}`}</span>
                            <span className="block text-xs text-muted-foreground">Return a stored state variable.</span>
                        </div>
                        <div className="border p-2 rounded">
                            <span className="font-mono text-xs text-primary">{`{{ db.users }}`}</span>
                            <span className="block text-xs text-muted-foreground">Return an entire table from the mini-db.</span>
                        </div>
                      </div>
                  </div>
              </AccordionContent>
          </AccordionItem>

          <AccordionItem value="wf-state">
            <AccordionTrigger>State vs Mini-DB</AccordionTrigger>
            <AccordionContent>
              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div className="border p-3 rounded">
                  <div className="flex items-center gap-2 mb-2">
                      <Box className="h-4 w-4" />
                      <span className="font-bold text-sm">State Variables</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Simple key-value pairs (flags, tokens).</p>
                  <pre className="bg-muted p-2 rounded text-[10px] font-mono">
{`state.set('token', 'xyz')
state.get('token')`}
                  </pre>
                </div>
                <div className="border p-3 rounded">
                  <div className="flex items-center gap-2 mb-2">
                      <Database className="h-4 w-4" />
                      <span className="font-bold text-sm">Mini-DB</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Arrays of objects (Tables). Good for lists.</p>
                  <pre className="bg-muted p-2 rounded text-[10px] font-mono">
{`db.push('users', { name: '...' })
{{ db.users }}`}
                  </pre>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      
      <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Example: Shopping Cart</h2>
          <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg border">
                  <h4 className="font-bold text-sm mb-2">1. Add Item</h4>
                  <p className="text-xs text-muted-foreground mb-2">POST /cart/add</p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-background p-2 rounded border">
                          <span className="text-muted-foreground block">Effect:</span>
                          db.push('cart', {`{{ input.body }}`})
                      </div>
                      <div className="bg-background p-2 rounded border">
                          <span className="text-muted-foreground block">Response:</span>
                          {`{ "success": true, "count": "{{ db.cart.length }}" }`}
                      </div>
                  </div>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg border">
                <h4 className="font-bold text-sm mb-2">2. View Cart</h4>
                <p className="text-xs text-muted-foreground mb-2">GET /cart</p>
                <div className="bg-background p-2 rounded border text-xs font-mono">
                    <span className="text-muted-foreground block">Response:</span>
                    {`{ "items": {{ db.cart }} }`}
                </div>
            </div>
          </div>
      </Card>
      <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Baby Steps: JSON Templates</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Conditions</h3>
            <div className="bg-muted p-3 rounded text-[10px] font-mono">
{`[
  { "type": "eq", "field": "state.isLoggedIn", "value": true }
]`}
            </div>
            <div className="bg-muted p-3 rounded text-[10px] font-mono">
{`[
  { "type": "exists", "field": "input.query.page" },
  { "type": "gt", "field": "input.query.page", "value": 1 }
]`}
            </div>
            <div className="bg-muted p-3 rounded text-[10px] font-mono">
{`[
  { "type": "exists", "field": "input.headers.authorization" }
]`}
            </div>
            <div className="bg-muted p-3 rounded text-[10px] font-mono">
{`[
  { "type": "eq", "field": "input.params.id", "value": "42" }
]`}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Effects</h3>
            <div className="bg-muted p-3 rounded text-[10px] font-mono">
{`{ "type": "state.set", "raw": { "isLoggedIn": true, "userId": "{{ input.body.id }}" } }`}
            </div>
            <div className="bg-muted p-3 rounded text-[10px] font-mono">
{`{ "type": "db.push", "table": "users", "value": "{{ input.body }}" }`}
            </div>
            <div className="bg-muted p-3 rounded text-[10px] font-mono">
{`{ "type": "db.update", "table": "users", "match": { "id": "{{ input.params.id }}" }, "set": { "role": "admin" } }`}
            </div>
            <div className="bg-muted p-3 rounded text-[10px] font-mono">
{`{ "type": "db.remove", "table": "cart", "match": { "sku": "{{ input.params.sku }}" } }`}
            </div>
          </div>

          <div className="space-y-3 md:col-span-2">
            <h3 className="font-semibold text-sm">Response Body</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="bg-muted p-3 rounded text-[10px] font-mono">
{`{ "success": true, "user": "{{ state.userId }}" }`}
              </div>
              <div className="bg-muted p-3 rounded text-[10px] font-mono">
{`{ "success": true, "count": "{{ db.cart.length }}" }`}
              </div>
              <div className="bg-muted p-3 rounded text-[10px] font-mono">
{`{{ db.users }}`}
              </div>
              <div className="bg-muted p-3 rounded text-[10px] font-mono">
{`{ "echo": "{{ input.body.name }}" }`}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Users CRUD Journey</h2>
        <div className="space-y-4">
          <div className="bg-muted/30 p-4 rounded-lg border">
            <h4 className="font-bold text-sm mb-2">Create User</h4>
            <p className="text-xs text-muted-foreground mb-2">POST /users</p>
            <div className="grid md:grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-background p-2 rounded border">
                <span className="text-muted-foreground block">Conditions:</span>
{`[]`}
              </div>
              <div className="bg-background p-2 rounded border">
                <span className="text-muted-foreground block">Effect:</span>
{`{ "type": "db.push", "table": "users", "value": "{{ input.body }}" }`}
              </div>
              <div className="bg-background p-2 rounded border md:col-span-2">
                <span className="text-muted-foreground block">Response:</span>
{`{ "id": "{{ input.body.id }}", "created": true }`}
              </div>
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg border">
            <h4 className="font-bold text-sm mb-2">List Users</h4>
            <p className="text-xs text-muted-foreground mb-2">GET /users</p>
            <div className="bg-background p-2 rounded border text-xs font-mono">
              <span className="text-muted-foreground block">Response:</span>
{`{{ db.users }}`}
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg border">
            <h4 className="font-bold text-sm mb-2">Update User</h4>
            <p className="text-xs text-muted-foreground mb-2">PUT /users/:id</p>
            <div className="grid md:grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-background p-2 rounded border">
                <span className="text-muted-foreground block">Effect:</span>
{`{ "type": "db.update", "table": "users", "match": { "id": "{{ input.params.id }}" }, "set": "{{ input.body }}" }`}
              </div>
              <div className="bg-background p-2 rounded border">
                <span className="text-muted-foreground block">Response:</span>
{`{ "updated": true, "id": "{{ input.params.id }}" }`}
              </div>
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg border">
            <h4 className="font-bold text-sm mb-2">Delete User</h4>
            <p className="text-xs text-muted-foreground mb-2">DELETE /users/:id</p>
            <div className="grid md:grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-background p-2 rounded border">
                <span className="text-muted-foreground block">Effect:</span>
{`{ "type": "db.remove", "table": "users", "match": { "id": "{{ input.params.id }}" } }`}
              </div>
              <div className="bg-background p-2 rounded border">
                <span className="text-muted-foreground block">Response:</span>
{`{ "deleted": true, "id": "{{ input.params.id }}" }`}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
        <h2 className="text-xl font-bold text-foreground mb-2">Path Matching Examples</h2>
        <p className="text-xs text-muted-foreground mb-3">Use colon parameters to capture values into <code className="bg-muted px-1 rounded">input.params</code>.</p>
        <div className="grid md:grid-cols-3 gap-3 text-[10px] font-mono">
          <div className="bg-muted p-3 rounded">
{`Path: /users/:id`}
            <br/>
{`Response Body: { "id": "{{ input.params.id }}" }`}
          </div>
          <div className="bg-muted p-3 rounded">
{`Path: /cart/:sku/add`}
            <br/>
{`Effect: { "type": "db.push", "table": "cart", "value": { "sku": "{{ input.params.sku }}" } }`}
          </div>
          <div className="bg-muted p-3 rounded">
{`Path: /orders/:orderId/items/:itemId`}
            <br/>
{`Response Body: { "order": "{{ input.params.orderId }}", "item": "{{ input.params.itemId }}" }`}
          </div>
        </div>
      </Card>
    </div>
  );
}
