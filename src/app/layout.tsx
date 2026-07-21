import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Inter, Noto_Sans_Devanagari, Yatra_One } from 'next/font/google';
import './globals.css';
import ToasterProvider from '@/components/ui/ToasterProvider';

const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  weight: ['400', '500'],
});
const yatra = Yatra_One({ weight: '400', subsets: ['latin'], variable: '--font-yatra' });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://vikas75.vercel.app'
  ),
  title: 'Vikas 75',
  description: "The best answer isn't always right.",
  openGraph: {
    title: 'Vikas 75',
    description: "The best answer isn't always right.",
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#1a3a6e',
  // Be explicit so every route (including dynamic /room, /projector, /join) scales to the
  // device width on phones rather than rendering at a desktop width and zooming out.
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bebas.variable} ${inter.variable} ${devanagari.variable} ${yatra.variable}`}>
        {/* Tricolour strip — fixed, top of every page only */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: 5, display: 'flex', zIndex: 99999,
          pointerEvents: 'none',
        }}>
          <div style={{ flex: 1, background: '#FF9933' }} />
          <div style={{ flex: 1, background: '#ffffff' }} />
          <div style={{ flex: 1, background: '#138808' }} />
        </div>
        <ToasterProvider />
        {children}
      </body>
    </html>
  );
}
