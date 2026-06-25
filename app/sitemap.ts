import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import type { MetadataRoute } from 'next';

const CONTENT_DIR = path.join(process.cwd(), 'content/docs');
const DEPLOY_MODE = process.env.DEPLOY_MODE || 'full';

function getMdxPaths(dir: string, baseDir: string = dir): string[] {
	try {
		let results: string[] = [];
		const items = readdirSync(dir);
		for (const item of items) {
			const fullPath = path.join(dir, item);
			if (statSync(fullPath).isDirectory()) {
				results = [...results, ...getMdxPaths(fullPath, baseDir)];
			} else if (item.endsWith('.mdx') && !item.startsWith('_meta')) {
				const relativePath = path.relative(baseDir, fullPath).replace(/\.mdx$/, '');
				results.push(relativePath);
			}
		}
		return results;
	} catch {
		return [];
	}
}

export default function sitemap(): MetadataRoute.Sitemap {
	// Only generate sitemap in landing mode
	if (DEPLOY_MODE !== 'landing') {
		return [];
	}

	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mockzilla.dev';

	// Static routes (Removed /app)
	const routes: MetadataRoute.Sitemap = [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: 'weekly',
			priority: 1,
		},
	];

	// Doc routes
	const docPaths = getMdxPaths(CONTENT_DIR);
	const docRoutes: MetadataRoute.Sitemap = docPaths.map((slug) => {
		const cleanSlug = slug === 'index' ? '' : slug.replace(/\/index$/, '');
		return {
			url: `${baseUrl}/docs/${cleanSlug}`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: cleanSlug === '' ? 0.9 : 0.7,
		};
	});

	// Deduplicate in case of index vs directory conflicts
	const allRoutes = [...routes, ...docRoutes];
	const uniqueRoutes = Array.from(new Map(allRoutes.map(item => [item.url.replace(/\/$/, ''), item])).values());

	return uniqueRoutes;
}
