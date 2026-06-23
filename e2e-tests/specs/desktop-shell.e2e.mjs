describe('Mockzilla desktop shell', () => {
	it('opens the desktop app and loads the health-checked server UI', async () => {
		await browser.waitUntil(
			async () => {
				const title = await browser.getTitle();
				return title.toLowerCase().includes('mockzilla');
			},
			{
				timeout: 60000,
				timeoutMsg: 'Mockzilla desktop window did not load',
			},
		);

		const title = await browser.getTitle();
		expect(title).toContain('Mockzilla');
	});
});
