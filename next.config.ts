import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake large packages so only the symbols actually imported end up in each bundle
  experimental: {
    optimizePackageImports: ['framer-motion'],
  },
  images: {
    // Serve AVIF first (better compression), fall back to WebP — cards are already WebP
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    return [
      // Android TWA verification file. A dot-folder under app/ or public/ isn't reliably routed,
      // so serve the well-known path from an env-driven route handler. See apk/README.md.
      { source: '/.well-known/assetlinks.json', destination: '/api/assetlinks' },
    ];
  },
};

export default nextConfig;
