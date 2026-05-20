// Host control panel — advance phases, extend timer, end game
import HostPanel from '@/components/player/HostPanel';

export default async function HostPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ h?: string }>;
}) {
  const { code } = await params;
  const { h } = await searchParams;
  return <HostPanel code={code} hostId={h ?? ''} />;
}
