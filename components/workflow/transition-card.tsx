
'use client';

import { Copy, MoreHorizontal, ArrowRight, Trash, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface TransitionCardProps {
  transition: any; // Type strictly later
  onDelete: (id: string) => void;
  onEdit: (transition: any) => void;
}

export function TransitionCard({ transition, onDelete, onEdit }: TransitionCardProps) {
  const fullUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/workflow${transition.path}`
    : `/api/workflow${transition.path}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(fullUrl);
    toast.success('URL Copied');
  };

  const copyCurl = () => {
    const curl = `curl -X ${transition.method} "${fullUrl}"`;
    navigator.clipboard.writeText(curl);
    toast.success('cURL Command Copied');
  };

  return (
    <Card className="p-4 group hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
            <Badge variant={
                transition.method === 'GET' ? 'default' :
                transition.method === 'POST' ? 'secondary' :
                transition.method === 'DELETE' ? 'destructive' : 'outline'
            }>
                {transition.method}
            </Badge>
            <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                {transition.path}
            </code>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(transition)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(transition.id)} className="text-destructive focus:text-destructive">
                    <Trash className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title and Description */}
      {(transition.title || transition.description) && (
        <div className="mb-3">
          {transition.title && (
            <h4 className="font-medium text-sm">{transition.title}</h4>
          )}
          {transition.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{transition.description}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-muted/50 rounded-md px-3 py-2 text-xs font-mono truncate text-muted-foreground select-all">
            {fullUrl}
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={copyUrl}>
            <Copy className="h-3 w-3" />
        </Button>
      </div>

       <div className="space-y-2 text-sm">
         {/* Conditions */}
         <div className="flex items-start gap-2 text-muted-foreground">
            <span className="text-xs uppercase font-semibold text-muted-foreground/50 w-16 shrink-0 mt-0.5">When</span>
            <div className="flex-1">
                {Object.keys(transition.conditions || {}).length > 0 ? (
                    <code className="text-xs bg-yellow-500/10 text-yellow-500 px-1 py-0.5 rounded">
                        {JSON.stringify(transition.conditions).substring(0, 40)}{JSON.stringify(transition.conditions).length>40?'...':''}
                    </code>
                ) : (
                    <span className="text-muted-foreground/50 italic">Always matches</span>
                )}
            </div>
         </div>

         {/* Effects */}
         <div className="flex items-start gap-2 text-muted-foreground">
            <span className="text-xs uppercase font-semibold text-muted-foreground/50 w-16 shrink-0 mt-0.5">Then</span>
             <div className="flex-1 space-y-1">
                {(transition.effects || []).length > 0 ? (
                    (transition.effects as any[]).map((e, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs">
                             <ArrowRight className="h-3 w-3 text-primary" />
                             <span>{e.type}</span>
                             {e.table && <code className="bg-muted px-1 rounded">{e.table}</code>}
                        </div>
                    ))
                ) : (
                    <span className="text-muted-foreground/50 italic">No side effects</span>
                )}
             </div>
         </div>
       </div>

       <div className="mt-4 pt-3 border-t flex justify-end">
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={copyCurl}>
                Copy cURL
            </Button>
       </div>
    </Card>
  );
}
