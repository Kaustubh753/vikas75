'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { schemeDetailImage } from '@/lib/scheme-details';

interface Props {
  schemeId: string;
  schemeName: string;
  onClose: () => void;
}

const C = {
  saffron: '#FF9933',
  ink: 'rgba(4,8,18,0.94)',
  w14: 'rgba(255,255,255,0.14)',
  w40: 'rgba(255,255,255,0.4)',
  w70: 'rgba(255,255,255,0.7)',
};

/* Full-page scheme infographic — the office's own one-pager for a scheme (what it is, key
 * features, how to apply, official link), shown over the Explore card modal.
 *
 * It is a tall portrait image, so this is a scroll container rather than a fitted panel: on a
 * phone the page is read top-to-bottom at full width, on a desktop it is centred with a
 * readable max width. `priority` is deliberately off — these are ~140 KB each and only ever
 * fetched when someone opens this sheet. */
export default function SchemeDetailSheet({ schemeId, schemeName, onClose }: Props) {
  const src = schemeDetailImage(schemeId);
  const [loaded, setLoaded] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    // Capture phase: this sheet sits above the card modal, which also closes on Escape — without
    // capturing, one keypress would dismiss both.
    window.addEventListener('keydown', handler, true);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', handler, true);
  }, [onClose]);

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
        padding: '14px 16px', borderBottom: `1px solid ${C.w14}`, flexShrink: 0,
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontFamily: 'var(--font-inter),sans-serif', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.24em', textTransform: 'uppercase', color: C.saffron, margin: 0,
          }}>
            Scheme guide
          </p>
          <p style={{
            fontFamily: 'var(--font-bebas),sans-serif', fontSize: 22, letterSpacing: '0.04em',
            color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {schemeName}
          </p>
        </div>
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close scheme guide"
          style={{
            width: 40, height: 40, flexShrink: 0, borderRadius: 10,
            background: 'rgba(255,255,255,0.08)', border: `1px solid ${C.w14}`,
            color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 12px 32px' }}>
        {/* The placeholder is a *background* on the wrapper, never `display: none` on the image:
            next/image lazy-loads through an intersection observer, so a hidden <img> never
            enters the viewport, never loads, and never fires onLoad — it would stay hidden
            forever. Fade it in over the skeleton instead. */}
        <div
          className={loaded ? undefined : 'skeleton-pulse'}
          style={{
            maxWidth: 820, margin: '0 auto', borderRadius: 12,
            background: loaded ? 'transparent' : 'rgba(255,255,255,0.06)',
            aspectRatio: loaded ? undefined : '921 / 1650',
          }}
        >
          <Image
            src={src}
            alt={`${schemeName}: what the scheme is, its key features, and how to apply`}
            width={921}
            height={1650}
            onLoad={() => setLoaded(true)}
            style={{
              width: '100%', height: 'auto', borderRadius: 12,
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.25s ease-out',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          />
        </div>
        <p style={{
          fontFamily: 'var(--font-inter),sans-serif', fontSize: 11, lineHeight: 1.6,
          color: C.w40, textAlign: 'center', margin: '16px auto 0', maxWidth: 560,
        }}>
          Scheme details are for general awareness. Always confirm eligibility and the current
          process on the official government portal linked in the guide.
        </p>
      </div>
    </motion.div>
  );
}
