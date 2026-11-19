import { describe, expect, test } from 'bun:test';
import path from 'node:path';
import {
	findSectionByPath,
	getDocsHierarchy,
	llmsSegmentsToDocsPath,
	toLlmsTxtPath,
	toLlmText,
} from '../../lib/llms-utils';

describe('llms paths', () => {
	test('maps docs sections to canonical .txt URLs', () => {
		expect(toLlmsTxtPath('/docs/')).toBe('/llms/docs/index.txt');
		expect(toLlmsTxtPath('/docs/guides/openapi-import')).toBe(
			'/llms/docs/guides/openapi-import.txt',
		);
	});

	test('maps route segments back to docs sections', () => {
		expect(llmsSegmentsToDocsPath(['index.txt'])).toBe('/docs');
		expect(llmsSegmentsToDocsPath(['.txt'])).toBe('/docs');
		expect(llmsSegmentsToDocsPath(['guides', 'openapi-import.txt'])).toBe(
			'/docs/guides/openapi-import',
		);
	});

	test('every indexed page resolves to its own section', () => {
		const hierarchy = getDocsHierarchy(
			path.join(process.cwd(), 'content/docs'),
		);
		const pages = hierarchy.flatMap((section) => section.items ?? [section]);
		for (const page of pages) {
			const segments = toLlmsTxtPath(page.path)
				.replace(/^\/llms\/docs\//, '')
				.split('/');
			const found = findSectionByPath(
				hierarchy,
				llmsSegmentsToDocsPath(segments),
			);
			expect(found?.path).toBe(page.path);
		}
	});

	test('keeps colons in _meta titles', () => {
		const hierarchy = getDocsHierarchy(
			path.join(process.cwd(), 'content/docs'),
		);
		const titles = hierarchy.flatMap((section) =>
			(section.items ?? []).map((item) => item.title),
		);
		expect(titles).toContain('How-to: Mocking Infinite Scroll');
	});
});

describe('toLlmText', () => {
	test('turns link cards into Markdown links and drops component markup', () => {
		const mdx = [
			"import { Card } from '@/components/ui/card';",
			'',
			'# Title',
			'<div className="grid gap-4">',
			'  <Link href="/docs/quick-start" className="no-underline">',
			'    <Card className="h-full">',
			'      <CardHeader>',
			'        <Zap className="w-8 h-8" />',
			'        <CardTitle>Quick Start</CardTitle>',
			'        <CardDescription>Run it in 5 minutes.</CardDescription>',
			'      </CardHeader>',
			'    </Card>',
			'  </Link>',
			'</div>',
		].join('\n');

		const text = toLlmText(mdx);
		expect(text).toContain(
			'- [Quick Start](/docs/quick-start): Run it in 5 minutes.',
		);
		expect(text).not.toContain('className');
		expect(text).not.toContain('import ');
		expect(text).not.toMatch(/<\/?[A-Z]/);
	});

	test('converts inline HTML that carries meaning', () => {
		const text = toLlmText(
			[
				'<a href="https://example.com" className="x">Install →</a>',
				'<ul className="list"><li className="y">✅ One</li></ul>',
				'<blockquote className="q">Ask the agent</blockquote>',
			].join('\n'),
		);
		expect(text).toContain('[Install →](https://example.com)');
		expect(text).toContain('- ✅ One');
		expect(text).toContain('> Ask the agent');
	});

	test('leaves fenced code blocks untouched', () => {
		const code = [
			'```tsx',
			"import { useState } from 'react';",
			'export const A = () => <div className="p-4">Hi</div>;',
			'```',
		].join('\n');
		expect(toLlmText(`Intro\n\n${code}\n`)).toContain(code);
	});
});
