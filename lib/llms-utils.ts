import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export const LLMS_SUMMARY =
	'Mockzilla is an open-source API mocking platform: create folders of mock endpoints with static, wildcard, or JSON Schema–driven dynamic responses, managed from a dashboard, REST API, CLI, or MCP.';

// Facts an agent needs before reading any page. Keep in sync with
// documentation/mcp.md and documentation/cli.md.
export const AGENT_QUICK_REFERENCE = `## Agent Quick Reference
- Default server: \`http://localhost:36666\` (Docker image or desktop app).
- Serve a mock: \`{METHOD} /api/mock/{folderSlug}/{mockPath}\`. A folder groups mocks; a mock is one endpoint response.
- MCP endpoint: \`http://localhost:36666/api/mcp\` (tools: \`manage_folders\`, \`manage_mock_subfolders\`, \`manage_mocks\`, \`manage_logs\`).
- Terminal: run \`mockzilla agent-skill\` to print the CLI skill; \`mockzilla health\` checks the server. Add \`--json\` for machine-readable output.
- Match types: \`exact\` (default), \`wildcard\` (\`*\` captures path text; supports per-capture variants and a fallback), \`substring\`.
- Dynamic responses: JSON Schema + Faker, with \`{{$.path}}\` interpolation and Handlebars helpers.
- Every page below is plain Markdown at \`/llms/docs/<page>.txt\`; \`/llms-full.txt\` has all of them in one file.
`;

export interface DocSection {
	title: string;
	path: string;
	description?: string;
	content?: string;
	items?: DocSection[];
}

export function isHiddenDoc(filePath: string): boolean {
	return matter(fs.readFileSync(filePath, 'utf-8')).data.hidden === true;
}

export function getDocsHierarchy(
	dir: string,
	baseDir: string = dir,
): DocSection[] {
	const hierarchy: DocSection[] = [];
	const metaPath = path.join(dir, '_meta.js');

	let meta: Record<string, string> = {};
	if (fs.existsSync(metaPath)) {
		try {
			// This is a bit hacky because we are in a Node environment trying to read a JS file
			// In a real Next.js app, we might use import() but that's async and depends on the build
			// For simplicity, we'll parse it as a basic object if it's simple, or just use readdir
			const metaContent = fs.readFileSync(metaPath, 'utf-8');
			// Crude extraction of the export default object
			const match = metaContent.match(/export default (\{[\s\S]*?\});/);
			if (match) {
				// Eval is dangerous, but we trust our own files in this context
				// Alternatively, we could just use fs.readdirSync and sort alphabetically
				// Let's try a safer approach: regex to get keys and values
				const entries = match[1].match(/'?([\w-]+)'?:\s*'(.+?)'/g);
				if (entries) {
					for (const entry of entries) {
						// Split on the first colon only: titles such as
						// "How-to: Mocking Infinite Scroll" contain colons.
						const separator = entry.indexOf(':');
						const key = entry.slice(0, separator).trim().replace(/^'|'$/g, '');
						const value = entry
							.slice(separator + 1)
							.trim()
							.replace(/^'|'$/g, '');
						meta[key] = value;
					}
				}
			}
		} catch (e) {
			console.error(`Error parsing ${metaPath}:`, e);
		}
	}

	// Get all files and directories
	const items = fs.readdirSync(dir);

	// If we have meta, follow its order
	const orderedKeys =
		Object.keys(meta).length > 0
			? Object.keys(meta)
			: items.map((i) => i.replace(/\.mdx$/, ''));

	for (const key of orderedKeys) {
		const mdxPath = path.join(dir, `${key}.mdx`);
		const subDir = path.join(dir, key);

		if (fs.existsSync(mdxPath)) {
			const fileContent = fs.readFileSync(mdxPath, 'utf-8');
			const { content, data } = matter(fileContent);
			if (data.hidden === true) continue;
			const relativePath = path
				.relative(baseDir, mdxPath)
				.replace(/\.mdx$/, '');

			hierarchy.push({
				title: meta[key] || data.title || key,
				path: `/docs/${relativePath === 'index' ? '' : relativePath}`,
				description: data.description,
				content: toLlmText(content.trim()),
			});
		} else if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
			const items = getDocsHierarchy(subDir, baseDir);
			if (items.length === 0) continue;
			hierarchy.push({
				title: meta[key] || key,
				path: `/docs/${path.relative(baseDir, subDir)}`,
				items,
			});
		}
	}

	return hierarchy;
}

export function findSectionByPath(
	hierarchy: DocSection[],
	targetPath: string,
): DocSection | undefined {
	// Normalize target path (remove trailing slash, ensure leading /docs/)
	const normalizedTarget = targetPath.startsWith('/docs')
		? targetPath
		: `/docs/${targetPath}`;
	const cleanTarget = normalizedTarget.replace(/\/$/, '') || '/docs';

	for (const section of hierarchy) {
		const cleanSectionPath = section.path.replace(/\/$/, '');

		if (cleanSectionPath === cleanTarget) {
			return section;
		}

		if (section.items) {
			const found = findSectionByPath(section.items, targetPath);
			if (found) return found;
		}
	}

	return undefined;
}

