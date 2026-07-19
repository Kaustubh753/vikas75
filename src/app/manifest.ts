import type { MetadataRoute } from 'next';

// Web App Manifest — lets players "Add to Home Screen" and launch the controller
// full-screen, which matters because phones are the game controllers. Next links this
// automatically at /manifest.webmanifest (no <link> needed in layout).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vikas 75',
    short_name: 'Vikas 75',
    description: "The best answer isn't always right. A multiplayer party game about Indian government schemes.",
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#08070f',
    theme_color: '#08070f',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
