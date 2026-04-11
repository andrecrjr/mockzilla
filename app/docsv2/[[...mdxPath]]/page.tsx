import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'content/docsv2');

function getMdxFiles(dir: string, prefix = ''): string[] {
  const files: string[] = [];
  for (const file of readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      files.push(...getMdxFiles(fullPath, `${prefix}${file}/`));
    } else if (file.endsWith('.mdx')) {
      files.push(`${prefix}${file.replace('.mdx', '')}`);
    }
  }
  return files;
}

function generateSidebar() {
  return getMdxFiles(CONTENT_DIR).map(slug => {
    const title = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { slug, title };
  });
}

export function generateStaticParams() {
  const files = getMdxFiles(CONTENT_DIR);
  return files.map(slug => ({
    mdxPath: slug === 'index' ? [] : slug.split('/'),
  }));
}

export default async function DocPage({ params }: { params: Promise<{ mdxPath?: string[] }> }) {
  const { mdxPath = [] } = await params;
  const slug = mdxPath.length === 0 ? 'index' : mdxPath.join('/');
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);

  try {
    const content = readFileSync(filePath, 'utf-8');
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 prose dark:prose-invert">
        <MDXRemote source={content} />
      </div>
    );
  } catch {
    notFound();
  }
}

export { generateSidebar };
