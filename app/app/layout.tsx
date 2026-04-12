import { Analytics } from '@vercel/analytics/next';
import { BookOpen, Home } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';
import { Toaster } from 'sonner';

export default function AppLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<>
			<nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 m-2">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="flex h-16 items-center justify-between">
						<div className="flex items-center gap-8">
							<Link
								href="/app"
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
										href="/app"
										className="text-foreground/80 hover:text-foreground hover:bg-accent px-3 py-2 rounded-md text-sm font-medium transition-colors"
									>
										Mocks
									</Link>
									<Link
										href="/app/extension-data"
										className="text-foreground/80 hover:text-foreground hover:bg-accent px-3 py-2 rounded-md text-sm font-medium transition-colors"
									>
										Extension Sync
									</Link>
									<Link
										href="/app/workflows"
										className="text-foreground/80 hover:text-foreground hover:bg-accent px-3 py-2 rounded-md text-sm font-medium transition-colors"
									>
										Workflows
									</Link>
								</div>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Link href="/">
								<Button variant="ghost" size="sm" className="gap-2">
									<Home className="h-4 w-4" />
									<span className="hidden sm:inline">Landing</span>
								</Button>
							</Link>
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
			<Toaster theme="system" />
			<Analytics />
		</>
	);
}
