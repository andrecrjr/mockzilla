import type { Folder, Mock } from './types';

const FOLDERS_KEY = 'mockzilla:folders';
const MOCKS_KEY = 'mockzilla:mocks';

export const storage = {
	folders: {
		getAll: (): Folder[] => {
			if (typeof window === 'undefined') return [];
			const data = localStorage.getItem(FOLDERS_KEY);
			return data ? JSON.parse(data) : [];
		},
		add: (folder: Folder) => {
			const folders = storage.folders.getAll();
			folders.push(folder);
			localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
		},
		update: (id: string, folder: Partial<Folder>) => {
			const folders = storage.folders.getAll();
			const index = folders.findIndex((f) => f.id === id);
			if (index !== -1) {
				folders[index] = { ...folders[index], ...folder };
				localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
			}
		},
		delete: (id: string) => {
			const folders = storage.folders.getAll().filter((f) => f.id !== id);
			localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
		},
	},
	mocks: {
		getAll: (): Mock[] => {
			if (typeof window === 'undefined') return [];
			const data = localStorage.getItem(MOCKS_KEY);
			return data ? JSON.parse(data) : [];
		},
		add: (mock: Mock) => {
			const mocks = storage.mocks.getAll();
			mocks.push(mock);
			localStorage.setItem(MOCKS_KEY, JSON.stringify(mocks));
		},
		update: (id: string, mock: Partial<Mock>) => {
			const mocks = storage.mocks.getAll();
			const index = mocks.findIndex((m) => m.id === id);
			if (index !== -1) {
				mocks[index] = { ...mocks[index], ...mock };
				localStorage.setItem(MOCKS_KEY, JSON.stringify(mocks));
			}
		},
		delete: (id: string) => {
			const mocks = storage.mocks.getAll().filter((m) => m.id !== id);
			localStorage.setItem(MOCKS_KEY, JSON.stringify(mocks));
		},
	},
};
