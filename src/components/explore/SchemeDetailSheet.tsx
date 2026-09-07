'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { schemeDetailImage } from '@/lib/scheme-details';

interface Props {
  schemeId: string;
  schemeName: string;
  /** Devanagari name — the infographics are English-only, so the header carries it. */
  schemeHi?: string;
  onClose: () => void;
}

/** The source pages' own pixel width — the zoomed view renders at exactly this. */
const NATURAL_W = 921;

const C = {
  saffron: '#FF9933',
  ink: 'rgba(4,8,18,0.94)',
  w14: 'rgba(255,255,255,0.14)',
  w40: 'rgba(255,255,255,0.4)',
};

/* The office's one-page guide for a scheme (what it is, key features, how to apply, official
 * link), opened by tapping a card in the deck.
 *
 * TWO THINGS THIS SCREEN GETS RIGHT, both learned the hard way:
 *
 * 1. It FITS. The source pages are 921×1650 — far taller than any phone — so rendering them at
 *    full width meant the reader landed on a fragment and had to scroll a page they had not
 *    seen yet. The default view contains the whole page in the viewport; tapping switches to
 *    full width for reading, which is where scrolling actually belongs. (Pinch-zoom still
 *    works in either state.)
 *
 * 2. It LOADS. These files are already sized and compressed exactly as they should be served,
 *    so they go out `unoptimized` — straight from the CDN as immutable static assets. Routing
 *    them through next/image added an on-demand optimisation round-trip per image that
 *    dominated the wait and produced a *worse* picture by re-encoding an already-lossy source.
 */
export default function SchemeDetailSheet({ schemeId, schemeName, schemeHi, onClose }: Props) {
  const src = schemeDetailImage(schemeId);
  const [loaded, setLoaded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    // Capture phase: this sheet sits above the card modal, which also closes on Escape — without
    // capturing, one keypress would dismiss both.
    window.addEventListener('keydown', handler, true);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', handler, true);
  }, [onClose]);

  const toggleZoom = useCallback(() => {
    setZoomed((z) => {
      // Returning to the fitted view, reset the scroll or the page reappears mid-way down.
      if (z && scrollRef.current) scrollRef.current.scrollTo({ top: 0, left: 0 });
      return !z;
    });
  }, []);

  if (!src) return null;

  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: C.ink, backdropFilter: 'blur(10px)',
        display: 'flex', flexDirection: 'column',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${schemeName} — full scheme guide`}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '10px 14px', borderBottom: `1px solid ${C.w14}`, flexShrink: 0,
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontFamily: 'var(--font-bebas),sans-serif', fontSize: 20, letterSpacing: '0.04em',
            color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {schemeName}
          </p>
          {schemeHi && (
            <p style={{
              fontFamily: 'var(--font-devanagari),sans-serif', fontSize: 12, fontWeight: 600,
              color: C.saffron, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {schemeHi}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={toggleZoom}
            aria-label={zoomed ? 'Fit the guide to the screen' : 'Zoom in to read the guide'}
            style={{
              height: 38, padding: '0 12px', borderRadius: 10,
              background: zoomed ? 'rgba(255,153,51,0.18)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${zoomed ? 'rgba(255,153,51,0.5)' : C.w14}`,
              color: zoomed ? C.saffron : '#fff', cursor: 'pointer',
              fontFamily: 'var(--font-inter),sans-serif', fontSize: 12, fontWeight: 600,
            }}
          >
            {zoomed ? 'Fit' : 'Zoom'}
          </button>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close scheme guide"
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(255,255,255,0.08)', border: `1px solid ${C.w14}`,
              color: '#fff', fontSize: 17, cursor: 'pointer', lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1, minHeight: 0,
          overflow: zoomed ? 'auto' : 'hidden',
          WebkitOverflowScrolling: 'touch',
          display: 'flex', alignItems: zoomed ? 'flex-start' : 'center', justifyContent: 'center',
          padding: zoomed ? 0 : 10,
        }}
      >
        <div
          onClick={toggleZoom}
          className={loaded ? undefined : 'skeleton-pulse'}
          style={{
            cursor: zoomed ? 'zoom-out' : 'zoom-in',
            // Fitted: bounded on BOTH axes so the whole page is on screen. Zoomed: the page's
            // own 921px width so the body text is actually readable — on a 390px phone that is
            // ~2.4×, and the container pans in both directions. Capping zoom at the viewport
            // width (as "100%" would) is not a zoom at all: the text stays too small to read,
            // which is the only reason to zoom.
            width: zoomed ? NATURAL_W : 'auto',
            maxWidth: zoomed ? 'none' : '100%',
            maxHeight: zoomed ? undefined : '100%',
            aspectRatio: '921 / 1650',
            background: loaded ? 'transparent' : 'rgba(255,255,255,0.06)',
            borderRadius: zoomed ? 0 : 10,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/* The placeholder is a background on this wrapper, never `display: none` on the
              image: a hidden <img> is never laid out, so with lazy loading it would never
              load and never reveal itself. */}
          <Image
            src={src}
            alt={`${schemeName}: what the scheme is, its key features, and how to apply`}
            width={921}
            height={1650}
            unoptimized
            priority
            onLoad={() => setLoaded(true)}
            style={{
              width: '100%', height: '100%', objectFit: 'contain',
              opacity: loaded ? 1 : 0, transition: 'opacity 0.2s ease-out',
            }}
          />
        </div>
      </div>

      <p style={{
        flexShrink: 0, fontFamily: 'var(--font-inter),sans-serif', fontSize: 10, lineHeight: 1.5,
        color: C.w40, textAlign: 'center', margin: 0,
        padding: '8px 16px calc(8px + env(safe-area-inset-bottom))',
        borderTop: `1px solid ${C.w14}`,
      }}>
        {zoomed ? 'Tap the page to fit it on screen' : 'Tap the page to zoom in and read'}
        {' · '}Always confirm details on the official portal linked in the guide.
      </p>
    </motion.div>
  );
}
