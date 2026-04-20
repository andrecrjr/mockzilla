'use client';

import { Check, Copy } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { copyToClipboard } from '@/lib/utils';

export function CopyButton({ text }: { text: string }) {
	const [isCopied, setIsCopied] = React.useState(false);

	const copy = async () => {
		const ok = await copyToClipboard(text);
		if (ok) {
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2000);
		}
	};

	return (
		<Button
			variant="ghost"
			size="icon"
			className="absolute right-4 top-4 h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
			onClick={copy}
		>
			{isCopied ? (
				<Check className="h-4 w-4 text-green-500" />
			) : (
				<Copy className="h-4 w-4" />
			)}
			<span className="sr-only">Copy code</span>
		</Button>
	);
}
