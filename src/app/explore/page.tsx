import ExplorePage from '@/components/explore/ExplorePage';
import schemesData from '../../../context/cards_schemes.json';

export const metadata = {
  title: 'Explore — Vikas 75',
  description: 'Browse all 75 government scheme cards from the Vikas 75 card game.',
};

export default function Page() {
  return <ExplorePage schemes={schemesData} />;
}
