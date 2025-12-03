import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type React from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import { Toaster } from 'sonner';

const _inter = Inter({ subsets: ['latin'] });
const _jetbrainsMono = JetBrains_Mono({ subsets: ['latin'] });

export const metadata: Metadata = {
	title: 'Mockzilla - Powerful API Mocking',
	description:
		'Create and manage custom API mock endpoints with lightning-fast responses',
	generator: 'v0.app',
	icons: {
		icon: '/mockzilla-logo.png',
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
              (function() {
                const theme = localStorage.getItem('mockzilla-theme') || 'system';
                const isDark = theme === 'dark' || 
                  (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
					}}
				/>
			</head>
			<body className={`font-sans antialiased`} suppressHydrationWarning>
				<ThemeProvider>{children}</ThemeProvider>
				<Toaster theme="system" />
				<Analytics />
			</body>
		</html>
	);
}
