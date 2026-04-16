'use client';

import * as React from 'react';
import { Check, Link as LinkIcon } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4 | 5 | 6;
}

export function Heading({ level, id, children, className, ...props }: HeadingProps) {
  const [isCopied, setIsCopied] = React.useState(false);
  const Tag = `h${level}` as const;

  const copyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!id) return;

    const url = new URL(window.location.origin + window.location.pathname);
    url.hash = id;
    const ok = await copyToClipboard(url.toString());
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <Tag
      id={id}
      className={cn(
        'group flex items-center scroll-m-20',
        level === 1 && 'mt-2 text-4xl font-bold tracking-tight',
        level === 2 && 'mt-10 border-b pb-1 text-3xl font-semibold tracking-tight first:mt-0',
        level === 3 && 'mt-8 text-2xl font-semibold tracking-tight',
        level === 4 && 'mt-8 text-xl font-semibold tracking-tight',
        level === 5 && 'mt-8 text-lg font-semibold tracking-tight',
        level === 6 && 'mt-8 text-base font-semibold tracking-tight',
        className
      )}
      {...props}
    >
      {children}
      {id && (
        <button
          onClick={copyLink}
          className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Copy link to this section"
        >
          {isCopied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <LinkIcon className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </Tag>
  );
}
