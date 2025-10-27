import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive-thirdparty.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
