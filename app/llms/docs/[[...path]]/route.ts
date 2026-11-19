import path from 'node:path';
import { NextResponse } from 'next/server';
import {
	type DocSection,
	findSectionByPath,
	getDocsHierarchy,
	llmsSegmentsToDocsPath,
	renderLlmsSection,
	toLlmsTxtPath,
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

export function generateStaticParams(): Array<{ path: string[] }> {
	return flattenSections(getDocsHierarchy(DOCS_DIR)).map((section) => ({
		path: toLlmsTxtPath(section.path)
			.replace(/^\/llms\/docs\//, '')
			.split('/'),
	}));
}

export async function GET(_: Request, context: RouteContext) {
	const { path: pathSegments = [] } = await context.params;
	const section = findSectionByPath(
		getDocsHierarchy(DOCS_DIR),
		llmsSegmentsToDocsPath(pathSegments),
	);

	if (!section) {
		return new NextResponse('Documentation section not found.', {
			status: 404,
		});
	}

	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
	return new NextResponse(renderLlmsSection(section, baseUrl), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
}
