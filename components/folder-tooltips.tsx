"use client";

import { ExternalLink, HelpCircle } from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FieldTooltipProps {
  label: string;
  description: string;
  example?: string;
  docsLink?: string;
}

export function FieldTooltip({ label, description, example, docsLink }: FieldTooltipProps) {
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
        {docsLink && (
          <Link
            href={docsLink}
            className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
            target="_blank"
          >
            Learn more <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
