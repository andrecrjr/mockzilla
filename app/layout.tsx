import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type React from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { Toaster } from 'sonner';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';

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
				<ThemeProvider>
					<nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 m-2">
						<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
							<div className="flex h-16 items-center justify-between">
								<div className="flex items-center gap-8">
									<Link
										href="/"
										className="flex items-center gap-4 font-bold text-xl"
									>
										<div className="flex h-10 w-20 items-center justify-center rounded-lg">
											<img
												src="/mockzilla-logo.png"
												alt="Mockzilla logo"
												className="h-12 w-full invert dark:filter-none"
											/>
										</div>
										<span className="text-foreground">Mockzilla</span>
									</Link>
									<div className="hidden md:block">
										<div className="flex items-baseline space-x-2">
											<Link
												href="/"
												className="text-foreground/80 hover:text-foreground hover:bg-accent px-3 py-2 rounded-md text-sm font-medium transition-colors"
											>
												Mocks
											</Link>
											<Link
												href="/workflows"
												className="text-foreground/80 hover:text-foreground hover:bg-accent px-3 py-2 rounded-md text-sm font-medium transition-colors"
											>
												Workflows
											</Link>
										</div>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Link href="/docs">
										<Button variant="ghost" size="sm" className="gap-2">
											<BookOpen className="h-4 w-4" />
											<span className="hidden sm:inline">Docs</span>
										</Button>
									</Link>
									<ThemeSwitcher />
								</div>
							</div>
						</div>
					</nav>
					{children}
				</ThemeProvider>
				<Toaster theme="system" />
				<Analytics />
			</body>
		</html>
	);
}
