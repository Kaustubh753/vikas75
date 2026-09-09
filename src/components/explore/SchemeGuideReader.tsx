'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSchemeCardImage } from '@/lib/cards';
import { schemeDetailImage } from '@/lib/scheme-details';

export interface ReaderScheme {
  id: string;
  name: string;
  hi: string;
  desc: string;
}

interface Props {
  /** Only schemes that have a guide — the reader traverses this list. */
  schemes: ReaderScheme[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  /** The tapped deck tile's rect, when the reader was entered by tapping a card. */
  flightFrom?: DOMRect | null;
}

/* The scheme guide reader: the office's one-page guide for a scheme, with the collectible
 * card the reader holds shown beside it, on a designed ground.
 *
 * Built from the Claude Design handoff (`Scheme Guide Reader`). Four things in it are load
 * bearing — the screen reads as a different, worse thing without them:
 *
 * 1. THE PAGE FITS AT REST. The guides are 921×1650, far taller than any screen, so the
 *    height is computed from the viewport and the width follows from the aspect ratio.
 *    Every intermediate passes a finite-and-positive guard: a NaN silently drops the CSS
 *    declaration and the page collapses to zero width.
 *
 * 2. ZOOM IS A REAL SCALE, NOT A REFLOW. The page keeps its fitted width and takes a
 *    `transform: scale(z)`, with a wrapper sized to the scaled box so the scroll extents are
 *    right. The target is the asset's OWN 921px — never derived from the container. On a
 *    phone the fitted page is height-limited and already nearly spans the screen, so a
 *    "fill the container" zoom works out at about 1.1x and leaves the text exactly as small
 *    as it was, which is not a zoom at all. Three CSS traps live here, all of which present
 *    as "the zoom does nothing" or "it opens hard against the left edge": the page wrapper
 *    needs `flexShrink: 0` or the browser squeezes it back to the container and there is no
 *    scroll range whatsoever; the scroller must be START-aligned when zoomed, because
 *    centred flex alignment only ever exposes the overflow past the END of a child and the
 *    left half becomes unreachable; and the wrapper's width must not transition, or the
 *    centring write clamps to whatever range happens to exist at that instant.
 *
 * 3. TRAVERSAL IS ASYMMETRIC — "deal off the stack". Forward, the top card and its page are
 *    dealt up and out of frame and the next settles from underneath. Backward, nothing is
 *    dealt: the card that left returns along the path it took and lands on top, covering a
 *    page that does not move. Nothing fades, and whichever object is moving is the one in
 *    front. Symmetrise it and it reads as a crossfade.
 *
 * 4. THE RIBBON HOLDS STILL. It is the room, not the content, so nothing about a traverse
 *    is keyed to it.
 */

// ── Tokens ────────────────────────────────────────────────────
const INK = '#08070f';
const PAPER = '#faf8f0';
const SAFFRON = '#FF9933';
const GREEN = '#138808';
const GOLD = '#FFD700';

// Four curves, each with one job.
const ENTER = 'cubic-bezier(.16,1,.3,1)';   // arriving
const MOVE = 'cubic-bezier(.4,0,.2,1)';     // the deal, the title lead
const FLY = 'cubic-bezier(.34,.78,.06,1)';  // the flight's X + scale
const ARC = 'cubic-bezier(.5,0,.18,1)';     // the flight's Y

const PAGE_W = 921;
const PAGE_H = 1650;
const MOBILE_BP = 900;
const SHORT_BP = 720;

/** Guard every computed dimension: a NaN reaching a style value drops the declaration. */
const fin = (n: number, fallback: number) => (Number.isFinite(n) && n > 0 ? n : fallback);

export default function SchemeGuideReader({ schemes, index, onIndexChange, onClose, flightFrom }: Props) {
  const [zoom, setZoom] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);
  const [seq, setSeq] = useState(0);
  const [traversing, setTraversing] = useState(false);
  const [out, setOut] = useState<{ i: number; dir: 1 | -1 } | null>(null);
  const [edge, setEdge] = useState<1 | -1 | null>(null);
  const [vw, setVw] = useState(1280);
  const [vh, setVh] = useState(800);
  // Set once on mount: the rail's rise belongs to entering the reader, and must not be
  // re-added when a later flag flips back.
  const [entryRise, setEntryRise] = useState(!flightFrom);
  const [flyer, setFlyer] = useState<{ src: string; from: DOMRect; to: DOMRect | null } | null>(
    flightFrom ? { src: getSchemeCardImage(schemes[index]?.id ?? ''), from: flightFrom, to: null } : null,
  );

