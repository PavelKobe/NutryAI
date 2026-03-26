import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@metagptx/web-sdk', 'three'],
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    const target = process.env.ADMIN_API_REWRITE_TARGET || 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${target.replace(/\/$/, '')}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
