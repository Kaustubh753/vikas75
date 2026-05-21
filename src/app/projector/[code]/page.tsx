import ProjectorView from '@/components/projector/ProjectorView';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function ProjectorPage({ params }: Props) {
  const { code } = await params;
  return <ProjectorView code={code} />;
}
