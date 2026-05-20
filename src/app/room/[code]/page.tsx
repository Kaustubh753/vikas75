// Player phone view — hand of scheme cards, submission, waiting states
import PlayerView from '@/components/player/PlayerView';

export default async function PlayerPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PlayerView code={code} />;
}
