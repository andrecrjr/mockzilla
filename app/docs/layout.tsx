import Link from 'next/link';
import { DocsHeader } from '@/components/docs/docs-header';
import { buildSidebar } from './[[...mdxPath]]/page';

export const metadata = {
	title: { template: '%s | Mockzilla Docs', default: 'Mockzilla Docs' },
	description: 'Mockzilla documentation',
};

export default function DocsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const sidebar = buildSidebar();

	return (
		<div className="min-h-screen bg-background mockzilla-gradient-light mockzilla-gradient-dark">
			<DocsHeader sidebar={sidebar} />

			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
				<div className="flex flex-col md:flex-row gap-8">
					{/* Sidebar - Hidden on mobile, shown on md and up */}
					<aside className="hidden md:block w-full md:w-64 flex-shrink-0">
						<nav className="sticky top-24 space-y-1">
							{sidebar.map((item) =>
								item.isSection ? (
									<div
										key={item.slug}
										className="px-2 py-1.5 mt-4 first:mt-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1"
									>
										{item.title}
									</div>
								) : (
									<Link
										key={item.slug}
										href={`/docs/${item.slug === 'index' ? '' : item.slug}`}
										className="block px-2 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-muted text-foreground/70 hover:text-foreground"
									>
										{item.title}
									</Link>
								),
							)}
						</nav>
					</aside>

					{/* Main content */}
					<main className="flex-1 min-w-0">{children}</main>
				</div>
			</div>
		</div>
	);
}
