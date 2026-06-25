'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MetaEntry {
	slug: string;
	title: string;
	isSection?: boolean;
}

interface DocsSidebarProps {
	sidebar: MetaEntry[];
}

export function DocsSidebar({ sidebar }: DocsSidebarProps) {
	const pathname = usePathname();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		<aside className="hidden md:block w-64 flex-shrink-0">
			<div className="sticky top-24">
				<ScrollArea className="h-[calc(100vh-8rem)] pr-4">
					<nav className="space-y-1 pb-4">
						{sidebar.map((item) => {
							if (item.isSection) {
								return (
									<div
										key={item.slug}
										className="px-2 py-1.5 mt-4 first:mt-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1"
									>
										{item.title}
									</div>
								);
							}

							const href = `/docs/${item.slug === 'index' ? '' : item.slug}`;
							// Only apply active state after mounting to avoid hydration mismatch
							const isActive = mounted && (pathname === href || (item.slug === 'index' && pathname === '/docs'));

							return (
								<Link
									key={item.slug}
									href={href}
									className={cn(
										"block px-2 py-1.5 text-sm font-medium rounded-md transition-colors",
										isActive 
											? "bg-primary/10 text-primary" 
											: "text-foreground/70 hover:text-foreground hover:bg-muted"
									)}
								>
									{item.title}
								</Link>
							);
						})}
					</nav>
				</ScrollArea>
			</div>
		</aside>
	);
}
