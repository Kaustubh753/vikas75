import type { Metadata } from 'next';
import { Bebas_Neue, Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';

const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Vikas 75',
  description: 'The Government Schemes Card Game',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bebas.variable} ${inter.variable} ${devanagari.variable}`}>
        {children}
      </body>
    </html>
  );
}
