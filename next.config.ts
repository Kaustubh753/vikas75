import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake large packages so only the symbols actually imported end up in each bundle
  experimental: {
    optimizePackageImports: ['framer-motion'],
  },
  images: {
    // Serve AVIF first (better compression), fall back to WebP — cards are already WebP
    formats: ['image/avif', 'image/webp'],
    // Next 16 narrowed the default allow-list to [75] and silently rounds any other `quality`
    // prop to the nearest permitted value, so the challenge card's quality={90} was being
    // served at 75 with only a dev-time warning to show for it. Listing 90 honours it.
    qualities: [75, 90],
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