/**
 * Canonical plain-text URL for a docs section, shared by every llms route:
 * `/docs/` → `/llms/docs/index.txt`, `/docs/guides/x` → `/llms/docs/guides/x.txt`.
 */
export function toLlmsTxtPath(sectionPath: string): string {
	const relative = sectionPath.replace(/^\/docs\/?/, '').replace(/\/$/, '');
	return `/llms/docs/${relative || 'index'}.txt`;
}

/** Maps `/llms/docs/...` route segments back to a `/docs/...` section path. */
export function llmsSegmentsToDocsPath(segments: string[]): string {
	const joined = segments.join('/').replace(/\.txt$/, '');
	return joined === '' || joined === 'index' ? '/docs' : `/docs/${joined}`;
}

// Capitalized MDX components plus layout-only HTML wrappers.
const BLOCK_TAG_NAME = '(?:[A-Z][\\w.]*|div|section|ul|ol|span|p|button)';
const JSX_OPEN_TAG = new RegExp(`^<${BLOCK_TAG_NAME}\\b[^>]*?\\/?>`);
const BLOCK_TAG = new RegExp(`<(\\/?)(${BLOCK_TAG_NAME})\\b[^>]*?(\\/?)>`, 'g');

/** Converts the inline HTML that carries meaning into Markdown. */
function convertInlineHtml(segment: string): string {
	const text = (value: string) => value.replace(/<[^>]+>/g, '').trim();
	return segment
		.replace(
			/<a\s[^>]*?href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g,
			(_m, href: string, label: string) => `[${text(label)}](${href})`,
		)
		.replace(
			/<li\b[^>]*>([\s\S]*?)<\/li>/g,
			(_m, item: string) => `- ${text(item)}`,
		)
		.replace(
			/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g,
			(_m, level: string, heading: string) =>
				`${'#'.repeat(Number(level))} ${text(heading)}`,
		)
		.replace(
			/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/g,
			(_m, _tag: string, bold: string) => `**${text(bold)}**`,
		)
		.replace(
			/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/g,
			(_m, quote: string) =>
				text(quote)
					.split('\n')
					.map((line) => `> ${line.trim()}`)
					.join('\n'),
		)
		.replace(/<br\s*\/?>/g, '');
}

function stripJsxTags(line: string): string {
	return line.replace(BLOCK_TAG, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

/** Turns `<Link href>` cards into `- [Title](href): Description` lines. */
function convertLinkCards(segment: string): string {
	return segment.replace(
		/<Link\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/Link>/g,
		(_match, href: string, inner: string) => {
			const pick = (tag: string) =>
				inner
					.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1]
					?.replace(/<[^>]+>/g, '')
					.trim();
			const title =
				pick('CardTitle') ??
				inner
					.replace(/<[^>]+>/g, ' ')
					.replace(/\s+/g, ' ')
					.trim();
			const description = pick('CardDescription');
			if (!title) return '';
			return `\n- [${title}](${href})${description ? `: ${description}` : ''}\n`;
		},
	);
}

/**
 * Converts MDX page content into plain Markdown for LLM consumers: drops
 * `import`/`export` lines, React component markup (cards, icons, alerts,
 * tabs) and layout HTML while keeping their text, converts meaningful inline
 * HTML (links, list items, headings, bold) to Markdown, and leaves fenced
 * code blocks untouched.
 */
export function toLlmText(content: string): string {
	const parts = content.split(/(^```[\s\S]*?^```[^\n]*$)/m);
	const cleaned = parts.map((part, index) => {
		if (index % 2 === 1) return part; // fenced code block
		let depth = 0;
		const lines = convertInlineHtml(convertLinkCards(part)).split('\n');
		const output: string[] = [];
		for (const rawLine of lines) {
			if (depth === 0 && /^(import|export)\s/.test(rawLine)) continue;
			const trimmed = rawLine.trim();
			const insideJsx = depth > 0 || JSX_OPEN_TAG.test(trimmed);
			for (const tag of trimmed.matchAll(BLOCK_TAG)) {
				if (tag[3] === '/') continue; // self-closing
				depth += tag[1] === '/' ? -1 : 1;
			}
			depth = Math.max(depth, 0);
			const text = stripJsxTags(insideJsx ? trimmed : rawLine);
			if (insideJsx && !text.trim()) continue;
			output.push(insideJsx ? text.trim() : text);
		}
		return output.join('\n');
	});
	return cleaned
		.join('')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/** Renders one docs section (and links to its children) as plain Markdown. */
export function renderLlmsSection(
	section: DocSection,
	baseUrl: string,
): string {
	let output = `# ${section.title}\n`;
	output += `> ${section.description || `Documentation section for Mockzilla: ${section.path}`}\n\n`;
	output += `Source: ${baseUrl}${section.path} · Index: ${baseUrl}/llms.txt\n\n`;

	if (section.content) {
		output += `${section.content}\n\n`;
	}

	if (section.items && section.items.length > 0) {
		output += '## Pages in this section\n';
		for (const item of section.items) {
			const description = item.description ? `: ${item.description}` : '';
			output += `- [${item.title}](${baseUrl}${toLlmsTxtPath(item.path)})${description}\n`;
		}
	}

	return output;
}
