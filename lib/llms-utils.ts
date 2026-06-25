import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export interface DocSection {
	title: string;
	path: string;
	description?: string;
	content?: string;
	items?: DocSection[];
}

export function getDocsHierarchy(dir: string, baseDir: string = dir): DocSection[] {
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
						const [key, value] = entry.split(':').map(s => s.trim().replace(/^'|'$/g, ''));
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
	const orderedKeys = Object.keys(meta).length > 0 ? Object.keys(meta) : items.map(i => i.replace(/\.mdx$/, ''));

	for (const key of orderedKeys) {
		const mdxPath = path.join(dir, `${key}.mdx`);
		const subDir = path.join(dir, key);
		
		if (fs.existsSync(mdxPath)) {
			const fileContent = fs.readFileSync(mdxPath, 'utf-8');
			const { content, data } = matter(fileContent);
			const relativePath = path.relative(baseDir, mdxPath).replace(/\.mdx$/, '');
			
			hierarchy.push({
				title: meta[key] || data.title || key,
				path: `/docs/${relativePath === 'index' ? '' : relativePath}`,
				description: data.description,
				content: content.trim()
			});
		} else if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
			hierarchy.push({
				title: meta[key] || key,
				path: `/docs/${path.relative(baseDir, subDir)}`,
				items: getDocsHierarchy(subDir, baseDir)
			});
		}
	}

	return hierarchy;
}

export function findSectionByPath(hierarchy: DocSection[], targetPath: string): DocSection | undefined {
	// Normalize target path (remove trailing slash, ensure leading /docs/)
	const normalizedTarget = targetPath.startsWith('/docs') ? targetPath : `/docs/${targetPath}`;
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
