import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ h?: string }>;
}

// The projector view (/projector/[code]?h=hostId) already includes the full
// HostOverlay with advance, settings, music, and end-game controls.
// Redirect hosts there directly so they see the same screen as the big display.
export default async function HostPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { h } = await searchParams;
  const dest = `/projector/${code}${h ? `?h=${encodeURIComponent(h)}` : ''}`;
  redirect(dest);
}
