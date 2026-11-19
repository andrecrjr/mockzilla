import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	output:
		process.env.DEPLOY_MODE === 'landing'
			? 'export'
			: process.env.NODE_ENV === 'development'
				? undefined
				: 'standalone',
	serverExternalPackages: ['pg', '@electric-sql/pglite', 'handlebars'],
	allowedDevOrigins: process.env.NODE_ORIGINS?.split(',').map((origin) => origin.trim()) || [],
	...(process.env.DEPLOY_MODE === 'landing'
		? {}
		: {
			async redirects() {
				return [
					{
						source: '/app/workflows/:path*',
						destination: '/app',
						permanent: false,
					},
				];
			},
			async rewrites() {
				return [
					// Legacy llms URL shapes; canonical pages live at /llms/docs/<page>.txt.
					{
						source: '/llms.txt/docs/:path*',
						destination: '/llms/docs/:path*',
					},
					{
						source: '/llms.txt/llms-full.txt',
						destination: '/llms-full.txt',
					},
					{
						source: '/docs/llms.txt',
						destination: '/llms/docs/index.txt',
					},
				];
			},
		}),
	webpack(config, { isServer }) {
		if (!isServer) {
			config.resolve.alias = {
				...config.resolve.alias,
				handlebars: 'handlebars/dist/handlebars.js',
			};
		}
		return config;
	},
	turbopack: {
		resolveAlias: {
			handlebars: 'handlebars/dist/handlebars.js',
		},
	},
};

export default nextConfig;
