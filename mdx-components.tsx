import {
	AlertCircle,
	BrainCircuit,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Cpu,
	Database,
	FileCode,
	Globe,
	Layout,
	MousePointer2,
	Rocket,
	Shield,
	ShoppingCart,
	Sparkles,
	Terminal,
	Zap,
} from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { CopyButton } from '@/components/docs/copy-button';
import { Heading } from '@/components/docs/heading';
import { SchemaTesterDialogWrapper } from '@/components/docs/schema-tester-dialog-wrapper';
import { WithCopyLink } from '@/components/docs/with-copy-link';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface CodeProps {
	children?: string;
}

function isCodeElement(child: unknown): child is React.ReactElement<CodeProps> {
	return React.isValidElement(child) && child.type === 'code';
}

const Pre = ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => {
	// Extract code text from children
	// In MDX, pre usually has a code child: <pre><code>...</code></pre>
	const codeContent = React.Children.toArray(children).find(isCodeElement);

	const textToCopy = codeContent?.props?.children || '';

	return (
		<div className="group relative">
			<pre {...props} className="relative">
				{children}
			</pre>
			{textToCopy && <CopyButton text={textToCopy} />}
		</div>
	);
};

export const mdxComponents = {
	// Custom interactive components
	SchemaTesterDialog: SchemaTesterDialogWrapper,
	Link,
	// Icons
	ChevronLeft,
	ChevronRight,
	Zap,
	Globe,
	Database,
	Cpu,
	Sparkles,
	MousePointer2,
	FileCode,
	BrainCircuit,
	Rocket,
	Layout,
	Terminal,
	CheckCircle2,
	AlertCircle,
	Shield,
	ShoppingCart,
	// HTML overrides
	pre: Pre,
	h1: (props: Record<string, unknown>) => <Heading level={1} {...props} />,
	h2: (props: Record<string, unknown>) => <Heading level={2} {...props} />,
	h3: (props: Record<string, unknown>) => <Heading level={3} {...props} />,
	h4: (props: Record<string, unknown>) => <Heading level={4} {...props} />,
	h5: (props: Record<string, unknown>) => <Heading level={5} {...props} />,
	h6: (props: Record<string, unknown>) => <Heading level={6} {...props} />,
	// shadcn/ui components
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Alert,
	AlertDescription,
	AlertTitle: (props: Record<string, unknown>) => (
		<WithCopyLink>
			<AlertTitle {...props} />
		</WithCopyLink>
	),
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle: (props: Record<string, unknown>) => (
		<WithCopyLink>
			<CardTitle {...props} />
		</WithCopyLink>
	),
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	Textarea,
};
