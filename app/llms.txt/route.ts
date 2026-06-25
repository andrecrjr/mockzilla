import { NextResponse } from 'next/server';
import path from 'node:path';
import { getDocsHierarchy, type DocSection } from '@/lib/llms-utils';

function flattenToLinks(sections: DocSection[], baseUrl: string): string {
	let output = '';
	for (const section of sections) {
		const description = section.description ? `: ${section.description}` : '';
		if (section.items) {
			output += `\n## ${section.title}\n`;
			if (section.description) {
				output += `> ${section.description}\n\n`;
			}
			output += flattenToLinks(section.items, baseUrl);
		} else {
			output += `- [${section.title}](${baseUrl}/llms.txt${section.path})${description}\n`;
		}
	}
	return output;
}

export async function GET() {
	try {
		const docsDir = path.join(process.cwd(), 'content/docs');
		const hierarchy = getDocsHierarchy(docsDir);

		// Use environment variable for base URL or default to relative for internal agents
		// In a real deployment, you'd use your actual domain
		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

		let content = `# Mockzilla Documentation\n`;
		content += `> High-fidelity API mocking and stateful workflow simulation.\n\n`;
		content += `- [llms-full.txt](${baseUrl}/llms.txt/llms-full.txt): The full documentation content in a single file.\n`;
		content += `> Tip: Every route in the documentation also supports its own \`/llms.txt\` endpoint for scoped context.\n\n`;
		
		content += flattenToLinks(hierarchy, baseUrl);

		return new NextResponse(content, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
			},
		});
	} catch (error) {
		console.error('Error generating llms.txt:', error);
		return new NextResponse('Error generating documentation index.', { status: 500 });
	}
}
