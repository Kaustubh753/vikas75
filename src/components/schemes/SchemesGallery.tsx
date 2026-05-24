'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ────────────────────────────────────────────────────
interface SchemeCard { id: string; name: string; hi: string; desc: string; bullets: string[] }
interface Props { schemes: SchemeCard[] }

// ── Constants ────────────────────────────────────────────────
const SPACING     = 620;          // Z-gap between exhibits
const WALL_X      = 390;          // X offset left / right
const PERSPECTIVE = 1000;         // CSS perspective (px)
const CARD_W      = 172;          // card width (px)
const CARD_H      = Math.round(CARD_W * 7 / 5); // 240 — 5:7 aspect
const SCROLL_PX   = 260;          // scroll pixels per exhibit
const ENTRANCE_MS = 1500;         // entrance animation duration (ms)
const LERP        = 0.075;        // camera smoothing factor
const LOAD_AHEAD  = 3;            // cards to preload ahead of camera

function cardSrc(id: string) {
  const n = parseInt(id.replace('s', ''), 10);
  return `/cards/card-${String(n + 30).padStart(3, '0')}.webp`;
}

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

// ── Gallery ──────────────────────────────────────────────────
export default function SchemesGallery({ schemes }: Props) {
  const router = useRouter();
  const N = schemes.length; // 75

  // Refs — all animation state lives here, never in React state
  const sceneRef      = useRef<HTMLDivElement>(null);
  const currentZRef   = useRef(0);          // camera Z (lerped)
  const targetZRef    = useRef(0);          // camera Z (raw from scroll)
  const rafRef        = useRef<number>(0);
  const startTimeRef  = useRef(0);
  const modeRef       = useRef<'entrance' | 'scroll'>('entrance');

  // React state — only UI overlays
  const [entranceDone, setEntranceDone]   = useState(false);
  const [activeIdx,    setActiveIdx]      = useState<number | null>(null);
  const [progress,     setProgress]       = useState(0);
  const [currentCard,  setCurrentCard]    = useState(1);
  const [loadedSet,    setLoadedSet]      = useState(() => new Set([0, 1, 2, 3]));

  const totalScroll = N * SCROLL_PX + 1800;

  // ── Animation loop ───────────────────────────────────────
  useEffect(() => {
    startTimeRef.current = performance.now();

    // Entrance Z: camera starts this far "outside" (positive Z = toward viewer)
    const ENTRANCE_START = 700;
    currentZRef.current = ENTRANCE_START;

    function loop(now: number) {
      if (modeRef.current === 'entrance') {
        const t = Math.min((now - startTimeRef.current) / ENTRANCE_MS, 1);
        currentZRef.current = ENTRANCE_START * (1 - easeOutCubic(t));
        if (t >= 1) {
          currentZRef.current = 0;
          modeRef.current = 'scroll';
          setEntranceDone(true);
        }
      } else {
        const diff = targetZRef.current - currentZRef.current;
        currentZRef.current += diff * LERP;
      }

      // Write transform — zero layout reads
      if (sceneRef.current) {
        sceneRef.current.style.transform = `translateZ(${currentZRef.current}px)`;
      }

      // Update UI counters (cheap — just maths)
      const camZ       = currentZRef.current;
      const cardIdx    = Math.max(0, Math.min(N - 1, Math.round(camZ / SPACING)));
      const progRaw    = targetZRef.current / (N * SPACING);

      setCurrentCard(cardIdx + 1);
      setProgress(Math.min(Math.max(progRaw, 0), 1));

      // Expand loaded set — only add, never remove (images stay cached)
      const lo = Math.max(0, cardIdx - 1);
      const hi = Math.min(N - 1, cardIdx + LOAD_AHEAD);
      setLoadedSet(prev => {
        let changed = false;
        const next = new Set(prev);
        for (let i = lo; i <= hi; i++) { if (!prev.has(i)) { next.add(i); changed = true; } }
        return changed ? next : prev;
      });

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [N]);

  // ── Scroll handler ───────────────────────────────────────
  useEffect(() => {
    if (!entranceDone) return;
    const onScroll = () => {
      // No layout thrashing — scrollY is free
      targetZRef.current = window.scrollY * (SPACING / SCROLL_PX);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [entranceDone]);

  // ── Keyboard ────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveIdx(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      {/* Scroll track — gives the page its height */}
      <div style={{ height: totalScroll, pointerEvents: 'none' }} />

      {/* ── Fixed 3D viewport ──────────────────────────── */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 10,
          perspective: `${PERSPECTIVE}px`,
          perspectiveOrigin: '50% 42%',
          overflow: 'hidden',
          background: '#0a0f1e',
        }}
      >
        {/* Atmospheric depth — subtle vanishing-point glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 28% 55% at 50% 8%,  rgba(255,153,51,0.07) 0%, transparent 100%),
            radial-gradient(ellipse 60% 35% at 50% 50%, rgba(26,58,110,0.22)  0%, transparent 70%)
          `,
        }} />

        {/* Subtle horizontal scan-line texture on walls */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 3px,
            rgba(255,255,255,0.012) 3px,
            rgba(255,255,255,0.012) 4px
          )`,
        }} />

        {/* ── 3D scene ─────────────────────────────────── */}
        <div
          ref={sceneRef}
          style={{
            position: 'absolute', inset: 0,
            transformStyle: 'preserve-3d',
            transform: 'translateZ(700px)',  // entrance start — JS overwrites immediately
            willChange: 'transform',
          }}
        >
          {/* Floor strip — extends in Z from viewport center */}
          <FloorPlane depth={(N + 2) * SPACING} />

          {/* Exhibit cards */}
          {schemes.map((card, i) => (
            <ExhibitCard
              key={card.id}
              card={card}
              index={i}
              total={N}
              side={i % 2 === 0 ? -1 : 1}
              zPos={-(i * SPACING)}
              isActive={activeIdx === i}
              loaded={loadedSet.has(i)}
              onActivate={() => setActiveIdx(activeIdx === i ? null : i)}
              onDeactivate={() => setActiveIdx(null)}
            />
          ))}

          {/* End of corridor CTA */}
          <EndCTA
            zPos={-(N * SPACING + 280)}
            onHost={() => router.push('/host/setup')}
            onJoin={() => router.push('/')}
          />
        </div>

        {/* ── HUD (not in 3D scene) ─────────────────────── */}

        {/* Top-left labels */}
        <div style={{
          position: 'absolute', top: 20, left: 24, zIndex: 40,
          display: 'flex', alignItems: 'center', gap: 18,
          opacity: entranceDone ? 1 : 0,
          transition: 'opacity 0.7s ease 0.3s',
        }}>
          <a href="/explore" style={{
            fontFamily: 'var(--font-inter),sans-serif',
            fontSize: 11, color: 'rgba(250,248,240,0.32)',
            textDecoration: 'none', letterSpacing: '0.08em',
            transition: 'color .15s',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,248,240,0.65)'}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,248,240,0.32)'}
          >
            ← Explore
          </a>
          <span style={{
            fontFamily: 'var(--font-inter),sans-serif',
            fontSize: 11, fontWeight: 600,
            color: '#FF9933', letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>
            The Schemes Gallery
          </span>
        </div>

        {/* Scroll hint — fades out once the user starts scrolling */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%',
          transform: 'translateX(-50%)', zIndex: 40,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
          fontFamily: 'var(--font-inter),sans-serif',
          fontSize: 11, color: 'rgba(250,248,240,0.32)',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          pointerEvents: 'none',
          opacity: entranceDone && progress < 0.018 ? 1 : 0,
          transition: 'opacity 0.5s',
        }}>
          Scroll to explore
          <span style={{ animation: 'vkBounce 1.6s ease-in-out infinite', display: 'block', fontSize: 13 }}>↓</span>
        </div>

        {/* Progress bar — right edge */}
        <div style={{
          position: 'absolute', right: 20, top: '50%',
          transform: 'translateY(-50%)', zIndex: 40,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
          opacity: entranceDone ? 1 : 0,
          transition: 'opacity 0.6s',
        }}>
          <span style={{
            fontFamily: 'var(--font-inter),sans-serif',
            fontSize: 10, fontWeight: 600,
            color: 'rgba(255,153,51,0.7)', letterSpacing: '0.06em',
          }}>
            {currentCard}
          </span>
          <div style={{
            width: 2, height: 130,
            background: 'rgba(250,248,240,0.08)', borderRadius: 1,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: `${progress * 100}%`,
              background: 'linear-gradient(to bottom, #FF9933, rgba(255,153,51,0.5))',
              borderRadius: 1,
            }} />
          </div>
          <span style={{
            fontFamily: 'var(--font-inter),sans-serif',
            fontSize: 10, color: 'rgba(250,248,240,0.25)', letterSpacing: '0.06em',
          }}>
            {N}
          </span>
        </div>

        {/* Active-card backdrop */}
        {activeIdx !== null && (
          <div
            onClick={() => setActiveIdx(null)}
            style={{
              position: 'absolute', inset: 0, zIndex: 30,
              background: 'rgba(4,8,18,0.78)',
              backdropFilter: 'blur(7px)',
              cursor: 'pointer',
            }}
          />
        )}
      </div>

      <style>{`
        @keyframes vkBounce {
          0%,100% { transform: translateY(0); opacity: 0.32; }
          50%      { transform: translateY(5px); opacity: 0.65; }
        }
        /* Prevent body scroll restoration interfering with fixed scene */
        html { scroll-behavior: auto !important; }
      `}</style>
    </>
  );
}

// ── Floor plane ──────────────────────────────────────────────
// A flat div rotated 90° on X, extending into the depth of the scene.
function FloorPlane({ depth }: { depth: number }) {
  return (
    <div style={{
      position: 'absolute',
      width: 1100,
      height: depth,
      left: '50%', top: '50%',
      transformOrigin: 'top center',
      transform: `translateX(-50%) translateY(${CARD_H / 2 + 55}px) rotateX(90deg)`,
      // Subtle reflective sheen — darker gradient, barely perceptible
      background: `
        linear-gradient(to bottom,
          rgba(14,22,48,0.9) 0%,
          rgba(8,14,32,0.95) 30%,
          rgba(5,9,22,1) 100%
        )
      `,
      // Faint card-reflection strip down the center
      boxShadow: 'inset 0 0 120px rgba(255,153,51,0.025)',
    }} />
  );
}

// ── Individual exhibit card ───────────────────────────────────
function ExhibitCard({
  card, index, total, side, zPos,
  isActive, loaded, onActivate, onDeactivate,
}: {
  card: SchemeCard; index: number; total: number;
  side: number; zPos: number;
  isActive: boolean; loaded: boolean;
  onActivate: () => void; onDeactivate: () => void;
}) {
  const [flippedState, setFlippedState] = useState(false);
  const [hovered, setHovered] = useState(false);
  const imgSrc = cardSrc(card.id);

  const flip   = flippedState;
  const setFlip = setFlippedState;

  // Reset flip when card deactivates
  useEffect(() => { if (!isActive) setFlip(false); }, [isActive]);

  const xPos = side * WALL_X;
  const rotY = side * -5; // slight angle toward corridor centre

  // Outer transform: wall position normally, fly-forward when active
  const outerTransform = isActive
    ? `translateX(${xPos * 0.12}px) translateZ(${zPos + 570}px) rotateY(0deg) scale(1.26)`
    : `translateX(${xPos}px) translateZ(${zPos}px) rotateY(${rotY}deg)`;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%', top: '50%',
        width: CARD_W,
        // Center, then apply 3D exhibit transform
        transform: `translateX(-50%) translateY(-50%) ${outerTransform}`,
        transformStyle: 'preserve-3d',
        transition: isActive
          ? 'transform 0.52s cubic-bezier(0.34,1.56,0.64,1)'
          : hovered
          ? 'transform 0.22s ease'
          : 'transform 0.35s ease',
        cursor: isActive ? 'default' : 'pointer',
        zIndex: isActive ? 200 : 'auto',
        willChange: 'transform',
      }}
      onClick={!isActive ? onActivate : undefined}
      onMouseEnter={() => !isActive && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Per-card spotlight — radial gradient above the card */}
      <div style={{
        position: 'absolute',
        bottom: '100%', left: '50%',
        transform: 'translateX(-50%)',
        width: 350, height: 240,
        background: `radial-gradient(ellipse at 50% 100%,
          rgba(255,153,51,${isActive ? 0.48 : hovered ? 0.32 : 0.16}) 0%,
          transparent 68%)`,
        pointerEvents: 'none',
        transition: 'background 0.4s ease',
      }} />

      {/* ── Card flip container ──────────────────────── */}
      <div style={{
        width: CARD_W, height: CARD_H,
        position: 'relative',
        transformStyle: 'preserve-3d',
        transform: flip ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transition: 'transform 0.65s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* Front face — card image */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          borderRadius: 8, overflow: 'hidden',
          border: `2px solid rgba(255,153,51,${isActive ? 0.72 : hovered ? 0.48 : 0.22})`,
          boxShadow: isActive
            ? '0 0 0 3px rgba(0,0,0,0.55), 0 28px 72px rgba(0,0,0,0.75), 0 0 50px rgba(255,153,51,0.22)'
            : hovered
            ? '0 0 0 3px rgba(0,0,0,0.45), 0 16px 48px rgba(0,0,0,0.65), 0 0 24px rgba(255,153,51,0.1)'
            : '0 0 0 3px rgba(0,0,0,0.4),  0 8px  28px rgba(0,0,0,0.55)',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}>
          {loaded ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc} alt={card.name}
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover', display: 'block',
                filter: `brightness(${isActive ? 1.14 : hovered ? 1.06 : 0.86})`,
                transition: 'filter 0.35s ease',
              }}
            />
          ) : (
            // Placeholder while lazy-loading
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(160deg,#142244 0%,#0a1530 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'rgba(255,153,51,0.07)',
                boxShadow: '0 0 0 8px rgba(255,153,51,0.04)',
              }} />
            </div>
          )}
        </div>

        {/* Back face — scheme details */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          borderRadius: 8,
          background: 'linear-gradient(160deg,#0f2448 0%,#07101f 100%)',
          border: '2px solid rgba(255,153,51,0.38)',
          boxShadow: '0 28px 72px rgba(0,0,0,0.75)',
          padding: '14px 13px',
          display: 'flex', flexDirection: 'column', gap: 9, overflow: 'hidden',
        }}>
          <div style={{ fontSize: 9, color: 'rgba(255,153,51,0.5)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
            {card.id} · {index + 1} of {total}
          </div>
          <div style={{
            fontFamily: 'var(--font-bebas),sans-serif',
            fontSize: 17, lineHeight: 1.1, color: '#fff',
          }}>
            {card.name}
          </div>
          <div style={{
            fontFamily: 'var(--font-devanagari),sans-serif',
            fontSize: 11, fontWeight: 600, color: '#FF9933', lineHeight: 1.35,
          }}>
            {card.hi}
          </div>
          <div style={{ height: 1, background: 'rgba(250,248,240,0.1)', flexShrink: 0 }} />
          <div style={{
            fontSize: 10, lineHeight: 1.6, color: 'rgba(250,248,240,0.58)',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
            overflow: 'hidden',
          }}>
            {card.desc}
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5, flex: 1, overflow: 'hidden' }}>
            {card.bullets.slice(0, 3).map((b, bi) => (
              <li key={bi} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span style={{ color: '#FF9933', fontSize: 9, lineHeight: 1.6, flexShrink: 0 }}>›</span>
                <span style={{ fontSize: 9, lineHeight: 1.55, color: 'rgba(250,248,240,0.5)' }}>{b}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={e => {
              e.stopPropagation();
              setFlip(false);
              setTimeout(onDeactivate, 380);
            }}
            style={{
              background: 'rgba(255,153,51,0.1)',
              border: '1px solid rgba(255,153,51,0.22)',
              borderRadius: 4, padding: '5px 0', width: '100%',
              color: 'rgba(250,248,240,0.55)',
              fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
              fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-inter),sans-serif',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = 'rgba(255,153,51,0.18)';
              b.style.borderColor = 'rgba(255,153,51,0.4)';
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = 'rgba(255,153,51,0.1)';
              b.style.borderColor = 'rgba(255,153,51,0.22)';
            }}
          >
            Return to wall
          </button>
        </div>
      </div>

      {/* Museum plaque — below the frame */}
      <div style={{
        marginTop: 9,
        opacity: isActive ? 0 : 1,
        transform: isActive ? 'translateY(4px)' : 'translateY(0)',
        transition: 'opacity 0.2s, transform 0.2s',
        background: 'rgba(4,8,18,0.84)',
        border: '1px solid rgba(250,248,240,0.07)',
        borderRadius: 4, padding: '5px 9px',
        backdropFilter: 'blur(10px)',
        minWidth: CARD_W,
      }}>
        <div style={{
          fontSize: 9, color: 'rgba(255,153,51,0.42)',
          letterSpacing: '0.14em', marginBottom: 3,
        }}>
          {String(index + 1).padStart(2, '0')} / {total}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: 'rgba(250,248,240,0.76)', lineHeight: 1.3,
        }}>
          {card.name}
        </div>
      </div>

      {/* "Read more" prompt — only when active and not yet flipped */}
      {isActive && !flip && (
        <button
          onClick={e => { e.stopPropagation(); setFlip(true); }}
          style={{
            marginTop: 11, width: CARD_W,
            background: '#FF9933', border: 'none', borderRadius: 6,
            padding: '10px 0',
            fontFamily: 'var(--font-bebas),sans-serif',
            fontSize: 15, letterSpacing: '0.1em', color: '#1a0800',
            cursor: 'pointer',
            boxShadow: '0 5px 22px rgba(255,153,51,0.38)',
            transition: 'background 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = '#e8872a';
            b.style.boxShadow = '0 7px 28px rgba(255,153,51,0.5)';
          }}
          onMouseLeave={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = '#FF9933';
            b.style.boxShadow = '0 5px 22px rgba(255,153,51,0.38)';
          }}
        >
          Read More →
        </button>
      )}
    </div>
  );
}

// ── End-of-corridor CTA ───────────────────────────────────────
function EndCTA({ zPos, onHost, onJoin }: { zPos: number; onHost: () => void; onJoin: () => void }) {
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '50%',
      transform: `translateX(-50%) translateY(-50%) translateZ(${zPos}px)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26,
      textAlign: 'center',
    }}>
      {/* Dramatic spotlight above CTA */}
      <div style={{
        position: 'absolute', bottom: '100%', left: '50%',
        transform: 'translateX(-50%)',
        width: 500, height: 300,
        background: 'radial-gradient(ellipse at 50% 100%, rgba(255,153,51,0.28) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* "YOUR TURN" card */}
      <div style={{
        width: CARD_W * 1.55,
        background: 'linear-gradient(160deg,#1c3f72 0%,#0d1f45 100%)',
        border: '2px solid rgba(255,153,51,0.55)',
        borderRadius: 12, padding: '38px 30px',
        boxShadow: `
          0 0 80px rgba(255,153,51,0.22),
          0 0 0 4px rgba(0,0,0,0.5),
          0 36px 80px rgba(0,0,0,0.8)
        `,
      }}>
        <div style={{
          fontFamily: 'var(--font-bebas),sans-serif',
          fontSize: 56, color: '#fff', lineHeight: 1,
          textShadow: '0 0 48px rgba(255,153,51,0.35)',
          marginBottom: 10,
        }}>
          YOUR TURN
        </div>
        <div style={{
          fontSize: 12, color: 'rgba(250,248,240,0.42)',
          letterSpacing: '0.08em', lineHeight: 1.65,
        }}>
          You&apos;ve seen the schemes.<br />Now pick one and defend it.
        </div>
      </div>

      {/* CTA buttons */}
      <div style={{ display: 'flex', gap: 14 }}>
        <button
          onClick={onHost}
          style={{
            background: '#FF9933', border: 'none', borderRadius: 8,
            padding: '13px 30px',
            fontFamily: 'var(--font-bebas),sans-serif',
            fontSize: 19, letterSpacing: '0.08em', color: '#1a0800',
            cursor: 'pointer',
            boxShadow: '0 6px 26px rgba(255,153,51,0.42)',
            transition: 'background 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#e8872a'; b.style.boxShadow = '0 8px 32px rgba(255,153,51,0.55)'; }}
          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#FF9933'; b.style.boxShadow = '0 6px 26px rgba(255,153,51,0.42)'; }}
        >
          Host a Game
        </button>
        <button
          onClick={onJoin}
          style={{
            background: 'transparent',
            border: '1.5px solid rgba(255,153,51,0.65)', borderRadius: 8,
            padding: '13px 30px',
            fontFamily: 'var(--font-bebas),sans-serif',
            fontSize: 19, letterSpacing: '0.08em', color: '#FF9933',
            cursor: 'pointer',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#FF9933'; b.style.color = '#fff'; }}
          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'rgba(255,153,51,0.65)'; b.style.color = '#FF9933'; }}
        >
          Join a Game
        </button>
      </div>
    </div>
  );
}
