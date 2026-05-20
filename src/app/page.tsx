// Home page — players enter name + room code, or host creates a room
import HomePage from '@/components/player/HomePage';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return <HomePage initialCode={code} />;
}
