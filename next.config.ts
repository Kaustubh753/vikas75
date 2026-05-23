import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake large packages so only the symbols actually imported end up in each bundle
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },
  images: {
    // Serve AVIF first (better compression), fall back to WebP — cards are already WebP
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
