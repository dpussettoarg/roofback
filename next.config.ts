import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // cssChunking (default: true) splits CSS into /_next/static/chunks/*.css
    // which the Netlify OpenNext adapter currently returns 404 for.
    // Disabling it consolidates CSS into /_next/static/css/ which is correctly served.
    cssChunking: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },
};

export default nextConfig;
