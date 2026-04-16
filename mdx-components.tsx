import React from 'react';
import { SchemaTesterDialogWrapper } from '@/components/docs/schema-tester-dialog-wrapper';
import { CopyButton } from '@/components/docs/copy-button';
import { Heading } from '@/components/docs/heading';
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

const Pre = ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => {
  // Extract code text from children
  // In MDX, pre usually has a code child: <pre><code>...</code></pre>
  const codeContent = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === 'code'
  ) as React.ReactElement | undefined;

  const textToCopy = codeContent?.props.children || '';

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
  // HTML overrides
  pre: Pre,
  h1: (props: any) => <Heading level={1} {...props} />,
  h2: (props: any) => <Heading level={2} {...props} />,
  h3: (props: any) => <Heading level={3} {...props} />,
  h4: (props: any) => <Heading level={4} {...props} />,
  h5: (props: any) => <Heading level={5} {...props} />,
  h6: (props: any) => <Heading level={6} {...props} />,
  // shadcn/ui components
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle: (props: any) => <WithCopyLink><AlertTitle {...props} /></WithCopyLink>,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle: (props: any) => <WithCopyLink><CardTitle {...props} /></WithCopyLink>,
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
