import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix for mobile link errors: Standardizes URLs to always end with a slash
  // e.g. /blogs/article -> /blogs/article/
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
};

export default nextConfig;