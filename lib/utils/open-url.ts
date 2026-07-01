interface TauriRuntimeWindow extends Window {
	__TAURI__?: unknown;
	__TAURI_INTERNALS__?: unknown;
}

type ExternalUrlOpener = (url: string) => Promise<void>;

export function isTauriRuntime(): boolean {
	if (typeof window === 'undefined') {
		return false;
	}

	const tauriWindow = window as TauriRuntimeWindow;
	return Boolean(tauriWindow.__TAURI__ || tauriWindow.__TAURI_INTERNALS__);
}

function openBrowserWindow(url: string): void {
	window.open(url, '_blank', 'noopener,noreferrer');
}

async function openWithTauriOpener(url: string): Promise<void> {
	const { openUrl } = await import('@tauri-apps/plugin-opener');
	await openUrl(url);
}

export async function openUrlInNewContext(
	url: string,
	openExternalUrl: ExternalUrlOpener = openWithTauriOpener,
): Promise<void> {
	if (typeof window === 'undefined') {
		return;
	}

	if (!isTauriRuntime()) {
		openBrowserWindow(url);
		return;
	}

	try {
		await openExternalUrl(url);
	} catch (_error) {
		openBrowserWindow(url);
	}
}
