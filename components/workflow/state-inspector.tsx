
'use client';

import { RefreshCw, Database, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import type { MatchContext } from '@/lib/types';

interface StateInspectorProps {
  data: MatchContext;
  onRefresh: () => void;
  isLoading: boolean;
}

export function StateInspector({ data, onRefresh, isLoading }: StateInspectorProps) {
  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between bg-muted/20">
         <h3 className="font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Current State
         </h3>
         <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
         </Button>
      </div>
      
      <Tabs defaultValue="state" className="flex-1 flex flex-col">
        <div className="px-4 pt-4">
             <TabsList className="w-full">
                <TabsTrigger value="state" className="flex-1">Variables</TabsTrigger>
                <TabsTrigger value="db" className="flex-1">Database</TabsTrigger>
            </TabsList>
        </div>
        
        <TabsContent value="state" className="flex-1 min-h-0 relative">
            <ScrollArea className="h-full absolute inset-0">
                <div className="p-4">
                    {Object.keys(data.state || {}).length === 0 ? (
                        <div className="text-center text-muted-foreground text-sm py-8">
                            No variables set
                        </div>
                    ) : (
                        <pre className="text-sm font-mono whitespace-pre-wrap">
                            {JSON.stringify(data.state, null, 2)}
                        </pre>
                    )}
                </div>
            </ScrollArea>
        </TabsContent>

        <TabsContent value="db" className="flex-1 min-h-0 relative">
             <ScrollArea className="h-full absolute inset-0">
                <div className="p-4 space-y-6">
                    {Object.keys(data.db || {}).length === 0 ? (
                        <div className="text-center text-muted-foreground text-sm py-8">
                             <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                             No tables in Mini-DB
                        </div>
                    ) : (
                        Object.entries(data.db).map(([table, rows]) => (
                            <div key={table}>
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Database className="h-3 w-3" />
                                    {table} 
                                    <span className="text-muted-foreground font-normal ml-auto text-xs">{(rows as unknown[]).length} rows</span>
                                </h4>
                                <div className="bg-muted p-2 rounded-md overflow-x-auto">
                                    <pre className="text-xs font-mono">
                                        {JSON.stringify(rows, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
