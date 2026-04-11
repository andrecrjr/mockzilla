import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { mdxComponents } from '../../../mdx-components';

const CONTENT_DIR = path.join(process.cwd(), 'content/docs');
const META_FILE = path.join(CONTENT_DIR, '_meta.js');

interface MetaEntry {
  slug: string;
  title: string;
  order: number;
}

function parseMetaFile(): Record<string, { title: string; order: number }> {
  try {
    const content = readFileSync(META_FILE, 'utf-8');
    // Extract key-value pairs from the JS object
    const entries: Record<string, { title: string; order: number }> = {};
    let order = 0;
    // Match both quoted and unquoted keys: index: "Overview" or "wildcard-variants": "Wildcard"
    const regex = /['"]?(\w[\w-]*)['"]?\s*:\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      entries[match[1]] = { title: match[2], order: order++ };
    }
    return entries;
  } catch {
    return {};
  }
}

function getMdxFiles(dir: string): string[] {
  const files: string[] = [];
  for (const file of readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (statSync(fullPath).isDirectory()) continue;
    if (file.endsWith('.mdx') && !file.startsWith('_meta')) {
      files.push(file.replace('.mdx', ''));
    }
  }
  return files;
}

function buildSidebar(): MetaEntry[] {
  const files = getMdxFiles(CONTENT_DIR);
  const meta = parseMetaFile();

  const entries: MetaEntry[] = files.map((slug) => {
    const metaEntry = meta[slug];
    if (metaEntry) {
      return { slug, title: metaEntry.title, order: metaEntry.order };
    }
    return {
      slug,
      title: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      order: 999,
    };
  });

  entries.sort((a, b) => a.order - b.order);
  return entries;
}

export function generateStaticParams() {
  const files = getMdxFiles(CONTENT_DIR);
  return files.map(slug => ({
    mdxPath: slug === 'index' ? [] : slug.split('/'),
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ mdxPath?: string[] }> }) {
  const { mdxPath = [] } = await params;
  const slug = mdxPath.length === 0 ? 'index' : mdxPath.join('/');
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);

  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const { data } = matter(fileContent);
    return {
      title: data.title ? `${data.title} | Mockzilla Docs` : undefined,
    };
  } catch {
    return {};
  }
}

export default async function DocPage({ params }: { params: Promise<{ mdxPath?: string[] }> }) {
  const { mdxPath = [] } = await params;
  const slug = mdxPath.length === 0 ? 'index' : mdxPath.join('/');
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);

  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const { content } = matter(fileContent);
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 prose dark:prose-invert prose-code:before:content-none prose-code:after:content-none">
        <MDXRemote source={content} components={mdxComponents} />
      </div>
    );
  } catch {
    notFound();
  }
}

export { buildSidebar };
