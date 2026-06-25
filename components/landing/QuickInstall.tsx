'use client';

import { Check, Copy, Globe, Server } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const dockerCommand =
	'docker run -d -p 36666:36666 -v mockzilla-data:/app/data --name mockzilla andrecrjr/mockzilla:latest';

export function QuickInstall() {
	const [copied, setCopied] = useState(false);

	const handleCopyDocker = () => {
		navigator.clipboard.writeText(dockerCommand);
		setCopied(true);
		toast.success('Copied!', {
			description: 'Docker command copied to clipboard',
		});
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<section className="bg-gradient-to-r from-primary to-purple-700 py-20 md:py-28">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-12">
					<h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
						Quick Installation
					</h2>
					<p className="text-lg text-white/80 max-w-2xl mx-auto">
						Choose your tool and start mocking in seconds
					</p>
				</div>

				<div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
					{/* HTTP Server Card */}
					<Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
						<div className="flex items-center gap-3 mb-4">
							<div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center">
								<Server className="h-6 w-6 text-white" />
							</div>
							<div>
								<h3 className="text-xl font-bold text-white">HTTP Server</h3>
								<p className="text-sm text-white/70">
									Docker-based mock server
								</p>
							</div>
						</div>

						<div className="bg-black/30 rounded-lg p-3 mb-4 font-mono text-xs text-green-400 break-all">
							$ {dockerCommand}
						</div>

						<div className="flex gap-3">
							<Button
								variant="secondary"
								size="sm"
								onClick={handleCopyDocker}
								className="gap-2 bg-white text-primary hover:bg-white/90"
							>
								{copied ? (
									<Check className="h-4 w-4" />
								) : (
									<Copy className="h-4 w-4" />
								)}
								Copy Command
							</Button>
							<a
								href="/docs"
								className="text-sm text-white/80 hover:text-white underline flex items-center"
							>
								View full docs →
							</a>
						</div>
					</Card>

					{/* Chrome Extension Card */}
					<Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
						<div className="flex items-center gap-3 mb-4">
							<div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center">
								<Globe className="h-6 w-6 text-white" />
							</div>
							<div>
								<h3 className="text-xl font-bold text-white">
									Chrome Extension
								</h3>
								<p className="text-sm text-white/70">
									Browser-based interception
								</p>
							</div>
						</div>

						<div className="bg-black/30 rounded-lg p-4 mb-4">
							<p className="text-sm text-white/80 mb-2">
								Intercept fetch() and XMLHttpRequest in real-time
							</p>
							<ul className="text-xs text-white/60 space-y-1">
								<li>✓ Flexible pattern matching</li>
								<li>✓ JSON & text responses</li>
								<li>✓ Hit tracking & analytics</li>
								<li>✓ Sync with HTTP Server</li>
							</ul>
						</div>

						<div className="flex gap-3">
							<a
								href="https://chromewebstore.google.com/detail/gpbfcijfelgnaabjodgifeopbmnbjpnk/preview"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Button
									size="sm"
									className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
								>
									Install Now
								</Button>
							</a>
							<a
								href="/docs"
								className="text-sm text-white/80 hover:text-white underline flex items-center"
							>
								Learn more →
							</a>
						</div>
					</Card>
				</div>

				<p className="text-center text-sm text-white/60 mt-8">
					Your server will be available at{' '}
					<span className="underline text-white/80">
						http://localhost:36666
					</span>
				</p>
			</div>
		</section>
	);
}
