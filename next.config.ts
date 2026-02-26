import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer is ESM-only and browser-only.
  // Marking it as a server external prevents webpack from attempting to bundle
  // it during the server-side build pass, which would fail with
  // "ESM packages need to be imported" even when used inside dynamic() + ssr:false.
  serverExternalPackages: ['@react-pdf/renderer'],
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
