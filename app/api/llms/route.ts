import { NextResponse } from 'next/server';
import path from 'path';
import { getDocsHierarchy, findSectionByPath, type DocSection } from '@/lib/llms-utils';

function generateScopedIndex(section: DocSection, baseUrl: string): string {
	let output = `# ${section.title}\n`;
	output += `> ${section.description || `Documentation section for Mockzilla: ${section.path}`}\n\n`;

	if (section.content) {
		output += `## Content\n${section.content}\n\n`;
	}

	if (section.items && section.items.length > 0) {
		output += `## Sub-sections\n`;
		for (const item of section.items) {
			const description = item.description ? `: ${item.description}` : '';
			output += `- [${item.title}](${baseUrl}/llms.txt${item.path})${description}\n`;
		}
	}

	return output;
}

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const rawPath = searchParams.get('path') || '';
		
		// Ensure the target path starts with /docs/
		const targetPath = rawPath.startsWith('/docs') ? rawPath : `/docs/${rawPath}`;
		
		const docsDir = path.join(process.cwd(), 'content/docs');
		const hierarchy = getDocsHierarchy(docsDir);
		const section = findSectionByPath(hierarchy, targetPath);

		if (!section) {
			return new NextResponse('Documentation section not found.', { status: 404 });
		}

		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
		const content = generateScopedIndex(section, baseUrl);

		return new NextResponse(content, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
			},
		});
	} catch (error) {
		console.error('Error generating scoped llms.txt:', error);
		return new NextResponse('Error generating documentation index.', { status: 500 });
	}
}
