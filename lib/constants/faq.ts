export const faqs = [
	{
		question: 'What is Mockzilla?',
		answer:
			'Mockzilla is a dual-product API mocking platform: an HTTP Server for dynamic, schema-based mocking and a Chrome Extension for real-time request interception. Use them together or separately based on your needs.',
	},
	{
		question:
			"What's the difference between the HTTP Server and Chrome Extension?",
		answer:
			'The HTTP Server is a self-hosted Docker server that creates actual mock endpoints with dynamic responses using JSON Schema + Faker.js. The Chrome Extension intercepts fetch() and XMLHttpRequest in your browser and returns configured mock responses. The server is great for team collaboration and persistence, while the extension is perfect for quick frontend testing.',
	},
	{
		question: 'Do I need Docker to run Mockzilla?',
		answer:
			"The HTTP Server requires Docker for deployment. The Chrome Extension runs independently in your browser and doesn't need Docker. However, using both together enables cross-device sync and team collaboration features.",
	},
	{
		question: 'Can I use the Chrome Extension without the HTTP Server?',
		answer:
			'Yes! The Chrome Extension works standalone. You can configure mock rules directly in the extension UI without any server. However, syncing rules across devices and accessing advanced features like workflow scenarios requires the HTTP Server.',
	},
	{
		question: 'Can I use the HTTP Server without the Chrome Extension?',
		answer:
			'Absolutely! The HTTP Server works as a complete standalone mock server. Point your frontend code to your Mockzilla server URL and it will serve mock responses. The extension is an optional tool for browser-based interception.',
	},
	{
		question: 'What is MCP integration?',
		answer:
			'MCP (Model Context Protocol) allows AI agents like Claude Desktop, Cursor, and Windsurf to interact with Mockzilla programmatically. You can manage folders, mocks, and workflows directly from your AI-powered IDE or assistant. The HTTP Server exposes 24 MCP tools.',
	},
	{
		question: 'How do I persist my mock data?',
		answer:
			"The HTTP Server uses PostgreSQL for data persistence. When running with Docker Compose, your data is stored in a Docker volume, ensuring it persists across container restarts. The Chrome Extension stores rules in Chrome's local storage, with optional sync to the server.",
	},
	{
		question: 'Is Mockzilla free?',
		answer:
			'Yes, Mockzilla is open source and free to use. You can find the source code on GitHub. If you find it useful, consider starring the repository or supporting the project on Ko-fi!',
	},
];
