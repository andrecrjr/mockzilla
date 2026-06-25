export function SiteFooter() {
	return (
		<footer className="border-t border-border bg-background">
			<div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2 px-4 py-6 text-center text-sm text-muted-foreground sm:flex-row sm:gap-3">
				<span>
					Made with &lt;3 open source by{' '}
					<a
						href="http://www.ac-jr.com"
						target="_blank"
						rel="noopener noreferrer"
						className="font-medium text-foreground underline-offset-4 hover:underline"
					>
						AC-JR
					</a>
				</span>
				<span className="hidden text-border sm:inline" aria-hidden="true">
					|
				</span>
				<a
					href="https://github.com/andrecrjr/mockzilla"
					target="_blank"
					rel="noopener noreferrer"
					className="font-medium text-foreground underline-offset-4 hover:underline"
				>
					Github
				</a>
			</div>
		</footer>
	);
}
