'use client';
import { useRouter } from 'next/navigation';
import LogoLockup from '@/components/ui/LogoLockup';

// The one rulebook. Numbers here are the engine's: seven cards in hand, 25 words, 90 s by
// default, most rounds won takes the game. The landing's short version points here.
const STEPS = [
  {
    num: '01',
    title: 'Set the stage',
    body: 'One laptop or TV shows the game. Everyone else plays from their phone. No app, no accounts: a four-letter code or the QR on the big screen gets you in.',
  },
  {
    num: '02',
    title: 'A challenge is read',
    body: 'A real problem statement appears on the big screen, from healthcare to infrastructure. Everyone sees the same card.',
  },
  {
    num: '03',
    title: 'Play your scheme',
    body: 'From your hand of seven real government schemes, pick the one that best solves the challenge, or the one you can sell with a straight face.',
  },
  {
    num: '04',
    title: 'Justify in 25 words',
    body: 'Type why your scheme works, in English, Hindi or Hinglish. Keep it punchy: one crisp sentence earns a bonus point.',
  },
  {
    num: '05',
    title: 'The AI judge decides',
    body: 'The clock runs ninety seconds unless the host changes it. An AI judge ranks every answer for creativity and fit, and the funniest valid one takes the round. Win the most rounds to win the game.',
  },
];

export default function HowToPlayPage() {
  const router = useRouter();

  return (
    <main
      style={{
        minHeight: '100dvh', background: '#08070f', color: '#fff',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 'clamp(24px, 5vh, 48px) 16px 40px', boxSizing: 'border-box',
      }}
    >
      <LogoLockup size="md" />

      <h2
        style={{
          fontFamily: 'var(--font-bebas), sans-serif', fontSize: 'clamp(32px, 5vw, 44px)',
          letterSpacing: '0.12em', color: '#fff', margin: '28px 0 6px',
        }}
      >
        HOW TO PLAY
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-inter), sans-serif', fontSize: 14, color: 'rgba(250,248,240,0.7)',
          margin: '0 0 24px', textAlign: 'center', maxWidth: '44ch', lineHeight: 1.5,
        }}
      >
        Five steps. The best answer isn&apos;t always the right one, and the judge knows it.
      </p>

      <ol
        style={{
          listStyle: 'none', margin: 0, padding: 0, width: '100%', maxWidth: 640,
          border: '1px solid rgba(250,248,240,0.14)', borderRadius: 18,
          background: 'rgba(250,248,240,0.025)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {STEPS.map((s, i) => (
          <li
            key={s.num}
            style={{
              display: 'grid', gridTemplateColumns: '44px 1fr', gap: '4px 14px',
              padding: '18px 20px',
              borderTop: i === 0 ? 'none' : '1px solid rgba(250,248,240,0.14)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: 11,
                letterSpacing: '0.16em', color: '#FF9933', paddingTop: 6,
              }}
            >
              {s.num}
            </span>
            <h3
              style={{
                fontFamily: 'var(--font-bebas), sans-serif', fontSize: 26, letterSpacing: '0.06em',
                lineHeight: 1, color: '#fff', margin: 0,
              }}
            >
              {s.title}
            </h3>
            <p
              style={{
                gridColumn: 2, fontFamily: 'var(--font-inter), sans-serif', fontSize: 15,
                lineHeight: 1.55, color: 'rgba(250,248,240,0.7)', margin: 0, maxWidth: '58ch',
              }}
            >
              {s.body}
            </p>
          </li>
        ))}
      </ol>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 28 }}>
        <button
          onClick={() => router.push('/')}
          style={{
            height: 52, padding: '0 28px', background: '#FF9933', color: '#1a1208',
            border: '1.5px solid #FF9933', borderRadius: 6, cursor: 'pointer',
            fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: 13,
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}
        >
          Let&apos;s play →
        </button>
        <a
          href="/explore"
          style={{
            fontFamily: 'var(--font-inter), sans-serif', fontSize: 13, letterSpacing: '0.04em',
            color: 'rgba(250,248,240,0.6)', textDecoration: 'none', padding: 12,
          }}
        >
          Curious what&apos;s in the deck? →
        </a>
      </div>
    </main>
  );
}
