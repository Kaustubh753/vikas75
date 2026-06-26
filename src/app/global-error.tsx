'use client';
import { useEffect } from 'react';

// Last-resort boundary for errors thrown by the root layout itself. It replaces the
// whole document, so it must render its own <html>/<body> and cannot rely on globals.css
// or the font variables being available — everything here is self-contained inline styles.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[vikas75] global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div style={{
          minHeight: '100vh', background: '#0d1b35', color: '#faf8f0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 20, padding: '32px 24px', textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}>
          {/* Tricolour mark */}
          <div style={{ display: 'flex', width: 120, height: 6, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ flex: 1, background: '#FF9933' }} />
            <div style={{ flex: 1, background: '#ffffff' }} />
            <div style={{ flex: 1, background: '#138808' }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#FF9933', margin: 0 }}>Vikas 75</h1>
          <p style={{ fontSize: 16, color: 'rgba(250,248,240,0.7)', maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
            Something went badly wrong loading the app. Please reload.
          </p>
          <button onClick={reset} style={{
            background: '#FF9933', color: '#0d1b35',
            fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
            padding: '12px 24px', borderRadius: 10,
          }}>
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
