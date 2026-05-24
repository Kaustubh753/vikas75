'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

// ── Types ─────────────────────────────────────────────────────
interface SchemeCard {
  id: string;
  name: string;
  hi: string;
  desc: string;
  bullets: string[];
}

interface Props {
  schemes: SchemeCard[];
}

// ── Palette (matches landing page) ───────────────────────────
const C = {
  bg:       '#07101f',
  panel:    'rgba(5,11,28,0.88)',
  border:   'rgba(255,153,51,0.22)',
  saffron:  '#FF9933',
  saff12:   'rgba(255,153,51,0.12)',
  saff20:   'rgba(255,153,51,0.20)',
  white:    '#faf8f0',
  white70:  'rgba(250,248,240,0.70)',
  white40:  'rgba(250,248,240,0.40)',
  white14:  'rgba(250,248,240,0.14)',
  white06:  'rgba(250,248,240,0.06)',
};

type Tab = 'deck' | 'team';

// ── Main component ────────────────────────────────────────────
export default function ExplorePage({ schemes }: Props) {
  const [tab, setTab]     = useState<Tab>('deck');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<SchemeCard | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schemes;
    return schemes.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.hi.includes(q) ||
      s.desc.toLowerCase().includes(q)
    );
  }, [schemes, query]);

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      color: C.white,
      fontFamily: 'var(--font-inter),sans-serif',
      position: 'relative',
    }}>

      {/* Saffron radial glow */}
      <div style={{
        position: 'fixed', left: '50%', top: '-20%',
        width: '80vw', height: '80vh',
        transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse at center,rgba(255,153,51,.12) 0%,rgba(255,153,51,.04) 30%,transparent 65%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Film grain */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        opacity: 0.1, mixBlendMode: 'overlay', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── Header ─────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(7,16,31,0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.white14}`,
        padding: '0 clamp(20px,4vw,64px)',
        display: 'flex', alignItems: 'stretch',
        gap: 0,
      }}>
        {/* Back link */}
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: C.white40, textDecoration: 'none',
          fontSize: 13, fontWeight: 500,
          padding: '0 20px 0 0',
          marginRight: 20,
          borderRight: `1px solid ${C.white14}`,
          transition: 'color .15s',
        }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = C.white70}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = C.white40}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Vikas 75
        </Link>

        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center',
          fontFamily: 'var(--font-bebas),sans-serif',
          fontSize: 22, color: C.white, letterSpacing: '0.02em',
          paddingRight: 32,
        }}>
          Explore
        </div>

        {/* Tabs */}
        <nav style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
          {(['deck', 'team'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0 20px',
              color: tab === t ? C.saffron : C.white40,
              fontSize: 13, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              borderBottom: tab === t ? `2px solid ${C.saffron}` : '2px solid transparent',
              transition: 'color .15s, border-color .15s',
              marginBottom: -1,
              height: 52,
            }}
              onMouseEnter={e => { if (tab !== t) (e.currentTarget as HTMLButtonElement).style.color = C.white70; }}
              onMouseLeave={e => { if (tab !== t) (e.currentTarget as HTMLButtonElement).style.color = C.white40; }}
            >
              {t === 'deck' ? 'The Deck' : 'The Team'}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Body ───────────────────────────────────────────── */}
      <main style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1280, margin: '0 auto',
        padding: 'clamp(28px,4vh,56px) clamp(20px,4vw,64px)',
      }}>
        {tab === 'deck' && (
          <DeckTab
            schemes={filtered}
            query={query}
            onQuery={setQuery}
            total={schemes.length}
            onOpen={setActive}
          />
        )}
        {tab === 'team' && <TeamTab />}
      </main>

      {/* ── Card detail modal ──────────────────────────────── */}
      <AnimatePresence>
        {active && (
          <CardModal card={active} onClose={() => setActive(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Deck tab ──────────────────────────────────────────────────
function DeckTab({
  schemes, query, onQuery, total, onOpen,
}: {
  schemes: SchemeCard[];
  query: string;
  onQuery: (q: string) => void;
  total: number;
  onOpen: (s: SchemeCard) => void;
}) {
  return (
    <div>
      {/* Section header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-bebas),sans-serif',
            fontSize: 'clamp(28px,4vw,52px)', lineHeight: 1,
            color: '#fff', margin: '0 0 6px',
          }}>
            The Deck
          </h2>
          <p style={{ fontSize: 14, color: C.white40, margin: 0 }}>
            {total} government schemes. Pick one. Defend it.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.white40 }}
            width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search schemes…"
            value={query}
            onChange={e => onQuery(e.target.value)}
            style={{
              background: C.white06,
              border: `1px solid ${C.white14}`,
              borderRadius: 8,
              padding: '9px 14px 9px 34px',
              color: C.white,
              fontSize: 13,
              outline: 'none',
              width: 220,
              transition: 'border-color .15s',
              fontFamily: 'var(--font-inter),sans-serif',
            }}
            onFocus={e => (e.target as HTMLInputElement).style.borderColor = C.saffron}
            onBlur={e => (e.target as HTMLInputElement).style.borderColor = C.white14}
          />
          {query && (
            <button onClick={() => onQuery('')} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.white40, fontSize: 14, lineHeight: 1, padding: 2,
            }}>×</button>
          )}
        </div>
      </div>

      {/* Result count when searching */}
      {query && (
        <p style={{ fontSize: 12, color: C.white40, marginBottom: 20, letterSpacing: '0.06em' }}>
          {schemes.length} result{schemes.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Grid */}
      {schemes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: C.white40 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🔍</p>
          <p style={{ fontSize: 15 }}>No schemes match &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}>
          {schemes.map(s => (
            <SchemeCardTile key={s.id} card={s} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Individual scheme card tile ───────────────────────────────
function SchemeCardTile({ card, onOpen }: { card: SchemeCard; onOpen: (s: SchemeCard) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => onOpen(card)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? `linear-gradient(160deg, rgba(255,153,51,0.09) 0%, ${C.panel} 100%)`
          : `linear-gradient(160deg, rgba(255,153,51,0.03) 0%, ${C.panel} 100%)`,
        border: `1px solid ${hovered ? 'rgba(255,153,51,0.38)' : C.border}`,
        borderRadius: 10,
        padding: '18px 18px 16px',
        textAlign: 'left',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        boxShadow: hovered
          ? '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,153,51,0.18)'
          : '0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,153,51,0.08)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all .18s ease',
        display: 'flex', flexDirection: 'column', gap: 8,
        alignItems: 'flex-start',
      }}
    >
      {/* Scheme ID chip */}
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
        color: C.white40, textTransform: 'uppercase',
      }}>
        {card.id}
      </span>

      {/* English name */}
      <span style={{
        fontSize: 14, fontWeight: 700, lineHeight: 1.3,
        color: C.white, letterSpacing: '-0.01em',
      }}>
        {card.name}
      </span>

      {/* Hindi name */}
      <span style={{
        fontFamily: 'var(--font-devanagari),sans-serif',
        fontSize: 13, fontWeight: 500,
        color: C.saffron, lineHeight: 1.4,
      }}>
        {card.hi}
      </span>

      {/* Desc preview */}
      <span style={{
        fontSize: 12, lineHeight: 1.5, color: C.white40,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
        overflow: 'hidden',
      }}>
        {card.desc}
      </span>

      {/* "More" cue */}
      <span style={{
        fontSize: 11, color: hovered ? C.saffron : C.white40,
        fontWeight: 600, letterSpacing: '0.06em',
        marginTop: 2, transition: 'color .15s',
      }}>
        {card.bullets.length} key points →
      </span>
    </button>
  );
}

// ── Card detail modal ─────────────────────────────────────────
function CardModal({ card, onClose }: { card: SchemeCard; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(4,8,18,0.82)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(16px,3vw,40px)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        style={{
          background: 'linear-gradient(160deg,rgba(255,153,51,.07) 0%,rgba(5,11,28,.97) 100%)',
          border: `1px solid rgba(255,153,51,0.30)`,
          borderRadius: 14,
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,153,51,0.18)',
          backdropFilter: 'blur(16px)',
          padding: 'clamp(24px,3vw,40px)',
          width: '100%', maxWidth: 540,
          maxHeight: '85vh', overflowY: 'auto',
          position: 'relative',
        }}
        initial={{ scale: 0.94, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 8, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(250,248,240,0.08)',
            border: `1px solid ${C.white14}`,
            color: C.white70, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, lineHeight: 1, fontWeight: 300,
            transition: 'background .15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(250,248,240,0.14)'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(250,248,240,0.08)'}
        >
          ×
        </button>

        {/* ID chip */}
        <span style={{
          display: 'inline-block', marginBottom: 14,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
          color: C.white40, textTransform: 'uppercase',
        }}>
          {card.id}
        </span>

        {/* Name */}
        <h3 style={{
          fontFamily: 'var(--font-bebas),sans-serif',
          fontSize: 'clamp(22px,3.5vw,36px)',
          lineHeight: 1, color: C.white,
          margin: '0 0 6px', letterSpacing: '0.01em',
        }}>
          {card.name}
        </h3>

        {/* Hindi */}
        <p style={{
          fontFamily: 'var(--font-devanagari),sans-serif',
          fontSize: 16, fontWeight: 600,
          color: C.saffron, margin: '0 0 20px', lineHeight: 1.4,
        }}>
          {card.hi}
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: C.white14, marginBottom: 20 }} />

        {/* Description */}
        <p style={{
          fontSize: 14, lineHeight: 1.65,
          color: C.white70, margin: '0 0 24px',
        }}>
          {card.desc}
        </p>

        {/* Bullets */}
        <div style={{
          background: 'rgba(255,153,51,0.05)',
          border: `1px solid rgba(255,153,51,0.15)`,
          borderRadius: 8,
          padding: '16px 18px',
        }}>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: C.white40,
            margin: '0 0 12px',
          }}>
            Key points
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {card.bullets.map((b, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: C.saffron, fontSize: 14, lineHeight: 1.5, flexShrink: 0 }}>›</span>
                <span style={{ fontSize: 13, lineHeight: 1.55, color: C.white70 }}>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Team tab ──────────────────────────────────────────────────
function TeamTab() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{
          fontFamily: 'var(--font-bebas),sans-serif',
          fontSize: 'clamp(28px,4vw,52px)', lineHeight: 1,
          color: '#fff', margin: '0 0 6px',
        }}>
          The Team
        </h2>
        <p style={{ fontSize: 14, color: C.white40, margin: 0 }}>
          The people behind Vikas 75.
        </p>
      </div>

      {/* Placeholder */}
      <div style={{
        background: C.panel,
        border: `1px solid ${C.white14}`,
        borderRadius: 12,
        padding: 'clamp(40px,6vh,80px) clamp(24px,4vw,48px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 16, textAlign: 'center',
        backdropFilter: 'blur(8px)',
      }}>
        <span style={{ fontSize: 40 }}>🪔</span>
        <p style={{
          fontFamily: 'var(--font-bebas),sans-serif',
          fontSize: 'clamp(20px,2.5vw,30px)',
          color: C.white, margin: 0, letterSpacing: '0.04em',
        }}>
          Coming Soon
        </p>
        <p style={{ fontSize: 13, color: C.white40, margin: 0, maxWidth: 320, lineHeight: 1.6 }}>
          Team profiles are on their way. Check back soon.
        </p>
      </div>
    </div>
  );
}
