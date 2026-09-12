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
  async headers() {
    // The app shipped with none of these. Values are deliberately conservative rather than
    // maximal, because the whole UI is built on inline `style={{}}` objects and Next injects
    // inline bootstrap scripts — a strict script-src/style-src without nonces would simply
    // break the game, which is worse than the risk it removes. What is here is the part that
    // costs nothing: no framing (clickjacking a host's advance button), no MIME sniffing, no
    // referrer leaking `/projector/CODE?h=<hostId>` to anywhere, and no <base> or plugin
    // injection. `frame-ancestors 'none'` is safe for the Android TWA — a Trusted Web Activity
    // is not an iframe.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://*.pusher.com wss://*.pusher.com https://*.pusherapp.com wss://*.pusherapp.com",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    }];
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
