import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   async headers() {
    return [
      {
        source: '/api/:path*', // Aplica-se a todas as rotas de API
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: '*' },
          { key: 'Access-Control-Allow-Headers', value: '*' },
        ],
      },
    ];
  },
};

export default nextConfig;
