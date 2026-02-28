import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  compress: true,
  async headers() {
    return [
      {
        // All HTML routes: no-store so Netlify CDN never caches page HTML
        source: '/((?!_next/static|_next/image|favicon\\.ico|icons|manifest\\.json|robots\\.txt|sw\\.js|.*\\.png$|.*\\.svg$).*)',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        // Static assets: cache forever (content-addressed by hash)
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
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
