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

// ── Helpers ───────────────────────────────────────────────────
function cardImageUrl(id: string): string {
  // s001 → /cards/card-031.webp  (30 challenge cards offset)
  const num = parseInt(id.replace('s', ''), 10);
  return `/cards/card-${String(num + 30).padStart(3, '0')}.webp`;
}

// ── Palette ───────────────────────────────────────────────────
const C = {
  bg:      '#07101f',
  panel:   'rgba(5,11,28,0.92)',
  saffron: '#FF9933',
  white:   '#faf8f0',
  w70:     'rgba(250,248,240,0.70)',
  w40:     'rgba(250,248,240,0.40)',
  w14:     'rgba(250,248,240,0.14)',
  w06:     'rgba(250,248,240,0.06)',
};

type Tab = 'deck' | 'team';

// ── Main component ────────────────────────────────────────────
export default function ExplorePage({ schemes }: Props) {
  const [tab, setTab]       = useState<Tab>('deck');
  const [query, setQuery]   = useState('');
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
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white, fontFamily: 'var(--font-inter),sans-serif', position: 'relative' }}>

      {/* Ambient glow */}
      <div style={{
        position: 'fixed', left: '50%', top: '-20%',
        width: '80vw', height: '80vh', transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse at center,rgba(255,153,51,.1) 0%,rgba(255,153,51,.03) 35%,transparent 65%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Film grain */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        opacity: 0.1, mixBlendMode: 'overlay', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── Header ───────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(7,16,31,0.94)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.w14}`,
        padding: '0 clamp(20px,4vw,64px)',
        display: 'flex', alignItems: 'stretch', gap: 0, height: 52,
      }}>
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 7,
          color: C.w40, textDecoration: 'none',
          fontSize: 13, fontWeight: 500,
          paddingRight: 20, marginRight: 20,
          borderRight: `1px solid ${C.w14}`,
          transition: 'color .15s',
        }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = C.w70}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = C.w40}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Vikas 75
        </Link>

        <div style={{
          display: 'flex', alignItems: 'center',
          fontFamily: 'var(--font-bebas),sans-serif',
          fontSize: 22, color: C.white, letterSpacing: '0.02em', paddingRight: 32,
        }}>
          Explore
        </div>

        <nav style={{ display: 'flex', alignItems: 'stretch' }}>
          {(['deck', 'team'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0 20px', height: '100%',
              color: tab === t ? C.saffron : C.w40,
              fontSize: 13, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              borderBottom: tab === t ? `2px solid ${C.saffron}` : '2px solid transparent',
              marginBottom: -1, transition: 'color .15s, border-color .15s',
            }}
              onMouseEnter={e => { if (tab !== t) (e.currentTarget as HTMLButtonElement).style.color = C.w70; }}
              onMouseLeave={e => { if (tab !== t) (e.currentTarget as HTMLButtonElement).style.color = C.w40; }}
            >
              {t === 'deck' ? 'The Deck' : 'The Team'}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Body ─────────────────────────────────────────────── */}
      <main style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1400, margin: '0 auto',
        padding: 'clamp(28px,4vh,52px) clamp(20px,4vw,64px)',
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

      {/* ── Detail modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {active && <CardModal card={active} onClose={() => setActive(null)} />}
      </AnimatePresence>
    </div>
  );
}

// ── Deck tab ──────────────────────────────────────────────────
function DeckTab({ schemes, query, onQuery, total, onOpen }: {
  schemes: SchemeCard[];
  query: string;
  onQuery: (q: string) => void;
  total: number;
  onOpen: (s: SchemeCard) => void;
}) {
  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-bebas),sans-serif',
            fontSize: 'clamp(28px,4vw,52px)', lineHeight: 1,
            color: C.white, margin: '0 0 6px',
          }}>
            The Deck
          </h2>
          <p style={{ fontSize: 14, color: C.w40, margin: 0 }}>
            {total} government schemes. Pick one. Defend it.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.w40 }}
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
              background: C.w06, border: `1px solid ${C.w14}`, borderRadius: 8,
              padding: '9px 32px 9px 34px',
              color: C.white, fontSize: 13, outline: 'none', width: 240,
              fontFamily: 'var(--font-inter),sans-serif',
              transition: 'border-color .15s',
            }}
            onFocus={e => (e.target as HTMLInputElement).style.borderColor = C.saffron}
            onBlur={e => (e.target as HTMLInputElement).style.borderColor = C.w14}
          />
          {query && (
            <button onClick={() => onQuery('')} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.w40, fontSize: 16, lineHeight: 1, padding: 2,
            }}>×</button>
          )}
        </div>
      </div>

      {query && (
        <p style={{ fontSize: 12, color: C.w40, marginBottom: 20, letterSpacing: '0.06em' }}>
          {schemes.length} result{schemes.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
        </p>
      )}

      {schemes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: C.w40 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🔍</p>
          <p style={{ fontSize: 15 }}>No schemes match &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
          gap: 'clamp(12px,1.4vw,20px)',
        }}>
          {schemes.map(s => (
            <CardTile key={s.id} card={s} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Card tile — actual card image ─────────────────────────────
function CardTile({ card, onOpen }: { card: SchemeCard; onOpen: (s: SchemeCard) => void }) {
  const [hovered, setHovered] = useState(false);
  const imgSrc = cardImageUrl(card.id);

  // Card aspect ratio matches physical card: ~2.5×3.5 inches = 5:7
  return (
    <button
      onClick={() => onOpen(card)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'none', border: 'none', padding: 0,
        cursor: 'pointer', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 10,
      }}
    >
      {/* Card image wrapper */}
      <div style={{
        position: 'relative', width: '100%',
        aspectRatio: '5 / 7',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: hovered
          ? '0 20px 48px rgba(0,0,0,0.7), 0 0 0 2px rgba(255,153,51,0.6), 0 0 32px rgba(255,153,51,0.18)'
          : '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,153,51,0.12)',
        transform: hovered ? 'translateY(-6px) scale(1.03)' : 'none',
        transition: 'transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .22s ease',
        willChange: 'transform',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={card.name}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', display: 'block',
            transition: 'filter .22s ease',
            filter: hovered ? 'brightness(1.08)' : 'brightness(0.95)',
          }}
        />

        {/* Hover overlay — slides up from bottom */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(4,8,18,0.92) 0%, rgba(4,8,18,0.5) 45%, transparent 75%)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity .2s ease',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '12px 10px',
          gap: 3,
        }}>
          <span style={{
            fontFamily: 'var(--font-devanagari),sans-serif',
            fontSize: 11, fontWeight: 600, color: C.saffron,
            lineHeight: 1.3,
          }}>
            {card.hi}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, color: C.w70,
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            {card.bullets.length} key points →
          </span>
        </div>
      </div>

      {/* Name below card */}
      <span style={{
        fontSize: 12, fontWeight: 600, lineHeight: 1.3,
        color: hovered ? C.white : C.w70,
        textAlign: 'center',
        transition: 'color .18s',
        maxWidth: '100%',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
        overflow: 'hidden',
      }}>
        {card.name}
      </span>
    </button>
  );
}

// ── Card detail modal ─────────────────────────────────────────
function CardModal({ card, onClose }: { card: SchemeCard; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const imgSrc = cardImageUrl(card.id);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    // Prevent body scroll while modal open
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <motion.div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(4,8,18,0.85)', backdropFilter: 'blur(16px)',
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
          display: 'flex', gap: 'clamp(20px,3vw,40px)',
          alignItems: 'flex-start',
          width: '100%', maxWidth: 780,
          maxHeight: '90vh',
        }}
        initial={{ scale: 0.93, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 8, opacity: 0 }}
        transition={{ duration: 0.24, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {/* Card image — left */}
        <div style={{
          flexShrink: 0,
          width: 'clamp(140px,22vw,220px)',
          aspectRatio: '5 / 7',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,153,51,0.25)',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>

        {/* Detail panel — right */}
        <div style={{
          flex: 1, minWidth: 0,
          background: 'linear-gradient(160deg,rgba(255,153,51,.06) 0%,rgba(5,11,28,.96) 100%)',
          border: `1px solid rgba(255,153,51,0.25)`,
          borderRadius: 14,
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,153,51,0.14)',
          padding: 'clamp(22px,3vw,36px)',
          overflowY: 'auto', maxHeight: '90vh',
          position: 'relative',
          backdropFilter: 'blur(12px)',
        }}>
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(250,248,240,0.07)',
              border: `1px solid ${C.w14}`,
              color: C.w70, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, lineHeight: 1,
              transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(250,248,240,0.13)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(250,248,240,0.07)'}
          >×</button>

          {/* ID */}
          <span style={{ display: 'inline-block', marginBottom: 12, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: C.w40, textTransform: 'uppercase' }}>
            {card.id}
          </span>

          {/* Name */}
          <h3 style={{
            fontFamily: 'var(--font-bebas),sans-serif',
            fontSize: 'clamp(22px,3vw,34px)',
            lineHeight: 1, color: C.white, margin: '0 0 6px',
          }}>
            {card.name}
          </h3>

          {/* Hindi */}
          <p style={{
            fontFamily: 'var(--font-devanagari),sans-serif',
            fontSize: 16, fontWeight: 600, color: C.saffron,
            margin: '0 0 18px', lineHeight: 1.4,
          }}>
            {card.hi}
          </p>

          <div style={{ height: 1, background: C.w14, marginBottom: 18 }} />

          {/* Description */}
          <p style={{ fontSize: 14, lineHeight: 1.7, color: C.w70, margin: '0 0 22px' }}>
            {card.desc}
          </p>

          {/* Bullets */}
          <div style={{
            background: 'rgba(255,153,51,0.05)',
            border: `1px solid rgba(255,153,51,0.14)`,
            borderRadius: 8, padding: '14px 16px',
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.w40, margin: '0 0 10px' }}>
              Key points
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {card.bullets.map((b, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: C.saffron, fontSize: 13, lineHeight: 1.55, flexShrink: 0 }}>›</span>
                  <span style={{ fontSize: 13, lineHeight: 1.55, color: C.w70 }}>{b}</span>
                </li>
              ))}
            </ul>
          </div>
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
        <h2 style={{ fontFamily: 'var(--font-bebas),sans-serif', fontSize: 'clamp(28px,4vw,52px)', lineHeight: 1, color: C.white, margin: '0 0 6px' }}>
          The Team
        </h2>
        <p style={{ fontSize: 14, color: C.w40, margin: 0 }}>The people behind Vikas 75.</p>
      </div>
      <div style={{
        background: C.panel, border: `1px solid ${C.w14}`, borderRadius: 12,
        padding: 'clamp(40px,6vh,80px) clamp(24px,4vw,48px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 16, textAlign: 'center', backdropFilter: 'blur(8px)',
      }}>
        <span style={{ fontSize: 40 }}>🪔</span>
        <p style={{ fontFamily: 'var(--font-bebas),sans-serif', fontSize: 'clamp(20px,2.5vw,30px)', color: C.white, margin: 0, letterSpacing: '0.04em' }}>
          Coming Soon
        </p>
        <p style={{ fontSize: 13, color: C.w40, margin: 0, maxWidth: 320, lineHeight: 1.6 }}>
          Team profiles are on their way. Check back soon.
        </p>
      </div>
    </div>
  );
}
