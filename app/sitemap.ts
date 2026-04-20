import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import type { MetadataRoute } from 'next';

const CONTENT_DIR = path.join(process.cwd(), 'content/docs');

function getMdxFiles(dir: string): string[] {
	try {
		const files: string[] = [];
		const items = readdirSync(dir);
		for (const item of items) {
			const fullPath = path.join(dir, item);
			if (statSync(fullPath).isDirectory()) continue;
			if (item.endsWith('.mdx') && !item.startsWith('_meta')) {
				files.push(item.replace('.mdx', ''));
			}
		}
		return files;
	} catch {
		return [];
	}
}

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = 'https://mockzilla.dev';

	// Static routes
	const routes = ['', '/app'].map((route) => ({
		url: `${baseUrl}${route}`,
		lastModified: new Date(),
		changeFrequency: 'weekly' as const,
		priority: route === '' ? 1 : 0.8,
	}));

	// Doc routes
	const docFiles = getMdxFiles(CONTENT_DIR);
	const docRoutes = docFiles.map((slug) => ({
		url: `${baseUrl}/docs/${slug === 'index' ? '' : slug}`,
		lastModified: new Date(),
		changeFrequency: 'monthly' as const,
		priority: slug === 'index' ? 0.9 : 0.7,
	}));

	return [...routes, ...docRoutes];
}
