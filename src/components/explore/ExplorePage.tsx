'use client';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import SchemeGuideReader from '@/components/explore/SchemeGuideReader';
import { hasSchemeDetail } from '@/lib/scheme-details';
import { getSchemeCardImage } from '@/lib/cards';

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

// ── Palette ───────────────────────────────────────────────────
const C = {
  bg:      '#08070f',
  panel:   'rgba(5,11,28,0.92)',
  saffron: '#FF9933',
  gold:    '#FFD700',
  white:   '#faf8f0',
  w70:     'rgba(250,248,240,0.70)',
  w55:     'rgba(250,248,240,0.55)',
  w40:     'rgba(250,248,240,0.40)',
  w18:     'rgba(250,248,240,0.18)',
  w14:     'rgba(250,248,240,0.14)',
  w06:     'rgba(250,248,240,0.06)',
};

const ENTER = 'cubic-bezier(.16,1,.3,1)';
const EXIT = 'cubic-bezier(.45,0,.9,.4)';

// ── Main component ────────────────────────────────────────────
export default function ExplorePage({ schemes }: Props) {
  const [query, setQuery] = useState('');
  // The reader traverses by index; `modal` is the fallback for the one card with no guide.
  const [readerIdx, setReaderIdx] = useState<number | null>(null);
  const [flightFrom, setFlightFrom] = useState<DOMRect | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [modal, setModal] = useState<SchemeCard | null>(null);
  const leaveT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schemes;
    return schemes.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.hi.includes(q) ||
      s.desc.toLowerCase().includes(q)
    );
  }, [schemes, query]);

  // ← / → move through what the reader is actually looking at: the filtered view, minus the
  // cards with no guide (currently only Digital India), which have nothing to page to.
  const readable = useMemo(() => filtered.filter(s => hasSchemeDetail(s.id)), [filtered]);

  useEffect(() => () => { if (leaveT.current) clearTimeout(leaveT.current); }, []);

  const open = useCallback((card: SchemeCard, from: DOMRect | null) => {
    const i = readable.findIndex(s => s.id === card.id);
    if (i < 0) { setModal(card); return; }   // no guide — the card's own detail panel
    setFlightFrom(from);
    setReaderIdx(i);
    // The deck stays mounted a beat and fades out over the reader. Cutting it on the frame
    // the clone appears is what makes a takeoff feel abrupt — the card leaves a screen that
    // has already gone.
    if (from) {
      setLeaving(true);
      if (leaveT.current) clearTimeout(leaveT.current);
      leaveT.current = setTimeout(() => setLeaving(false), 380);
    }
  }, [readable]);

  const closeReader = useCallback(() => {
    setReaderIdx(null);
    setFlightFrom(null);
    setLeaving(false);
  }, []);

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
          onMouseEnter={e => e.currentTarget.style.color = C.w70}
          onMouseLeave={e => e.currentTarget.style.color = C.w40}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Vikas 75
        </Link>

        <div style={{
          display: 'flex', alignItems: 'center',
          fontFamily: 'var(--font-bebas),sans-serif',
          fontSize: 22, color: C.white, letterSpacing: '0.02em',
        }}>
          Explore
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────
          While a card is in flight the deck lifts ABOVE the reader and fades, so the reader
          is revealed from under it rather than simply appearing on top. The flight clone
          (z 20 inside the reader) still flies over both. */}
      <main style={{
        position: 'relative', zIndex: leaving ? 310 : 1,
        maxWidth: 1100, margin: '0 auto',
        padding: '3.5rem 2rem 5rem',
        pointerEvents: leaving ? 'none' : undefined,
        animation: leaving ? `vk-deck-out .38s ${EXIT} both` : undefined,
      }}>
        <DeckTab
          schemes={filtered}
          query={query}
          onQuery={setQuery}
          total={schemes.length}
          onOpen={open}
        />
      </main>

      {/* ── Reader ───────────────────────────────────────────────
          Tapping a card flies it into the guide reader. The card's own text panel survives
          only as the fallback for a card with no guide: for every other card it restated
          exactly what the card face already prints, so it was a second stop on the way to
          the only screen that adds anything. */}
      {readerIdx !== null && readable[readerIdx] && (
        <SchemeGuideReader
          schemes={readable}
          index={readerIdx}
          onIndexChange={setReaderIdx}
          onClose={closeReader}
          flightFrom={flightFrom}
        />
      )}
      <AnimatePresence>
        {modal && <CardModal card={modal} onClose={() => setModal(null)} />}
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
  onOpen: (s: SchemeCard, from: DOMRect | null) => void;
}) {
  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-bebas),sans-serif',
            fontSize: 'clamp(2rem,4vw,3rem)', lineHeight: 1, letterSpacing: '.03em',
            color: C.white, margin: 0,
          }}>
            Know Your Deck
          </h2>
          <p style={{
            fontFamily: 'var(--font-devanagari),sans-serif', fontWeight: 500,
            fontSize: '.95rem', color: C.saffron, margin: '.3rem 0 0',
          }}>
            अपनी डेक जानें
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
            onFocus={e => e.target.style.borderColor = C.saffron}
            onBlur={e => e.target.style.borderColor = C.w14}
          />
          {query && (
            <button onClick={() => onQuery('')} aria-label="Clear search" style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.w40, fontSize: 16, lineHeight: 1, padding: 2,
            }}>×</button>
          )}
        </div>
      </div>

      {/* Tricolour rule, wiped in left to right. */}
      <div style={{
        height: 3, borderRadius: 2, margin: '1.25rem 0 2rem', opacity: .8,
        background: `linear-gradient(90deg, ${C.saffron} 0 33.3%, ${C.white} 33.3% 66.6%, #138808 66.6% 100%)`,
        animation: `vk-reveal .9s ${ENTER} both .1s`,
      }} />

      <p style={{ fontSize: '.8rem', color: 'rgba(250,248,240,.6)', margin: '0 0 1.5rem' }}>
        {query
          ? `${schemes.length} of ${total} match “${query}”`
          : `${total} schemes in the deck`}
      </p>

      {schemes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: C.w40 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🔍</p>
          <p style={{ fontSize: 15 }}>No schemes match &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          // Fluid column count. The old hard repeat(5, 1fr) overflowed the viewport on
          // phones — five columns of unbreakable card names forced the grid wider than the
          // screen and clipped the right column.
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(170px, 100%), 1fr))',
          gap: '1.25rem',
        }}>
          {schemes.map(s => (
            <CardTile key={s.id} card={s} onOpen={onOpen} />
          ))}
        </div>
      )}

      <p style={{ marginTop: '2.5rem', fontSize: '.8rem', lineHeight: 1.7, color: C.w55 }}>
        Tap a card to open its scheme guide. Then{' '}
        <strong style={{ color: C.gold }}>←</strong> / <strong style={{ color: C.gold }}>→</strong>{' '}
        to move between schemes, <strong style={{ color: C.gold }}>Enter</strong> to zoom,{' '}
        <strong style={{ color: C.gold }}>Esc</strong> to come back here.
      </p>
    </div>
  );
}

