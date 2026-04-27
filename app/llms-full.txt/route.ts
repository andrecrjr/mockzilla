import { NextResponse } from 'next/server';
import path from 'node:path';
import { getDocsHierarchy, type DocSection } from '@/lib/llms-utils';

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

		let fullContent = '# Mockzilla Full Documentation\n';
		fullContent += '> This file contains the complete documentation for Mockzilla, organized by the actual site structure.\n\n';

		fullContent += flattenToContent(hierarchy);

		return new NextResponse(fullContent, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
			},
		});
	} catch (error) {
		console.error('Error generating llms-full.txt:', error);
		return new NextResponse('Error generating full documentation.', { status: 500 });
	}
}
