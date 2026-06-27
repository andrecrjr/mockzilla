import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { isTauriRuntime, openUrlInNewContext } from '../../lib/utils/open-url';

interface TestTauriWindow extends Window {
	__TAURI__?: unknown;
	__TAURI_INTERNALS__?: unknown;
}

const testUrl = 'http://127.0.0.1:36666/api/mock/demo/users';

function setTauriMarker(value: unknown): void {
	Object.defineProperty(window, '__TAURI__', {
		configurable: true,
		value,
	});
}

function clearTauriMarker(): void {
	const tauriWindow = window as TestTauriWindow;
	delete tauriWindow.__TAURI__;
	delete tauriWindow.__TAURI_INTERNALS__;
}

describe('openUrlInNewContext', () => {
	let openedUrls: string[];
	let originalOpen: typeof window.open;

	beforeEach(() => {
		openedUrls = [];
		originalOpen = window.open;
		window.open = ((url?: string | URL) => {
			if (url) {
				openedUrls.push(String(url));
			}
			return null;
		}) as typeof window.open;
		clearTauriMarker();
	});

	afterEach(() => {
		window.open = originalOpen;
		clearTauriMarker();
	});

	it('opens a normal browser window outside Tauri', async () => {
		let openerCalled = false;

		await openUrlInNewContext(testUrl, async () => {
			openerCalled = true;
		});

		expect(openerCalled).toBe(false);
		expect(openedUrls).toEqual([testUrl]);
	});

	it('uses the Tauri opener when running in desktop', async () => {
		const openedWithTauri: string[] = [];
		setTauriMarker({});

		await openUrlInNewContext(testUrl, async (url) => {
			openedWithTauri.push(url);
		});

		expect(isTauriRuntime()).toBe(true);
		expect(openedWithTauri).toEqual([testUrl]);
		expect(openedUrls).toEqual([]);
	});

	it('falls back to browser window opening if the Tauri opener fails', async () => {
		setTauriMarker({});

		await openUrlInNewContext(testUrl, async () => {
			throw new Error('opener failed');
		});

		expect(openedUrls).toEqual([testUrl]);
	});
});
