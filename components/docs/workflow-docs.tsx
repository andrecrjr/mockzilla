'use client';

import { Workflow, Braces, Database, Box } from 'lucide-react';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function WorkflowDocs() {
  return (
    <div className="space-y-6">
      <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Workflow className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Workflow Mode</h2>
            <p className="text-muted-foreground">Build stateful, multi-step API scenarios.</p>
          </div>
        </div>

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

        <h3 className="text-xl font-bold mb-4">Core Concepts</h3>
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
      </Card>

      <Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">How to Create a Workflow</h2>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">1</div>
            <div>
              <h4 className="font-semibold">Create Scenario</h4>
              <p className="text-sm text-muted-foreground">Go to <Link href="/workflows" className="text-primary hover:underline">Workflows Dashboard</Link> and click "New Scenario". Name it (e.g. "shop").</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">2</div>
            <div>
              <h4 className="font-semibold">Add Transitions</h4>
              <p className="text-sm text-muted-foreground">Click "Add Transition". Use the <strong>Condition Builder</strong> to define when it triggers.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">3</div>
            <div>
              <h4 className="font-semibold">Define Response & Effects</h4>
              <p className="text-sm text-muted-foreground">
                Set a static response or use <strong>Insert Var</strong> to make it dynamic.
                <br/>
                Add effects to update the database or state.
              </p>
            </div>
          </div>
        </div>
      </Card>
      
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
    </div>
  );
}
