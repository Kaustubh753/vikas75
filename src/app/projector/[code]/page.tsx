import ProjectorView from '@/components/projector/ProjectorView';

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ h?: string }>;
}

export default async function ProjectorPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { h } = await searchParams;
  return <ProjectorView code={code} hostId={h ?? ''} />;
}
