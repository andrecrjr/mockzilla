import { DocsHeader } from '@/components/docs/docs-header';
import { DocsSidebar } from '@/components/docs/docs-sidebar';
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
				<div className="flex flex-col md:flex-row gap-12">
					{/* Sidebar - Desktop only component with ScrollArea and Active State */}
					<DocsSidebar sidebar={sidebar} />

					{/* Main content */}
					<main className="flex-1 min-w-0 max-w-4xl">
						<div className="bg-card/30 backdrop-blur-sm border mockzilla-border rounded-2xl p-4 md:p-8">
							{children}
						</div>
					</main>
				</div>
			</div>
		</div>
	);
}
