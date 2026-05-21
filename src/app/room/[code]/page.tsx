import PlayerView from '@/components/player/PlayerView';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function RoomPage({ params }: Props) {
  const { code } = await params;
  return <PlayerView code={code} />;
}
