import { MDXRemote, type MDXRemoteProps } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { mdxComponents } from '@/mdx-components';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CONTENT_DIR = path.join(process.cwd(), 'content/docs');
const META_FILE = path.join(CONTENT_DIR, '_meta.js');

// Re-export buildSidebar for use in layout
export { buildSidebar };

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
    const title = data.title ? `${data.title} | Mockzilla Docs` : 'Mockzilla Documentation';
    const description = data.description || 'Learn how to use Mockzilla for API mocking, browser interception, and stateful workflows.';
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        url: `https://mockzilla.dev/docs/${slug === 'index' ? '' : slug}`,
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

export default async function DocPage({ params }: { params: Promise<{ mdxPath?: string[] }> }) {
  const { mdxPath = [] } = await params;
  const slug = mdxPath.length === 0 ? 'index' : mdxPath.join('/');
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);

  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const { content } = matter(fileContent);

    const sidebar = buildSidebar();
    const currentIndex = sidebar.findIndex(item => item.slug === slug);
    const prev = currentIndex > 0 ? sidebar[currentIndex - 1] : null;
    const next = currentIndex < sidebar.length - 1 ? sidebar[currentIndex + 1] : null;

    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <article className="prose dark:prose-invert prose-code:before:content-none prose-code:after:content-none max-w-none">
          <MDXRemote
            source={content}
            components={mdxComponents}
            options={{ 
              mdxOptions: { 
                remarkPlugins: [remarkGfm],
                rehypePlugins: [rehypeSlug]
              } 
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
  } catch {
    notFound();
  }
}
