// Host control panel — advance phases, extend timer, end game
import HostPanel from '@/components/player/HostPanel';

export default async function HostPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <HostPanel code={code} />;
}
