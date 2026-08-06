import PlayerView from '@/components/player/PlayerView';
import JoinLanding from '@/components/join/JoinLanding';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function RoomPage({ params }: Props) {
  const { code } = await params;
  return (
    <>
      {/* The second half of the join animation. Sits above PlayerView rather than inside it
          so it survives the skeleton → lobby swap: it claims its handoff once on mount, then
          holds the card in the air until the player's seat is actually on screen. Renders
          nothing at all unless it was handed a card by /join. */}
      <JoinLanding code={code} />
      <PlayerView code={code} />
    </>
  );
}
