import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['pg', '@electric-sql/pglite', 'handlebars'],
	allowedDevOrigins: ['192.168.1.20'],
	async rewrites() {
		return [
			{
				source: '/llms.txt/docs/:path*',
				destination: '/api/llms?path=:path*',
			},
			{
				source: '/llms.txt/llms-full.txt',
				destination: '/llms-full.txt',
			},
			{
				source: '/docs/:path*/llms.txt',
				destination: '/api/llms?path=:path*',
			},
		];
	},
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
