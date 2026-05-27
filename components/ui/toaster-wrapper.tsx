'use client';

import { useEffect, useState } from 'react';
import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '@/components/theme-provider';

export function Toaster() {
	const { theme, mounted } = useTheme();
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	if (!mounted || !isMounted) return null;

	return (
		<SonnerToaster
			theme={theme === 'system' ? 'system' : theme}
			position="top-right"
			richColors
			closeButton
		/>
	);
}
