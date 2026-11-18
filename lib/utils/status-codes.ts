export type StatusCodeOption = { value: string; label: string };

export const STATUS_CODE_OPTIONS: StatusCodeOption[] = [
	{ value: '200', label: '200 - OK' },
	{ value: '201', label: '201 - Created' },
	{ value: '202', label: '202 - Accepted' },
	{ value: '204', label: '204 - No Content' },
	{ value: '400', label: '400 - Bad Request' },
	{ value: '401', label: '401 - Unauthorized' },
	{ value: '403', label: '403 - Forbidden' },
	{ value: '404', label: '404 - Not Found' },
	{ value: '405', label: '405 - Method Not Allowed' },
	{ value: '409', label: '409 - Conflict' },
	{ value: '422', label: '422 - Unprocessable Entity' },
	{ value: '500', label: '500 - Internal Server Error' },
	{ value: '502', label: '502 - Bad Gateway' },
	{ value: '503', label: '503 - Service Unavailable' },
];

/**
 * Returns the selectable status codes, keeping a stored code that is not in
 * the preset list (e.g. 301 or 418 from an import) so the Select never
 * renders blank.
 */
export function getStatusCodeOptions(
	current: string | number | null | undefined,
): StatusCodeOption[] {
	const value =
		current === null || current === undefined ? '' : String(current);
	if (!value || STATUS_CODE_OPTIONS.some((option) => option.value === value)) {
		return STATUS_CODE_OPTIONS;
	}
	return [...STATUS_CODE_OPTIONS, { value, label: value }].sort(
		(a, b) => Number(a.value) - Number(b.value),
	);
}
