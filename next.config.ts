import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix for mobile link errors: Standardizes URLs to always end with a slash
  trailingSlash: true, 
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || Date.now().toString(),
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  async redirects() {
    return [
      {
        source: '/Tools',
        destination: '/Workspace',
        permanent: true,
      },
      {
        source: '/tools',
        destination: '/Workspace',
        permanent: true,
      },

    ];
  },
};

export default nextConfig;