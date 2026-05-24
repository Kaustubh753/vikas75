import SchemesGallery from '@/components/schemes/SchemesGallery';
import schemesData from '../../../context/cards_schemes.json';

export const metadata = {
  title: 'The Schemes Gallery — Vikas 75',
  description: 'An immersive walkthrough of all 75 government scheme cards.',
};

export default function Page() {
  return <SchemesGallery schemes={schemesData} />;
}
