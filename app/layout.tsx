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
	metadataBase: new URL('https://mockzilla.dev'),
	title: {
		template: '%s | Mockzilla',
		default: 'Mockzilla - The Open Source API Mocking Platform',
	},
	description:
		'Chrome Extension for instant interception. HTTP Server for dynamic mocking. JSON Schema + Faker, MCP integration, and stateful workflows.',
	keywords: [
		'API Mocking',
		'Chrome Extension',
		'JSON Schema',
		'Faker.js',
		'MCP',
		'Model Context Protocol',
		'Next.js',
		'Docker',
		'PostgreSQL',
	],
	generator: 'v0.app',
	icons: {
		icon: '/mockzilla-logo.png',
	},
	openGraph: {
		title: 'Mockzilla - API Mocking Ecosystem',
		description: 'The dual-tool platform for frontend developers and QA teams.',
		url: 'https://mockzilla.dev',
		siteName: 'Mockzilla',
		images: [
			{
				url: '/mockzilla-logo.png',
				width: 800,
				height: 600,
			},
		],
		locale: 'en_US',
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Mockzilla - API Mocking Ecosystem',
		description: 'Chrome Extension for instant interception. HTTP Server for dynamic mocking.',
		images: ['/mockzilla-logo.png'],
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
				<ThemeProvider>
					{children}
				</ThemeProvider>
				<Toaster theme="system" />
				<Analytics />
			</body>
		</html>
	);
}
