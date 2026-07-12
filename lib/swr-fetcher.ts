export async function swrFetcher<T>(url: string): Promise<T> {
	const response = await fetch(url, { cache: 'no-store' });

	if (!response.ok) {
		let message = `Request failed with status ${response.status}`;
		try {
			const errorBody: unknown = await response.json();
			if (
				typeof errorBody === 'object' &&
				errorBody !== null &&
				'error' in errorBody &&
				typeof errorBody.error === 'string'
			) {
				message = errorBody.error;
			}
		} catch {
			// Keep the HTTP status message when the error response is not JSON.
		}
		throw new Error(message);
	}

	return (await response.json()) as T;
}
