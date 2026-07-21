import Link from 'next/link';
import LogoLockup from '@/components/ui/LogoLockup';

export default function NotFound() {
  return (
    <main style={{
      minHeight: '100vh', background: '#08070f', color: '#fdf8e8',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 28, padding: '32px 24px', textAlign: 'center',
      fontFamily: 'var(--font-inter),sans-serif',
    }}>
      <LogoLockup size="md" />

      <p style={{
        fontFamily: 'var(--font-bebas),sans-serif',
        fontSize: 'clamp(64px,18vw,120px)', lineHeight: 0.9,
        letterSpacing: '0.06em', color: '#ee7d23', margin: 0,
      }}>
        404
      </p>

      <p style={{ fontSize: 16, color: 'rgba(250,248,240,0.7)', maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
        This page wandered off the policy roadmap. The scheme you&apos;re looking for isn&apos;t here.
      </p>

      <Link href="/" style={{
        marginTop: 4,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: '#ee7d23', color: '#08070f',
        fontWeight: 700, fontSize: 15, textDecoration: 'none',
        padding: '12px 24px', borderRadius: 10,
      }}>
        Back to start
      </Link>
    </main>
  );
}
