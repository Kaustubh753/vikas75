import JoinClient from './JoinClient';

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const initialCode = (code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  return <JoinClient initialCode={initialCode} />;
}
