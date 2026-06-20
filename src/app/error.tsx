'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import LogoLockup from '@/components/ui/LogoLockup';

// Route-segment error boundary. Catches render/runtime errors in any page and offers a
// retry (re-renders the segment) plus an escape hatch home, instead of a blank screen.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[vikas75] route error:', error);
  }, [error]);

  return (
    <main style={{
      minHeight: '100vh', background: '#0d1b35', color: '#faf8f0',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 24, padding: '32px 24px', textAlign: 'center',
      fontFamily: 'var(--font-inter),sans-serif',
    }}>
      <LogoLockup size="md" />

      <h2 style={{
        fontFamily: 'var(--font-bebas),sans-serif',
        fontSize: 'clamp(40px,11vw,72px)', lineHeight: 0.95,
        letterSpacing: '0.04em', color: '#FF9933', margin: '8px 0 0',
      }}>
        Something broke
      </h2>

      <p style={{ fontSize: 16, color: 'rgba(250,248,240,0.7)', maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
        Even the best schemes hit a snag. Try again — your room is safe on the server.
      </p>

      <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={reset} style={{
          background: '#FF9933', color: '#0d1b35',
          fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
          padding: '12px 24px', borderRadius: 10,
        }}>
          Try again
        </button>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center',
          background: 'rgba(250,248,240,0.08)', color: '#faf8f0',
          fontWeight: 600, fontSize: 15, textDecoration: 'none',
          padding: '12px 24px', borderRadius: 10,
          border: '1px solid rgba(250,248,240,0.14)',
        }}>
          Back to start
        </Link>
      </div>
    </main>
  );
}
