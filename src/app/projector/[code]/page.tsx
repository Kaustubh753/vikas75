// Projector / TV view — full-screen shared game experience
import ProjectorView from '@/components/projector/ProjectorView';

export default async function ProjectorPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ProjectorView code={code} />;
}
