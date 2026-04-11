import Link from 'next/link';
import { buildSidebar } from './[[...mdxPath]]/page';

const sidebar = buildSidebar();

export const metadata = {
  title: { template: '%s | Mockzilla Docs', default: 'Mockzilla Docs' },
  description: 'Mockzilla documentation',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background mockzilla-gradient-light mockzilla-gradient-dark">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 m-2 mockzilla-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-4 font-bold text-xl">
              <span className="text-foreground">Mockzilla</span>
              <span className="text-muted-foreground font-normal text-sm">Docs v2</span>
            </Link>
            <Link
              href="/"
              className="text-sm text-foreground/80 hover:text-foreground px-3 py-2 rounded-md transition-colors"
            >
              ← Back to Mockzilla
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <nav className="sticky top-24 space-y-1">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Documentation
              </div>
              {sidebar.map(item => (
                <Link
                  key={item.slug}
                  href={`/docsv2/${item.slug === 'index' ? '' : item.slug}`}
                  className="block px-2 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-muted text-foreground/70 hover:text-foreground"
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
