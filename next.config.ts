import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['pg', '@electric-sql/pglite'],
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
};

export default nextConfig;
