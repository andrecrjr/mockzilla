export function resolvePath(path: string, data: unknown, root: unknown = data): unknown {
	const cleanPath = path.startsWith('$.')
		? path.slice(2)
		: path.startsWith('$')
			? path.slice(1)
			: path;

	if (!cleanPath) return data;

	// Improved splitting: split by dots, but ignore dots inside brackets
	// Also split by brackets
	const parts: string[] = [];
	let currentPart = '';
	let inBrackets = 0;

	for (let i = 0; i < cleanPath.length; i++) {
		const char = cleanPath[i];
		if (char === '[') {
			if (inBrackets === 0 && currentPart) {
				parts.push(currentPart);
				currentPart = '';
			}
			inBrackets++;
		} else if (char === ']') {
			inBrackets--;
			if (inBrackets === 0) {
				parts.push(currentPart);
				currentPart = '';
			}
		} else if (char === '.' && inBrackets === 0) {
			if (currentPart) {
				parts.push(currentPart);
				currentPart = '';
			}
		} else {
			currentPart += char;
		}
	}
	if (currentPart) parts.push(currentPart);

	let current = data;
	for (const part of parts) {
		if (current === null || current === undefined) return undefined;

		if (/^\d+$/.test(part)) {
			const arrayIndex = parseInt(part, 10);
			current = (current as Record<string, unknown>)[arrayIndex];
		} else if (part.includes('=') && Array.isArray(current)) {
			const [key, value] = part.split(/==?/).map((s) => s.trim());
			let finalValue = value;
			const isDynamic =
				value.includes('.') ||
				value.startsWith('state') ||
				value.startsWith('input') ||
				value.startsWith('db') ||
				(root !== null && typeof root === 'object' && value in root);

			if (isDynamic) {
				const resolved = resolvePath(value, root, root);
				if (resolved !== undefined) {
					finalValue = String(resolved);
				}
			}
			current = current.find((item) => {
				if (!item || typeof item !== 'object') return false;
				const itemVal = (item as Record<string, unknown>)[key];
				return String(itemVal) === finalValue;
			});
		} else {
			current = (current as Record<string, unknown>)[part];
		}
	}

	return current;
}
