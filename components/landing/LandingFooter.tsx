'use client';

import {
	BookOpen,
	ExternalLink,
	Github,
	Globe,
	Heart,
	Mail,
	Server,
} from 'lucide-react';
import Link from 'next/link';

export function LandingFooter() {
	return (
		<footer className="border-t border-border bg-muted/30">
			<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
				<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
					{/* Brand */}
					<div>
						<div className="flex items-center gap-3">
							<img
								src="/mockzilla-logo.png"
								alt="Mockzilla logo"
								className="h-8 w-8 invert dark:filter-none"
							/>
							<span className="font-bold text-lg text-foreground">
								Mockzilla
							</span>
						</div>
						<p className="mt-4 text-sm text-muted-foreground">
							Two powerful tools, one ecosystem. Self-hosted mock server and
							browser extension for modern development teams.
						</p>
					</div>

					{/* Choose Your Tool */}
					<div>
						<h3 className="font-semibold text-foreground mb-4">
							Choose Your Tool
						</h3>
						<ul className="space-y-3 text-sm">
							<li>
								<a
									href="#server"
									className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
								>
									<Server className="h-4 w-4" />
									HTTP Server
								</a>
							</li>
							<li>
								<a
									href="#extension"
									className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
								>
									<Globe className="h-4 w-4" />
									Chrome Extension
								</a>
							</li>
							<li>
								<Link
									href="/docs"
									className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
								>
									<BookOpen className="h-4 w-4" />
									Documentation
								</Link>
							</li>
						</ul>
					</div>

					{/* Resources */}
					<div>
						<h3 className="font-semibold text-foreground mb-4">Resources</h3>
						<ul className="space-y-3 text-sm">
							<li>
								<a
									href="https://github.com/andrecrjr/mockzilla"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
								>
									<Github className="h-4 w-4" />
									GitHub
								</a>
							</li>
							<li>
								<a
									href="https://chromewebstore.google.com/detail/gpbfcijfelgnaabjodgifeopbmnbjpnk/preview"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
								>
									<ExternalLink className="h-4 w-4" />
									Chrome Web Store
								</a>
							</li>
							<li>
								<Link
									href="/app"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									Open Dashboard
								</Link>
							</li>
						</ul>
					</div>

					{/* Support */}
					<div>
						<h3 className="font-semibold text-foreground mb-4">
							Support the Project
						</h3>
						<ul className="space-y-3 text-sm">
							<li>
								<a
									href="https://ko-fi.com/andrecrjr"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
								>
									<Heart className="h-4 w-4" />
									Buy Me a Coffee
								</a>
							</li>
							<li>
								<a
									href="https://acjr.notion.site/2f3b5e58148c801194e9f3a41e7227d7"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
								>
									<Mail className="h-4 w-4" />
									Contact
								</a>
							</li>
						</ul>
					</div>
				</div>

				<div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
					<p>
						&copy; {new Date().getFullYear()} Mockzilla. Open source and free to
						use.
					</p>
				</div>
			</div>
		</footer>
	);
}
