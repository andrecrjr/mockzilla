import { Cloud, ArrowDownToLine, RefreshCw, Database, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';

export function ExtensionDocs() {
	return (
		<div className="space-y-6">
			{/* Overview Section */}
			<Card className="mockzilla-border bg-card/50 backdrop-blur-sm p-6">
				<div className="flex items-center gap-3 mb-6">
					<div className="p-2 bg-primary/10 rounded-lg">
						<Cloud className="h-6 w-6 text-primary" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-foreground">
							Extension Integration
						</h2>
						<p className="text-muted-foreground">
							Seamlessly sync mocks between your local Chrome Extension and the Mockzilla Server.
						</p>
					</div>
				</div>

				<div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
					<h3 className="font-bold text-sm text-primary mb-2 flex items-center gap-2">
						<ShieldCheck className="h-4 w-4" />
						High-Fidelity Sync
					</h3>
					<p className="text-xs text-muted-foreground">
						Mockzilla uses a smart merge strategy to ensure <strong>zero data loss</strong>. 
						Extension-specific features (like variants) are preserved in the server's database 
						even if the server doesn't natively support them yet.
					</p>
				</div>

				<div className="grid md:grid-cols-2 gap-6">
					<div className="space-y-3">
						<h3 className="font-semibold text-lg flex items-center gap-2">
							<RefreshCw className="h-4 w-4 text-blue-500" />
							Sync to Server
						</h3>
						<p className="text-xs text-muted-foreground">
							Push your local extension rules to the server. Useful for sharing mocks with teammates or backing up your work.
						</p>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li className="flex gap-2">✅ Creates generic "Extension" folders.</li>
							<li className="flex gap-2">✅ Preserves all extension metadata.</li>
						</ul>
					</div>
					<div className="space-y-3">
						<h3 className="font-semibold text-lg flex items-center gap-2">
							<ArrowDownToLine className="h-4 w-4 text-green-500" />
							Import from Server
						</h3>
						<p className="text-xs text-muted-foreground">
							Pull mocks from the server into your browser. Perfect for onboarding or switching environments.
						</p>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li className="flex gap-2">✅ Imports folders as groups.</li>
							<li className="flex gap-2">✅ Smart merges server edits + extension data.</li>
						</ul>
					</div>
				</div>
			</Card>

			{/* Deep Dive Section */}
			<h3 className="text-xl font-bold mt-8 mb-4">How it Works</h3>
			<Accordion type="single" collapsible className="space-y-4">
				<AccordionItem value="sync-flow">
					<AccordionTrigger>Sync Flow (Extension → Server)</AccordionTrigger>
					<AccordionContent>
						<div className="space-y-4 pt-2">
							<p className="text-sm text-muted-foreground">
								When you click <strong>Sync</strong> in the extension:
							</p>
							<ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-2">
								<li>The extension sends a snapshot of your selected rules.</li>
								<li>The server checks for existing "Extension" folders.</li>
								<li>
									<span className="text-foreground font-medium">Magic Step:</span> The server stores the 
									<span className="italic"> exact raw JSON payload</span> in a hidden <code>meta</code> field.
								</li>
								<li>The server also creates standard Mockzilla mocks for generic use (e.g. by other agents).</li>
							</ol>
						</div>
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="import-flow">
					<AccordionTrigger>Import Flow (Server → Extension)</AccordionTrigger>
					<AccordionContent>
						<div className="space-y-4 pt-2">
							<p className="text-sm text-muted-foreground">
								When you click <strong>Import</strong> in the extension header:
							</p>
							<div className="border rounded-lg p-4 bg-muted/20">
								<h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
									<Database className="h-4 w-4" />
									The Merge Strategy
								</h4>
								<p className="text-xs text-muted-foreground mb-3">
									The server combines two sources of truth to give you the best result:
								</p>
								<div className="grid grid-cols-2 gap-4 text-xs">
									<div className="p-3 bg-background rounded border">
										<span className="block font-medium mb-1 text-primary">Source 1: Stored Metadata</span>
										<p className="text-muted-foreground">
											Restores extension-only fields like <code>variants</code>, <code>delays</code>, etc.
										</p>
									</div>
									<div className="p-3 bg-background rounded border">
										<span className="block font-medium mb-1 text-primary">Source 2: Server State</span>
										<p className="text-muted-foreground">
											Applies any recent changes made in the Server UI (e.g. status code, response body).
										</p>
									</div>
								</div>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
