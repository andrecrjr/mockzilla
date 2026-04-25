'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ThemeSwitcher } from '@/components/theme-switcher';

interface MetaEntry {
	slug: string;
	title: string;
	isSection?: boolean;
}

interface DocsHeaderProps {
	sidebar: MetaEntry[];
}

export function DocsHeader({ sidebar }: DocsHeaderProps) {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 m-2 mockzilla-border rounded-xl">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					<Link
						href="/app"
						className="flex items-center gap-4 font-bold text-xl"
						title="Back to App"
					>
						<div className="flex h-10 w-24 items-center justify-center rounded-lg overflow-hidden">
							<img
								src="/mockzilla-logo.png"
								alt="Mockzilla logo"
								className="h-12 w-full object-contain invert dark:filter-none"
							/>
						</div>
					</Link>

					<div className="flex items-center gap-2">
						<ThemeSwitcher />
						<button
							type="button"
							className="md:hidden p-2 text-foreground/80 hover:text-foreground transition-colors"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							aria-label="Toggle menu"
						>
							{mobileMenuOpen ? (
								<X className="h-6 w-6" />
							) : (
								<Menu className="h-6 w-6" />
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile menu */}
			{mobileMenuOpen && (
				<div className="md:hidden border-t border-border bg-card/95 backdrop-blur-md rounded-b-xl max-h-[calc(100vh-5rem)] overflow-y-auto">
					<nav className="px-4 py-6 space-y-1">
						{sidebar.map((item) =>
							item.isSection ? (
								<div
									key={item.slug}
									className="px-2 py-2 mt-4 first:mt-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1"
								>
									{item.title}
								</div>
							) : (
								<Link
									key={item.slug}
									href={`/docs/${item.slug === 'index' ? '' : item.slug}`}
									className="block px-3 py-2 text-base font-medium rounded-md transition-colors hover:bg-muted text-foreground/70 hover:text-foreground"
									onClick={() => setMobileMenuOpen(false)}
								>
									{item.title}
								</Link>
							),
						)}
					</nav>
				</div>
			)}
		</header>
	);
}
