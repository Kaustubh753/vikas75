import type { Metadata } from 'next';
import { Inter, Oswald, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald' });
const devanagari = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-devanagari', weight: ['400', '700'] });

export const metadata: Metadata = {
  title: 'Vikas 75',
  description: 'The Indian government schemes card game',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${oswald.variable} ${devanagari.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
