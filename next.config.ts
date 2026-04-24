import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix for mobile link errors: Standardizes URLs to always end with a slash
  trailingSlash: true, 

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
      {
        source: '/workspace', // If they type the lowercase version...
        destination: '/Workspace', // ...automatically redirect them here!
        permanent: true,
      },
    ];
  },
};

export default nextConfig;