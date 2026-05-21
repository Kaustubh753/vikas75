import HostDashboard from '@/components/host/HostDashboard';

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ h?: string }>;
}

export default async function HostPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { h } = await searchParams;
  return <HostDashboard code={code} hostId={h ?? ''} />;
}
