import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { mdxComponents } from '@/mdx-components';

const CONTENT_DIR = path.join(process.cwd(), 'content/docs');

// Re-export buildSidebar for use in layout
export { buildSidebar };

export interface MetaEntry {
	slug: string;
	title: string;
	isSection?: boolean;
}

function parseMetaFile(
	dir: string,
): Record<string, { title?: string; hidden?: boolean }> {
	const metaFile = path.join(dir, '_meta.js');
	try {
		if (!existsSync(metaFile)) return {};
		const content = readFileSync(metaFile, 'utf-8');
		const entries: Record<string, { title?: string; hidden?: boolean }> = {};

		// Regex to capture keys and their string or object values in the order they appear
		const regex = /['"]?([\w-]+)['"]?\s*:\s*({[\s\S]*?}|['"][^'"]+['"])/g;

		let match = regex.exec(content);
		while (match !== null) {
			const key = match[1];
			const val = match[2];

			let title: string | undefined;
			let hidden = false;

			if (val.startsWith('{')) {
				const titleMatch = /title\s*:\s*['"]([^'"]+)['"]/.exec(val);
				if (titleMatch) title = titleMatch[1];
				if (/display\s*:\s*['"]hidden['"]/.test(val)) hidden = true;
			} else {
				title = val.replace(/['"]/g, '');
			}

			entries[key] = { title, hidden };
			match = regex.exec(content);
		}
		return entries;
	} catch {
		return {};
	}
}

function buildSidebar(
	dir: string = CONTENT_DIR,
	base: string = '',
): MetaEntry[] {
	const meta = parseMetaFile(dir);
	const entries: MetaEntry[] = [];
	const metaKeys = Object.keys(meta);

	// Follow the order in _meta.js
	for (const key of metaKeys) {
		const metaEntry = meta[key];
		if (metaEntry.hidden) continue;

		const slug = base ? `${base}/${key}` : key;
		const fullPath = path.join(dir, key);

		// Check if it's an MDX file
		if (existsSync(`${fullPath}.mdx`)) {
			entries.push({
				slug,
				title:
					metaEntry.title ||
					key
						.split('-')
						.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
						.join(' '),
			});
		} else if (existsSync(fullPath) && statSync(fullPath).isDirectory()) {
			// It's a directory, add a section header then recursively add its children
			entries.push({
				slug: `section-${slug}`,
				title:
					metaEntry.title ||
					key
						.split('-')
						.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
						.join(' '),
				isSection: true,
			});
			entries.push(...buildSidebar(fullPath, slug));
		}
	}

	// Fallback for files not in _meta.js
	const files = readdirSync(dir);
	for (const file of files) {
		if (file.startsWith('_meta') || file === 'index.mdx') continue;
		const name = file.replace(/\.mdx$/, '');
		if (metaKeys.includes(name)) continue;

		const slug = base ? `${base}/${name}` : name;
		const fullPath = path.join(dir, file);

		if (file.endsWith('.mdx')) {
			entries.push({
				slug,
				title: name
					.split('-')
					.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
					.join(' '),
			});
		} else if (statSync(fullPath).isDirectory()) {
			// Only add if we haven't already processed this as a subdirectory from meta
			if (
				!entries.some(
					(e) =>
						e.slug === `section-${slug}` ||
						e.slug === slug ||
						e.slug.startsWith(`${slug}/`),
				)
			) {
				entries.push({
					slug: `section-${slug}`,
					title: name
						.split('-')
						.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
						.join(' '),
					isSection: true,
				});
				entries.push(...buildSidebar(fullPath, slug));
			}
		}
	}

	return entries;
}

export function generateStaticParams() {
	function getAllFiles(dir: string, base: string = ''): string[] {
		const files: string[] = [];
		if (!existsSync(dir)) return [];
		for (const file of readdirSync(dir)) {
			const fullPath = path.join(dir, file);
			if (statSync(fullPath).isDirectory()) {
				files.push(...getAllFiles(fullPath, base ? `${base}/${file}` : file));
			} else if (file.endsWith('.mdx')) {
				const name = file.replace(/\.mdx$/, '');
				if (name === 'index') {
					files.push(base || ''); // Empty string for root index, directory name for sub-index
				} else {
					files.push(base ? `${base}/${name}` : name);
				}
			}
		}
		return files;
	}

	const allFiles = getAllFiles(CONTENT_DIR);
	return allFiles.map((slug) => ({
		mdxPath: slug === '' ? [] : slug.split('/'),
	}));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ mdxPath?: string[] }>;
}) {
	const { mdxPath = [] } = await params;
	const slug = mdxPath.length === 0 ? 'index' : mdxPath.join('/');

	let filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
	if (!existsSync(filePath)) {
		filePath = path.join(CONTENT_DIR, slug, 'index.mdx');
	}

	try {
		if (!existsSync(filePath)) throw new Error('File not found');
		const fileContent = readFileSync(filePath, 'utf-8');
		const { data } = matter(fileContent);
		const title = data.title
			? `${data.title} | Mockzilla Docs`
			: 'Mockzilla Documentation';
		const description =
			data.description ||
			'Learn how to use Mockzilla for API mocking, browser interception, and stateful workflows.';

		return {
			title,
			description,
			openGraph: {
				title,
				description,
				type: 'article',
				url: `https://mockzilla.dev/docs/${mdxPath.join('/')}`,
				images: [
					{
						url: '/mockzilla-logo.png',
						width: 800,
						height: 600,
						alt: 'Mockzilla Documentation',
					},
				],
			},
			twitter: {
				card: 'summary_large_image',
				title,
				description,
			},
		};
	} catch {
		return {
			title: 'Mockzilla Docs',
			description: 'Mockzilla documentation',
		};
	}
}

export default async function DocPage({
	params,
}: {
	params: Promise<{ mdxPath?: string[] }>;
}) {
	const { mdxPath = [] } = await params;
	const slug = mdxPath.length === 0 ? 'index' : mdxPath.join('/');

	let filePath = path.join(CONTENT_DIR, `${slug}.mdx`);

	if (!existsSync(filePath)) {
		const indexFilePath = path.join(CONTENT_DIR, slug, 'index.mdx');
		if (existsSync(indexFilePath)) {
			filePath = indexFilePath;
		} else if (slug === 'index') {
			// Root index fallback if index.mdx doesn't exist (though it should now)
			redirect('/docs/getting-started/quick-start');
		} else {
			notFound();
		}
	}

	try {
		const fileContent = readFileSync(filePath, 'utf-8');
		const { content, data: frontmatter } = matter(fileContent);

		const sidebar = buildSidebar();
		const navItems = sidebar.filter((item) => !item.isSection);

		// Normalize slug for sidebar matching: if it's 'index', we might need to match it correctly
		const currentIndex = navItems.findIndex((item) => {
			const itemSlug = item.slug === 'index' ? '' : item.slug;
			return itemSlug === (slug === 'index' ? '' : slug);
		});

		const prev = currentIndex > 0 ? navItems[currentIndex - 1] : null;
		const next =
			currentIndex < navItems.length - 1 ? navItems[currentIndex + 1] : null;

		return (
			<div className="max-w-4xl mx-auto px-6 py-8">
				<article className="prose dark:prose-invert prose-code:before:content-none prose-code:after:content-none max-w-none">
					<MDXRemote
						source={content}
						components={mdxComponents}
						options={{
							mdxOptions: {
								remarkPlugins: [remarkGfm],
								rehypePlugins: [rehypeSlug],
							},
						}}
					/>
				</article>

				<nav className="mt-16 pt-8 border-t flex flex-col sm:flex-row gap-4 justify-between items-center">
					{prev ? (
						<Link
							href={`/docs/${prev.slug === 'index' ? '' : prev.slug}`}
							className="flex items-center gap-2 px-4 py-3 rounded-xl border bg-card hover:bg-muted transition-colors w-full sm:w-auto group"
						>
							<ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
							<div className="flex flex-col">
								<span className="text-xs text-muted-foreground">Previous</span>
								<span className="text-sm font-medium">{prev.title}</span>
							</div>
						</Link>
					) : (
						<div />
					)}

					{next ? (
						<Link
							href={`/docs/${next.slug === 'index' ? '' : next.slug}`}
							className="flex items-center justify-end gap-2 px-4 py-3 rounded-xl border bg-card hover:bg-muted transition-colors w-full sm:w-auto group text-right ml-auto"
						>
							<div className="flex flex-col">
								<span className="text-xs text-muted-foreground">Next</span>
								<span className="text-sm font-medium">{next.title}</span>
							</div>
							<ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
						</Link>
					) : (
						<div />
					)}
				</nav>
			</div>
		);
	} catch (error) {
		console.error('[Docs] Error rendering MDX page:', error);
		notFound();
	}
}
