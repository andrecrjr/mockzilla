import path from 'node:path';
import { NextResponse } from 'next/server';
import {
	AGENT_QUICK_REFERENCE,
	type DocSection,
	getDocsHierarchy,
	LLMS_SUMMARY,
	toLlmsTxtPath,
} from '@/lib/llms-utils';

export const dynamic = 'force-static';

function flattenToLinks(sections: DocSection[], baseUrl: string): string {
	let output = '';
	for (const section of sections) {
		const description = section.description ? `: ${section.description}` : '';
		if (section.items) {
			output += `\n## ${section.title}\n`;
			output += flattenToLinks(section.items, baseUrl);
		} else {
			output += `- [${section.title}](${baseUrl}${toLlmsTxtPath(section.path)})${description}\n`;
		}
	}
	return output;
}

export async function GET() {
	try {
		const docsDir = path.join(process.cwd(), 'content/docs');
		const hierarchy = getDocsHierarchy(docsDir);

		// Relative links unless a public base URL is configured.
		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

		const rootPages = hierarchy.filter((section) => !section.items);
		const sections = hierarchy.filter((section) => section.items);

		let content = `# Mockzilla\n\n> ${LLMS_SUMMARY}\n\n`;
		content += AGENT_QUICK_REFERENCE;
		content += '\n## Overview\n';
		content += `- [llms-full.txt](${baseUrl}/llms-full.txt): Every documentation page in a single Markdown file.\n`;
		content += flattenToLinks(rootPages, baseUrl);
		content += flattenToLinks(sections, baseUrl);

		return new NextResponse(content, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
			},
		});
	} catch (error) {
		console.error('Error generating llms.txt:', error);
		return new NextResponse('Error generating documentation index.', {
			status: 500,
		});
	}
}
