import path from 'node:path';
import { NextResponse } from 'next/server';
import {
	AGENT_QUICK_REFERENCE,
	type DocSection,
	getDocsHierarchy,
	LLMS_SUMMARY,
} from '@/lib/llms-utils';

export const dynamic = 'force-static';

function flattenToContent(sections: DocSection[], depth: number = 2): string {
	let output = '';
	for (const section of sections) {
		if (section.items) {
			output += `\n${'#'.repeat(depth)} ${section.title}\n`;
			output += flattenToContent(section.items, depth + 1);
		} else if (section.content) {
			output += `\n---\n\n`;
			output += `${'#'.repeat(depth)} ${section.title}\n`;
			output += `*Path: ${section.path}*\n\n`;
			output += section.content;
			output += `\n`;
		}
	}
	return output;
}

export async function GET() {
	try {
		const docsDir = path.join(process.cwd(), 'content/docs');
		const hierarchy = getDocsHierarchy(docsDir);

		let fullContent = `# Mockzilla Full Documentation\n\n> ${LLMS_SUMMARY}\n\n`;
		fullContent += AGENT_QUICK_REFERENCE;
		fullContent +=
			'\nAll documentation pages follow, in site order. Index: /llms.txt\n';

		fullContent += flattenToContent(hierarchy);

		return new NextResponse(fullContent, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
			},
		});
	} catch (error) {
		console.error('Error generating llms-full.txt:', error);
		return new NextResponse('Error generating full documentation.', {
			status: 500,
		});
	}
}
