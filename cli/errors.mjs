// @ts-check

export const AGENT_HINT = 'mockzilla agent-skill';
const HUMAN_AGENT_HINT =
	'Agent guidance: run `mockzilla agent-skill` for Mockzilla CLI instructions.';

/**
 * @param {unknown} error
 * @returns {string}
 */
export function getErrorMessage(error) {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	if (typeof error === 'object' && error !== null) {
		if ('message' in error && typeof error.message === 'string') {
			return error.message;
		}
		if ('error' in error && typeof error.error === 'string') {
			return error.error;
		}
	}
	return String(error);
}

/**
 * @param {unknown} error
 * @param {boolean} json
 * @returns {string}
 */
export function formatCliError(error, json) {
	const message = getErrorMessage(error);
	if (json) {
		return `${JSON.stringify({ error: message, agentHint: AGENT_HINT })}\n`;
	}
	return `Error: ${message}\n\n${HUMAN_AGENT_HINT}\n`;
}