// ── Card tile ─────────────────────────────────────────────────
// The tile is the flight's origin: its rect is measured on tap and handed to the reader,
// which mounts a fixed clone there and flies it to the rail. The measurement has to happen
// on the click itself — after the deck starts fading, the rect is of a moving element.
function CardTile({ card, onOpen }: { card: SchemeCard; onOpen: (s: SchemeCard, from: DOMRect | null) => void }) {
  const [hovered, setHovered] = useState(false);
  const tile = useRef<HTMLDivElement>(null);
  const imgSrc = getSchemeCardImage(card.id);

  return (
    <button
      onClick={() => onOpen(card, tile.current?.getBoundingClientRect() ?? null)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`${card.name} — open scheme guide`}
      style={{
        background: 'none', border: 'none', padding: 0,
        cursor: 'pointer', display: 'block', width: '100%', minWidth: 0,
      }}
    >
      <div
        ref={tile}
        style={{
          position: 'relative', width: '100%',
          aspectRatio: '412 / 554',
          borderRadius: 12, overflow: 'hidden', background: C.white,
          boxShadow: hovered
            ? `0 0 0 1px ${C.w18}, 0 26px 48px rgba(0,0,0,.7), 0 0 32px rgba(255,153,51,.18)`
            : `0 0 0 1px ${C.w18}, 0 18px 36px rgba(0,0,0,.6)`,
          transform: hovered ? 'translateY(-6px) scale(1.03)' : 'none',
          transition: 'transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .22s ease',
          willChange: 'transform',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- pre-baked static card art */}
        <img
          src={imgSrc}
          alt={card.name}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Hover overlay — the Hindi name and the affordance, over the card's own art. */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(4,8,18,0.92) 0%, rgba(4,8,18,0.5) 45%, transparent 75%)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity .2s ease',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: '12px 10px', gap: 3,
        }}>
          <span style={{
            fontFamily: 'var(--font-devanagari),sans-serif',
            fontSize: 11, fontWeight: 600, color: C.saffron, lineHeight: 1.3,
          }}>
            {card.hi}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, color: C.w70,
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            Read the guide →
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Card detail modal ─────────────────────────────────────────
function CardModal({ card, onClose }: { card: SchemeCard; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const imgSrc = getSchemeCardImage(card.id);

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
          // flexWrap + the panel's min-width stack the layout on phones: side-by-side left
          // the detail panel ~60px wide at 390px. The wrapper scrolls when stacked content
          // exceeds the viewport.
          display: 'flex', gap: 'clamp(20px,3vw,40px)',
          alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center',
          width: '100%', maxWidth: 1100,
          maxHeight: '90vh', overflowY: 'auto',
        }}
        initial={{ scale: 0.93, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 8, opacity: 0 }}
        transition={{ duration: 0.24, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {/* Card image — left (above on phones) */}
        <div style={{
          flexShrink: 0,
          width: 'clamp(200px,44vw,440px)',
          aspectRatio: '5 / 7',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,153,51,0.25)',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>

        {/* Detail panel — right (below on phones; the min-width is what forces the wrap) */}
        <div style={{
          flex: 1, minWidth: 'min(100%, 260px)',
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
            aria-label="Close"
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
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(250,248,240,0.13)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(250,248,240,0.07)'}
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
