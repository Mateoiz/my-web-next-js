/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com', // This allows specific image files
      },
      {
        protocol: 'https',
        hostname: 'imgur.com',   // This allows general imgur links
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com', // Keep this for future use
      },
    ],
  },
};

export default nextConfig;