  const scroller = useRef<HTMLDivElement>(null);
  const cardTarget = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const flightId = useRef(0);

  const after = useCallback((ms: number, fn: () => void) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  }, []);

  useEffect(() => () => { timers.current.forEach(clearTimeout); timers.current = []; }, []);

  // Viewport. Read in an effect, not at render, so the server and first client render agree.
  useEffect(() => {
    const read = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);

  const phone = vw < MOBILE_BP;
  const tight = vh < SHORT_BP;
  const scheme = schemes[index];
  const src = scheme ? schemeDetailImage(scheme.id) : null;

  // ── Flight: land the clone on the rail card ───────────────────
  const endFlight = useCallback(() => {
    flightId.current += 1;
    setFlyer(null);
  }, []);

  useEffect(() => {
    if (!flightFrom) return;
    const id = ++flightId.current;
    // A timer, not an animation frame: frame callbacks are throttled or dropped in a hidden
    // tab, which would strand the clone mid-flight forever. getBoundingClientRect forces
    // layout, so the rect is valid as soon as React has committed.
    const measure = setTimeout(() => {
      if (id !== flightId.current) return;
      const t = cardTarget.current;
      if (!t) { setFlyer(null); return; }
      const to = t.getBoundingClientRect();
      setFlyer((f) => (f ? { ...f, to } : null));
    }, 24);
    // Hard deadline behind it, so no path can leave the clone on screen.
    const cleanup = setTimeout(() => { if (id === flightId.current) setFlyer(null); }, 1250);
    const rise = setTimeout(() => setEntryRise(false), 700);
    return () => { clearTimeout(measure); clearTimeout(cleanup); clearTimeout(rise); };
  }, [flightFrom]);

  // ── Traverse ──────────────────────────────────────────────────
  const go = useCallback((d: 1 | -1) => {
    const next = index + d;
    if (next < 0 || next >= schemes.length) {
      setEdge(d);
      after(420, () => setEdge(null));
      return;
    }
    endFlight();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setZoom(false);
    setDir(d);
    setSeq((s) => s + 1);
    setOut({ i: index, dir: d });
    setTraversing(true);
    onIndexChange(next);
    // Backward the returning card lands on top, so the page it covers has to stay mounted
    // for the whole return rather than being pulled at the usual exit mark.
    after(d < 0 ? 1080 : 520, () => setOut(null));
    after(1200, () => setTraversing(false));
  }, [index, schemes.length, onIndexChange, endFlight, after]);

  // ── Zoom ──────────────────────────────────────────────────────
  const toggleZoom = useCallback((on: boolean) => {
    endFlight();
    setZoom(on);
  }, [endFlight]);

  // ── Keyboard ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (k === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); toggleZoom(!zoom); }
      else if (k === 'Escape' || k === 'Backspace') {
        // Capture phase: this sits above the deck, which also closes on Escape. Zoomed, the
        // first Escape returns to fit and only the second leaves.
        e.preventDefault();
        e.stopPropagation();
        if (zoom) toggleZoom(false); else onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [go, toggleZoom, zoom, onClose]);

  useEffect(() => { closeRef.current?.focus(); }, []);

  // Decode the neighbours, not the whole deck: each guide is ~257 KB, so preloading all 74
  // (as the 3-scheme prototype did) would pull ~19 MB on mount. Without any preload a
  // traverse swaps in an undecoded image and the page flashes white.
  useEffect(() => {
    for (const i of [index - 1, index + 1]) {
      const s = schemes[i];
      if (!s) continue;
      const g = schemeDetailImage(s.id);
      if (g) { const im = new Image(); im.src = g; }
      const c = new Image(); c.src = getSchemeCardImage(s.id);
    }
  }, [index, schemes]);

  // ── Sizing ────────────────────────────────────────────────────
  const geo = useMemo(() => {
    // Vertical space the page must leave for everything else. Larger on a phone than the
    // prototype's 250 because the rail is hidden there, so the heading and the disclaimer
    // that live in it move into the column above and below the page.
    const chromeY = phone ? 330 : tight ? 150 : 190;
    const fitH = fin(Math.max(240, vh - chromeY), 420);
    const railW = phone ? 0 : fin(Math.min(430, Math.max(272, vw * 0.29)), 272);
    const availW = Math.max(160, phone ? vw - 24 : vw - railW - 160);
    const fitW = fin(Math.min(availW, fitH * (PAGE_W / PAGE_H)), 234);
    const pageH = fin(fitW * (PAGE_H / PAGE_W), 420);
    // Zoom to the asset's OWN width, always — never past it (that would just be a blur), and
    // never short of it either. Deriving the target from the container instead, as a
    // "fill the well" zoom would, collapses on a phone: the fitted page is height-limited and
    // already nearly spans the screen, so the container width is ~1.1× the fitted width and
    // the text comes out the same size it already was. A zoom that doesn't make the text
    // bigger is not a zoom; the container pans instead.
    const z = zoom ? Math.max(1, PAGE_W / fitW) : 1;
    const cardW = phone ? 150 : Math.round(Math.min(250, Math.max(132, railW * 0.55), (fitH - 120) * 0.62));
    return { fitH, railW, fitW, pageH, z, cardW };
  }, [phone, tight, vh, vw, zoom]);

  // Centre the zoomed page horizontally, per the design's "scroll to top and centre on
  // entering zoom".
  useEffect(() => {
    const el = scroller.current;
    if (!el || !zoom) return;
    el.scrollTop = 0;
    el.scrollLeft = Math.max(0, (geo.fitW * geo.z - el.clientWidth) / 2);
  }, [zoom, geo.z, geo.fitW]);

  // ── Choreography ──────────────────────────────────────────────
  const alt = seq % 2 ? '2' : '';
  const dsuf = dir > 0 ? '-r' : '-l';
  const back = dir < 0;
  const inName = (back ? 'vk-deal-back' : 'vk-settle') + alt;
  const inZ = back ? 4 : 1;
  const outZ = back ? 1 : 4;
  const outScheme = out ? schemes[out.i] : null;
  const outSrc = outScheme ? schemeDetailImage(outScheme.id) : null;

  if (!scheme || !src) return null;

  const ribbonH = phone ? 96 : Math.round(Math.max(88, Math.min(176, vh * 0.19)));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${scheme.name} — scheme guide`}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: INK, overflow: 'hidden' }}
    >
      {/* ── The room ────────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, #0d1b35 0%, ${INK} 62%)` }} />
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.5,
        backgroundImage: 'radial-gradient(rgba(250,248,240,.09) 1px, transparent 1.2px)',
        backgroundSize: '24px 24px',
      }} />
      {/* Tricolour ribbon. It holds still through a traverse — nothing here is keyed to
          the content, which is what makes the deal read as movement against a fixed room. */}
      <div style={{
        position: 'absolute', left: -60, right: -60, top: phone ? '13%' : '43%',
        height: ribbonH, transform: `rotate(${phone ? -4 : -3}deg)`,
        boxShadow: '0 30px 70px rgba(0,0,0,.5)', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.9,
          background: `linear-gradient(180deg, ${SAFFRON} 0 33.3%, ${PAPER} 33.3% 66.6%, ${GREEN} 66.6% 100%)`,
        }} />
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.17,
          backgroundImage: 'repeating-linear-gradient(115deg, rgba(8,7,15,.9) 0 26px, rgba(8,7,15,0) 26px 80px)',
          animation: 'vk-ribbon 26s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(90deg, ${INK} 0%, transparent 16%, transparent 84%, ${INK} 100%)`,
        }} />
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(80% 70% at 50% 50%, rgba(8,7,15,.62), rgba(8,7,15,.88))',
      }} />
      {!phone && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%', pointerEvents: 'none' }}>
          {[0, 1, 2, 3].map((n) => (
            <span key={n} style={{
              position: 'absolute', left: `${16 + n * 5}%`, bottom: 0, width: 3, height: 3,
              borderRadius: '50%', background: GOLD,
              animation: `vk-mote ${13 + n * 2.5}s linear infinite ${n * 3.1}s`,
            }} />
          ))}
        </div>
      )}

      {/* ── Stage ───────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: phone ? 'column' : 'row', alignItems: 'center',
        gap: phone || zoom ? 0 : '3.25rem',
        padding: phone ? '5.5rem .75rem 7rem' : zoom ? '4.5rem 1.5rem 4.25rem' : '4.5rem 4.25rem 4.25rem',
        boxSizing: 'border-box',
      }}>

        {/* Rail. `overflow` must stay visible — the card inside is rotated −3° and clipping
            the rail slices its corners off. */}
        {!phone && (
          <div style={{
            width: zoom ? 0 : geo.railW, flex: 'none', display: 'flex', flexDirection: 'column',
            justifyContent: 'center', gap: tight ? '1rem' : '1.6rem',
            maxHeight: '100%', minHeight: 0, overflow: 'visible',
            opacity: zoom ? 0 : 1, visibility: zoom ? 'hidden' : 'visible',
            pointerEvents: zoom ? 'none' : 'auto',
            transition: `width .46s ${ENTER}, opacity .3s ${ENTER}, visibility .3s ${ENTER}`,
            animation: entryRise && !zoom ? `vk-rise .55s ${ENTER} both .1s` : undefined,
          }}>
            {/* Reserved min-height so a one-line name doesn't shift the card between schemes. */}
            <div style={{
              minHeight: tight ? 108 : 132,
              animation: traversing ? `vk-rail${dsuf}${alt} .6s ${MOVE} both` : undefined,
            }}>
              <p style={{ margin: 0, fontSize: '.75rem', color: 'rgba(250,248,240,.62)' }}>
                Card {String(schemeNumber(scheme.id)).padStart(2, '0')} of 75
              </p>
              <h1 style={{
                margin: '.35rem 0 0', fontFamily: 'var(--font-bebas),sans-serif',
                fontSize: 'clamp(1.9rem, 3.2vw, 3.25rem)', lineHeight: .93,
                letterSpacing: '.015em', textWrap: 'balance', color: PAPER,
              }}>
                {scheme.name}
              </h1>
              <p style={{
                margin: '.44rem 0 0', fontFamily: 'var(--font-devanagari),sans-serif', fontWeight: 500,
                fontSize: 'clamp(1rem, 1.5vw, 1.44rem)', lineHeight: 1.45, color: SAFFRON,
              }}>
                {scheme.hi}
              </p>
            </div>

            {/* The collectible. The resting float lives on the inner element and the deal on
                the outer one: two animations writing `transform` on one node means the later
                wins and the deal is silently discarded. */}
            <div style={{ position: 'relative', display: 'flex', minHeight: 0, flex: '0 1 auto', padding: '12px 14px', margin: '-12px -14px' }}>
              <div style={{
                display: 'flex', minHeight: 0, zIndex: inZ,
                animation: traversing
                  ? `${inName} ${back ? '.82s' : '.62s'} ${ENTER} both ${back ? '.1s' : '.09s'}`
                  : undefined,
              }}>
                <div ref={cardTarget} style={{
                  position: 'relative', width: geo.cardW, aspectRatio: '412 / 554', maxHeight: '100%',
                  flex: '0 1 auto', borderRadius: 12, overflow: 'hidden',
                  boxShadow: '0 0 0 1px rgba(250,248,240,.18), 0 30px 60px rgba(0,0,0,.65)',
                  // The tilt is part of the composition, not the motion — the rail even
                  // reserves padding for it. Leaving it only inside the float keyframes means
                  // prefers-reduced-motion (which collapses the animation) stands the card
                  // bolt upright, so it is a static transform too. The keyframes carry the
                  // same −3°, so nothing fights while the float runs.
                  transform: 'rotate(-3deg)',
                  // Delayed when a flight is landing, so the card doesn't twitch on the frame
                  // it comes to rest.
                  animation: `vk-float 11s ease-in-out infinite${flyer ? ' .85s' : ''}`,
                  visibility: flyer ? 'hidden' : 'visible',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- static CDN asset; the optimiser round-trip is the thing this screen removed */}
                  <img src={getSchemeCardImage(scheme.id)} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute', top: '-20%', bottom: '-20%', width: 70,
                    background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.3), rgba(255,255,255,0))',
                    animation: `vk-shine 9s ${MOVE} infinite 2.4s`, pointerEvents: 'none',
                  }} />
                </div>
              </div>
              {/* The outgoing collectible. Forward it is dealt off; backward it is not dealt
                  anywhere — it stays on the stack and is covered. */}
              {outScheme && (
                <div style={{
                  position: 'absolute', left: 14, top: 12, width: geo.cardW, aspectRatio: '412 / 554',
                  borderRadius: 12, overflow: 'hidden', pointerEvents: 'none', zIndex: outZ,
                  boxShadow: '0 0 0 1px rgba(250,248,240,.18), 0 30px 60px rgba(0,0,0,.65)',
                  transform: 'rotate(-3deg)',
                  animation: back ? undefined : `vk-deal-out-card .74s ${MOVE} both .09s`,
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
                  <img src={getSchemeCardImage(outScheme.id)} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>

            {!tight && (
              <p style={{ margin: '.7rem 0 0', fontSize: '.78rem', lineHeight: 1.6, color: 'rgba(250,248,240,.85)', maxWidth: '18rem' }}>
                {scheme.desc}
              </p>
            )}
            <p style={{ margin: 0, fontSize: '.72rem', lineHeight: 1.7, color: 'rgba(250,248,240,.72)', maxWidth: '24rem' }}>
              Details are for general awareness. Always confirm on the official portal linked in the guide.
            </p>
          </div>
        )}

        {/* Well. Opacity only, never a transform: a translate here makes this a transformed
            ancestor of the page's own enter keyframe, and the page animates from a
            contaminated origin. */}
        <div style={{
          flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '.9rem',
          animation: `vk-fade ${flyer ? '.64s' : '.6s'} ${ENTER} both ${flyer ? '.26s' : '.22s'}`,
        }}>
          {/* The scheme's name, on a phone. The rail carries it on desktop and is hidden
              below 900px, which would otherwise leave the reader with no heading at all —
              and the guide pages are English-only, so the Devanagari name has nowhere else
              to appear. Hidden while zoomed: nothing may cover the page while it is read. */}
          {phone && !zoom && (
            <div style={{
              width: '100%', maxWidth: geo.fitW, textAlign: 'left',
              animation: traversing ? `vk-rail${dsuf}${alt} .6s ${MOVE} both` : undefined,
            }}>
              <p style={{ margin: 0, fontSize: '.68rem', color: 'rgba(250,248,240,.62)' }}>
                Card {String(schemeNumber(scheme.id)).padStart(2, '0')} of 75
              </p>
              <h1 style={{
                margin: '.1rem 0 0', fontFamily: 'var(--font-bebas),sans-serif',
                fontSize: '1.5rem', lineHeight: 1, letterSpacing: '.015em',
                textWrap: 'balance', color: PAPER,
              }}>
                {scheme.name}
              </h1>
              <p style={{
                margin: '.15rem 0 0', fontFamily: 'var(--font-devanagari),sans-serif', fontWeight: 500,
                fontSize: '.85rem', lineHeight: 1.35, color: SAFFRON,
              }}>
                {scheme.hi}
              </p>
            </div>
          )}
          <div
            ref={scroller}
            style={{
              position: 'relative', display: 'flex', alignItems: 'flex-start',
              // Centred flex alignment makes the LEFT half of an overflowing child
              // unreachable — the browser only ever exposes the overflow past the end — so a
              // zoomed page could never be panned back to its left edge. Zoomed, the page is
              // start-aligned and centred by scroll offset instead, which keeps the whole
              // width reachable.
              justifyContent: zoom ? 'flex-start' : 'center',
              maxWidth: '100%', overflow: zoom ? 'auto' : 'visible',
              height: zoom ? geo.fitH : 'auto', width: zoom ? '100%' : 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* The wrapper is a pure spacer that gives the scaled page correct scroll extents,
                so it resizes INSTANTLY while only the page's own transform transitions. When
                it animated its width too, the scroll range did not exist yet at the moment
                the centring ran and the browser clamped the offset to zero — the zoomed page
                opened hard against its left edge instead of centred. */}
            <div style={{
              position: 'relative', width: geo.fitW * geo.z, height: geo.pageH * geo.z,
              // flexShrink: 0 is load bearing. This is a flex item, so at its default
              // shrink factor the browser squeezes it back to the container's width and the
              // zoomed page has no scroll range at all — the page then cannot be panned and
              // the centring silently clamps to the left edge.
              flexShrink: 0,
            }}>
              {/* The incoming page gets its OWN wrapper, a sibling of the outgoing one —
                  share a wrapper and the departing page inherits the arrival animation. */}
              <div style={{
                position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: inZ,
                animation: traversing
                  ? `${inName} ${back ? '.82s' : '.62s'} ${ENTER} both ${back ? '.18s' : '.26s'}`
                  : undefined,
              }}>
                <div
                  onClick={() => toggleZoom(!zoom)}
                  style={{
                    position: 'absolute', left: 0, top: 0, width: geo.fitW,
                    transform: `scale(${geo.z})`, transformOrigin: 'top left',
                    borderRadius: 8, overflow: 'hidden', background: PAPER, display: 'flex',
                    transition: `transform .46s ${ENTER}`,
                    animation: 'vk-rim 7s ease-in-out infinite .65s',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- these files are already sized and compressed exactly as they should be served; next/image added an optimisation round-trip that dominated the wait and re-encoded an already-lossy source into a worse picture */}
                  <img src={src} alt={`${scheme.name}: what the scheme is, its key features, and how to apply`}
                       style={{ display: 'block', height: 'auto', width: '100%', cursor: zoom ? 'zoom-out' : 'zoom-in' }} />
                  {!zoom && (
                    <div style={{
                      position: 'absolute', top: '-20%', bottom: '-20%', width: phone ? 66 : 110,
                      background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.3), rgba(255,255,255,0))',
                      animation: `vk-shine 9s ${MOVE} infinite 2.4s`, pointerEvents: 'none',
                    }} />
                  )}
                </div>
              </div>

              {/* The page being left behind — without it a traverse is a jump cut. */}
              {outScheme && outSrc && (
                <div style={{
                  position: 'absolute', left: 0, top: 0, width: geo.fitW,
                  borderRadius: 8, overflow: 'hidden', background: PAPER, display: 'flex',
                  pointerEvents: 'none', zIndex: outZ, boxShadow: '0 30px 62px rgba(0,0,0,.6)',
                  animation: back ? undefined : `vk-deal-out .74s ${MOVE} both .18s`,
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
                  <img src={outSrc} alt="" style={{ display: 'block', height: 'auto', width: '100%' }} />
                </div>
              )}

              {/* Registration brackets. Out of flow entirely when zoomed — at a negative
                  offset they otherwise widen the scroll content and force a horizontal pan. */}
              {!zoom && (
                <>
                  <span style={{ position: 'absolute', left: -14, top: -14, width: phone ? 18 : 32, height: phone ? 18 : 32, borderLeft: `2px solid ${SAFFRON}`, borderTop: `2px solid ${SAFFRON}` }} />
                  <span style={{ position: 'absolute', right: -14, bottom: -14, width: phone ? 18 : 32, height: phone ? 18 : 32, borderRight: `2px solid ${GREEN}`, borderBottom: `2px solid ${GREEN}` }} />
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => toggleZoom(!zoom)}
            style={{
              display: 'flex', alignItems: 'center', gap: '.55rem', height: 40, padding: '0 1.25rem',
              borderRadius: 999, background: 'rgba(255,215,0,.1)', border: `1px solid rgba(255,215,0,.5)`,
              color: GOLD, fontSize: '.8rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-inter),sans-serif', animation: `vk-tap 3.6s ${ENTER} infinite`,
            }}
          >
            <span style={{ animation: 'vk-nudge-y 3.6s ease-in-out infinite' }}>{zoom ? '⤡' : '⤢'}</span>
            {zoom ? 'Zoomed — drag to read, Esc to fit' : phone ? 'Tap to read full size' : 'Click to read full size'}
          </button>

          {/* The disclaimer lives in the rail on desktop; on a phone it belongs here. */}
          {phone && !zoom && (
            <p style={{
              margin: 0, maxWidth: geo.fitW, fontSize: '.66rem', lineHeight: 1.55,
              color: 'rgba(250,248,240,.6)', textAlign: 'center',
            }}>
              Details are for general awareness. Always confirm on the official portal linked in the guide.
            </p>
          )}
        </div>
      </div>

      {/* ── Controls. 44px is the minimum hit target — keep it. ── */}
      <div style={{ position: 'absolute', right: '1.6rem', top: '1.6rem', display: 'flex', gap: '.6rem', zIndex: 6 }}>
        <Circle label="Previous scheme" onClick={() => go(-1)} disabled={index === 0}>‹</Circle>
        <Circle label="Next scheme" onClick={() => go(1)} disabled={index === schemes.length - 1}>›</Circle>
        <Circle label="Close scheme guide" onClick={onClose} ref={closeRef}>✕</Circle>
      </div>

      {!phone && (
        <div style={{
          position: 'absolute', right: '1.6rem', bottom: '1.1rem', zIndex: 6,
          padding: '.4rem .85rem', borderRadius: 999, background: 'rgba(8,7,15,.88)',
          border: '1px solid rgba(250,248,240,.16)', fontSize: '.72rem',
          color: 'rgba(250,248,240,.8)', whiteSpace: 'nowrap',
          fontFamily: 'var(--font-inter),sans-serif',
        }}>
          <strong style={{ color: GOLD, fontWeight: 600 }}>←</strong>{' '}
          <strong style={{ color: GOLD, fontWeight: 600 }}>→</strong> scheme
          {'  ·  '}
          <strong style={{ color: GOLD, fontWeight: 600 }}>Enter</strong> {zoom ? 'fit' : 'zoom'}
          {'  ·  '}
          <strong style={{ color: GOLD, fontWeight: 600 }}>Esc</strong> {zoom ? 'fit' : 'deck'}
        </div>
      )}

      {/* Edge flare — flashed when a traverse runs past either end of the deck. */}
      {([-1, 1] as const).map((side) => (
        <span key={side} style={{
          position: 'absolute', top: 0, bottom: 0, [side < 0 ? 'left' : 'right']: 0, width: 8,
          background: `linear-gradient(to ${side < 0 ? 'right' : 'left'}, rgba(255,215,0,.65), rgba(255,215,0,0))`,
          opacity: edge === side ? 1 : 0, transition: 'opacity .2s', zIndex: 5, pointerEvents: 'none',
        }} />
      ))}

      {/* The flight clone. X and scale on the outer box, Y and the −3° settle on the inner
          one, with two different curves: two curves on two axes read as an arc, one curve on
          both reads as a straight diagonal slide. */}
      {flyer && (
        <div style={{
          position: 'fixed', left: flyer.from.left, top: flyer.from.top,
          width: flyer.from.width, height: flyer.from.height,
          zIndex: 20, pointerEvents: 'none', transformOrigin: 'top left',
          willChange: 'transform', backfaceVisibility: 'hidden',
          transform: flyer.to
            ? `translateX(${flyer.to.left - flyer.from.left}px) scale(${flyer.to.width / flyer.from.width})`
            : undefined,
          transition: flyer.to ? `transform .76s ${FLY}` : undefined,
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden',
            willChange: 'transform', backfaceVisibility: 'hidden',
            boxShadow: '0 0 0 1px rgba(250,248,240,.18), 0 30px 60px rgba(0,0,0,.65)',
            transform: flyer.to
              ? `translateY(${(flyer.to.top - flyer.from.top) / (flyer.to.width / flyer.from.width)}px) rotate(-3deg)`
              : undefined,
            transition: flyer.to ? `transform .76s ${ARC}` : undefined,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
            <img src={flyer.src} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
      )}
    </div>
  );
}

/** "s073" → 73. The rail prints the card's place in the deck of 75. */
function schemeNumber(id: string): number {
  const n = parseInt(id.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function Circle({ children, label, onClick, disabled, ref }: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      aria-label={label}
      style={{
        width: 44, height: 44, borderRadius: '50%',
        border: '1px solid rgba(250,248,240,.3)', background: 'rgba(8,7,15,.7)',
        color: PAPER, fontSize: 18, lineHeight: 1,
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'opacity .2s',
      }}
    >
      {children}
    </button>
  );
}
