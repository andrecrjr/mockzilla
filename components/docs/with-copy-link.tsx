'use client';

import * as React from 'react';
import { Check, Link as LinkIcon } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';
import { cn } from '@/lib/utils';

function getTextContent(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return child.toString();
      }
      if (React.isValidElement(child) && (child.props as any).children) {
        return getTextContent((child.props as any).children);
      }
      return '';
    })
    .join('');
}

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export function WithCopyLink({ 
  children, 
  id,
  className 
}: { 
  children: React.ReactNode, 
  id?: string,
  className?: string
}) {
  const [isCopied, setIsCopied] = React.useState(false);
  const generatedId = id || slugify(getTextContent(children));

  const copyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!generatedId) return;

    const url = new URL(window.location.origin + window.location.pathname);
    url.hash = generatedId;
    const ok = await copyToClipboard(url.toString());
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div id={generatedId} className={cn('group flex items-center gap-2 scroll-m-20', className)}>
      {children}
      <button
        onClick={copyLink}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Copy link to this section"
      >
        {isCopied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <LinkIcon className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
