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
  description: 'The India Governance Card Game',
  openGraph: {
    title: 'Vikas 75',
    description: 'The India Governance Card Game',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export const viewport: Viewport = { themeColor: '#1a3a6e' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bebas.variable} ${inter.variable} ${devanagari.variable} ${yatra.variable}`}>
        {/* Tricolour strips — fixed, top and bottom of every page */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: 5, display: 'flex', zIndex: 99999,
          pointerEvents: 'none',
        }}>
          <div style={{ flex: 1, background: '#FF9933' }} />
          <div style={{ flex: 1, background: '#ffffff' }} />
          <div style={{ flex: 1, background: '#138808' }} />
        </div>
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
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
