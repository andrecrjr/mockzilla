import { NextResponse } from 'next/server';
import path from 'node:path';
import {
	findSectionByPath,
	getDocsHierarchy,
	type DocSection,
} from '@/lib/llms-utils';

export const dynamic = 'force-static';

const DOCS_DIR = path.join(process.cwd(), 'content/docs');

interface RouteContext {
	params: Promise<{ path?: string[] }>;
}

function flattenSections(sections: DocSection[]): DocSection[] {
	return sections.flatMap((section) => [
		section,
		...(section.items ? flattenSections(section.items) : []),
	]);
}

function generateScopedIndex(section: DocSection, baseUrl: string): string {
	let output = `# ${section.title}\n`;
	output += `> ${section.description || `Documentation section for Mockzilla: ${section.path}`}\n\n`;

	if (section.content) {
		output += `## Content\n${section.content}\n\n`;
	}

	if (section.items && section.items.length > 0) {
		output += '## Sub-sections\n';
		for (const item of section.items) {
			const description = item.description ? `: ${item.description}` : '';
			output += `- [${item.title}](${baseUrl}/llms${item.path}.txt)${description}\n`;
		}
	}

	return output;
}

export function generateStaticParams(): Array<{ path: string[] }> {
	return flattenSections(getDocsHierarchy(DOCS_DIR)).map((section) => ({
		path: `${section.path.replace(/^\/docs\/?/, '')}.txt`
			.split('/')
			.filter(Boolean),
	}));
}

export async function GET(_: Request, context: RouteContext) {
	const { path: pathSegments = [] } = await context.params;
	const targetPath = pathSegments
		.map((segment, index) =>
			index === pathSegments.length - 1 ? segment.replace(/\.txt$/, '') : segment,
		)
		.join('/');
	const section = findSectionByPath(
		getDocsHierarchy(DOCS_DIR),
		`/docs/${targetPath}`,
	);

	if (!section) {
		return new NextResponse('Documentation section not found.', { status: 404 });
	}

	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
	return new NextResponse(generateScopedIndex(section, baseUrl), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
}
