"use client";

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FieldTooltipProps {
  label: string;
  description: string;
  example?: string;
}

export function FieldTooltip({ label, description, example }: FieldTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <p>{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        {example && (
          <p className="mt-1 text-xs text-primary">
            Example: <code className="bg-muted px-1 py-0.5 rounded">{example}</code>
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
