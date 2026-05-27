'use client';

import type React from 'react';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	isDark: boolean;
	mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = useState<Theme>('system');
	const [isDark, setIsDark] = useState(false);
	const [mounted, setMounted] = useState(false);

	const applyTheme = useCallback((newTheme: Theme) => {
		const isDarkMode =
			newTheme === 'dark' ||
			(newTheme === 'system' &&
				window.matchMedia('(prefers-color-scheme: dark)').matches);

		if (isDarkMode) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
		setIsDark(isDarkMode);
	}, []);

	useEffect(() => {
		const stored = localStorage.getItem('mockzilla-theme') as Theme | null;
		const initialTheme = stored || 'system';

		setThemeState(initialTheme);
		applyTheme(initialTheme);
		setMounted(true);
	}, [applyTheme]);

	const setTheme = useCallback(
		(newTheme: Theme) => {
			setThemeState(newTheme);
			localStorage.setItem('mockzilla-theme', newTheme);
			applyTheme(newTheme);
		},
		[applyTheme],
	);

	const value = useMemo(
		() => ({ theme, setTheme, isDark, mounted }),
		[theme, setTheme, isDark, mounted],
	);

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error('useTheme must be used within ThemeProvider');
	}
	return context;
}
