import { openUrl } from '@tauri-apps/plugin-opener';

interface TauriRuntimeWindow extends Window {
	__TAURI__?: unknown;
	__TAURI_INTERNALS__?: unknown;
}

export function isTauriRuntime(): boolean {
	if (typeof window === 'undefined') {
		return false;
	}

	const tauriWindow = window as TauriRuntimeWindow;
	return Boolean(tauriWindow.__TAURI__ || tauriWindow.__TAURI_INTERNALS__);
}

export async function openUrlInNewContext(url: string): Promise<void> {
	if (typeof window === 'undefined') {
		return;
	}

	if (isTauriRuntime()) {
		await openUrl(url);
		return;
	}

	window.open(url, '_blank', 'noopener,noreferrer');
}
