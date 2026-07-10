import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { isTauriRuntime, openUrlInNewContext } from '../../lib/utils/open-url';

interface TestTauriWindow extends Window {
	__TAURI__?: unknown;
	__TAURI_INTERNALS__?: TestTauriInternals;
}

interface TestTauriInternals {
	invoke: (command: string, args: Record<string, unknown>) => Promise<void>;
}

const testUrl = 'http://127.0.0.1:36666/api/mock/demo/users';
const invoke = mock(
	async (_command: string, _args: Record<string, unknown>) => undefined,
);

function setTauriInternals(): void {
	Object.defineProperty(window, '__TAURI_INTERNALS__', {
		configurable: true,
		value: { invoke },
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
		invoke.mockClear();
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
		await openUrlInNewContext(testUrl);

		expect(invoke).not.toHaveBeenCalled();
		expect(openedUrls).toEqual([testUrl]);
	});

	it('uses the Tauri opener when running in desktop', async () => {
		setTauriInternals();

		await openUrlInNewContext(testUrl);

		expect(isTauriRuntime()).toBe(true);
		expect(invoke).toHaveBeenCalledWith(
			'plugin:opener|open_url',
			{
				url: testUrl,
				with: undefined,
			},
			undefined,
		);
		expect(openedUrls).toEqual([]);
	});
});
