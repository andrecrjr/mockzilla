import { describe, expect, test } from 'bun:test';
import { NextRequest } from 'next/server';
import {
	generateStaticParams,
	GET as getScoped,
} from '../../app/llms/docs/[[...path]]/route';
import { GET as getIndex } from '../../app/llms.txt/route';
import { GET as getFull } from '../../app/llms-full.txt/route';
import { proxy } from '../../proxy';

const scoped = (segments: string[]) =>
	getScoped(new Request('http://localhost/llms/docs'), {
		params: Promise.resolve({ path: segments }),
	});

describe('/llms.txt', () => {
	test('starts with the agent quick reference and links canonical pages', async () => {
		const text = await (await getIndex()).text();

		expect(text.startsWith('# Mockzilla\n')).toBe(true);
		expect(text).toContain('## Agent Quick Reference');
		expect(text).toContain('http://localhost:36666/api/mcp');
		expect(text).toContain('- [Introduction](/llms/docs/index.txt)');
		expect(text).toContain('/llms/docs/guides/proxy-and-record.txt');
		expect(text).not.toContain('/llms.txt/docs/');
	});

	test('every linked page resolves to its own content', async () => {
		const text = await (await getIndex()).text();
		const links = [...text.matchAll(/\]\((\/llms\/docs\/[^)]+)\)/g)].map(
			(match) => match[1],
		);
		expect(links.length).toBeGreaterThan(10);

		for (const link of links) {
			const segments = link.replace('/llms/docs/', '').split('/');
			const res = await scoped(segments);
			expect(res.status).toBe(200);
			const title = text.match(
				new RegExp(`- \\[([^\\]]+)\\]\\(${link.replace(/[.]/g, '\\.')}\\)`),
			)?.[1];
			expect((await res.text()).startsWith(`# ${title}`)).toBe(true);
		}
	});
});

describe('/llms/docs/<page>.txt', () => {
	test('returns 404 for unknown pages', async () => {
		expect((await scoped(['nope.txt'])).status).toBe(404);
	});

	test('lists the pages of a section', async () => {
		const text = await (await scoped(['guides.txt'])).text();
		expect(text).toContain('## Pages in this section');
		expect(text).toContain('/llms/docs/guides/openapi-import.txt');
	});

	test('serves clean Markdown without MDX component markup', async () => {
		const text = await (await scoped(['index.txt'])).text();
		expect(text).not.toContain('className');
		expect(text).not.toMatch(/<\/?(Card|Link|div)\b/);
		expect(text).toContain(
			'- [Quick Start](/docs/getting-started/quick-start)',
		);
	});

	test('pre-renders the root as index.txt', () => {
		const params = generateStaticParams().map(({ path }) => path.join('/'));
		expect(params).toContain('index.txt');
		expect(params).not.toContain('.txt');
	});
});

describe('/llms-full.txt', () => {
	test('includes the quick reference and every page without imports', async () => {
		const text = await (await getFull()).text();
		expect(text).toContain('## Agent Quick Reference');
		expect(text).toContain('*Path: /docs/guides/proxy-and-record*');
		// `import` lines only survive inside code samples.
		const prose = text.replace(/^```[\s\S]*?^```/gm, '');
		expect(prose).not.toMatch(/^import /m);
		expect(prose).not.toContain('className');
	});
});

describe('proxy.ts scoped docs rewrite', () => {
	test('rewrites /docs/<page>/llms.txt to the canonical page', () => {
		const res = proxy(
			new NextRequest('http://localhost/docs/guides/openapi-import/llms.txt'),
		);
		expect(res.headers.get('x-middleware-rewrite')).toBe(
			'http://localhost/llms/docs/guides/openapi-import.txt',
		);
	});

	test('leaves normal docs pages alone', () => {
		const res = proxy(
			new NextRequest('http://localhost/docs/guides/openapi-import'),
		);
		expect(res.headers.get('x-middleware-rewrite')).toBeNull();
	});
});
