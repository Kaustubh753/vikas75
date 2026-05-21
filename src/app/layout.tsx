import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import ToasterProvider from '@/components/ui/ToasterProvider';

const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
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
    <html lang="en">
      <body className={`${bebas.variable} ${inter.variable} ${devanagari.variable}`}>
        <ToasterProvider />
        {children}
      </body>
    </html>
  );
}
