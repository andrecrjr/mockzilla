interface TauriRuntimeWindow extends Window {
	__TAURI__?: unknown;
	__TAURI_INTERNALS__?: unknown;
}

function isTauriRuntime(): boolean {
	if (typeof window === 'undefined') {
		return false;
	}

	const tauriWindow = window as TauriRuntimeWindow;
	return Boolean(tauriWindow.__TAURI__ || tauriWindow.__TAURI_INTERNALS__);
}

function openBrowserWindow(url: string): void {
	window.open(url, '_blank', 'noopener,noreferrer');
}

export async function openUrlInNewContext(url: string): Promise<void> {
	if (typeof window === 'undefined') {
		return;
	}

	if (!isTauriRuntime()) {
		openBrowserWindow(url);
		return;
	}

	try {
		const { openUrl } = await import('@tauri-apps/plugin-opener');
		await openUrl(url);
	} catch (_error) {
		openBrowserWindow(url);
	}
}
