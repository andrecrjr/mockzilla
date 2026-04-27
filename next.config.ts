import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	output: 'standalone',
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
