// @ts-check

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SKILL_URL = new URL(
	'../.agent/skills/mockzilla-cli/SKILL.md',
	import.meta.url,
);

/**
 * @returns {Promise<string>}
 */
export function readAgentSkill() {
	return readFile(fileURLToPath(SKILL_URL), 'utf8');
}
