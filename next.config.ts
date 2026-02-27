import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],

  // Force all pages to be served dynamically — prevents Netlify Durable Cache
  // from serving stale HTML that references chunks from old (purged) deploys.
  // This was the root cause of the production outage: cached pages pointed to
  // Turbopack chunk hashes that no longer existed after switching to webpack.
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-cache, no-store, must-revalidate',
        },
      ],
    },
    {
      // Static assets are immutable — aggressive cache is correct here
      source: '/_next/static/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],

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
