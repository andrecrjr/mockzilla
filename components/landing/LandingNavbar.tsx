'use client';

import { BookOpen, ExternalLink, Github, Menu, Server, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';

export function LandingNavbar() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
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
						<div className="hidden md:flex items-baseline space-x-6">
							<a
								href="#features"
								className="text-foreground/80 hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent"
							>
								Features
							</a>
							<a
								href="#server"
								className="text-foreground/80 hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent"
							>
								<div className="flex items-center gap-1">
									<Server className="h-3.5 w-3.5" />
									Server
								</div>
							</a>
							<a
								href="#extension"
								className="text-foreground/80 hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent"
							>
								<div className="flex items-center gap-1">
									<ExternalLink className="h-3.5 w-3.5" />
									Extension
								</div>
							</a>
							<Link
								href="/docs"
								className="text-foreground/80 hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent flex items-center gap-1"
							>
								<BookOpen className="h-3.5 w-3.5" />
								Docs
							</Link>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Link href="/app">
							<Button variant="default" size="sm" className="gap-2">
								Open App
							</Button>
						</Link>
						<a
							href="https://github.com/andrecrjr/mockzilla"
							target="_blank"
							rel="noopener noreferrer"
							className="hidden sm:flex"
						>
							<Button variant="ghost" size="sm" className="gap-2">
								<Github className="h-4 w-4" />
								<span className="hidden lg:inline">GitHub</span>
							</Button>
						</a>
						<ThemeSwitcher />
						<button
							className="md:hidden p-2 text-foreground/80 hover:text-foreground"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						>
							{mobileMenuOpen ? (
								<X className="h-5 w-5" />
							) : (
								<Menu className="h-5 w-5" />
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile menu */}
			{mobileMenuOpen && (
				<div className="md:hidden border-t border-border">
					<div className="px-2 pt-2 pb-3 space-y-1">
						<a
							href="#features"
							className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:text-foreground hover:bg-accent"
							onClick={() => setMobileMenuOpen(false)}
						>
							Features
						</a>
						<a
							href="#server"
							className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:text-foreground hover:bg-accent"
							onClick={() => setMobileMenuOpen(false)}
						>
							HTTP Server
						</a>
						<a
							href="#extension"
							className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:text-foreground hover:bg-accent"
							onClick={() => setMobileMenuOpen(false)}
						>
							Chrome Extension
						</a>
						<Link
							href="/docs"
							className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:text-foreground hover:bg-accent"
							onClick={() => setMobileMenuOpen(false)}
						>
							Docs
						</Link>
						<Link
							href="/app"
							className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:text-foreground hover:bg-accent"
							onClick={() => setMobileMenuOpen(false)}
						>
							Open App
						</Link>
						<a
							href="https://github.com/andrecrjr/mockzilla"
							target="_blank"
							rel="noopener noreferrer"
							className="block px-3 py-2 rounded-md text-base font-medium text-foreground/80 hover:text-foreground hover:bg-accent"
							onClick={() => setMobileMenuOpen(false)}
						>
							GitHub
						</a>
					</div>
				</div>
			)}
		</nav>
	);
}
