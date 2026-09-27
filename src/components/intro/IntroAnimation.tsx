'use client';
/* VIKAS 75 — editorial card-game intro. Deals the real scheme cards into a fan, collects
   them into the pixel-skyline wordmark, and resolves to the brand mark under a tricolour
   rule. Cream paper · navy ink · tricolour.

   Aspect-ratio neutral: nothing here is a fixed 1920×1080 stage any more. `makeLayout()`
   derives every rectangle from the live viewport, so a portrait phone gets a taller,
   narrower composition (wordmark at 90% of the width, a tighter fan) and a laptop or a
   projector gets the wide one, with no letterboxing on either. The timeline is unchanged.

   Variants: 'full' plays the whole 10.4 s film (the first visit on a device, on the landing
   and on the QR join path alike). 'sting' plays only the logo resolve and the tricolour
   (about 1.2 s) for return visits to the landing. Tap anywhere, Skip, PLAY NOW, or
   Space / Enter / Escape dismisses it; reduced-motion skips it outright. */
import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react';

/* ── seen-memory ─────────────────────────────────────────────── */
export const INTRO_SEEN_KEY = 'vikas75_intro_seen';
export type IntroVariant = 'full' | 'sting';
export function hasSeenIntro(): boolean {
  try { return localStorage.getItem(INTRO_SEEN_KEY) === '1'; } catch { return false; }
}
export function markIntroSeen() {
  try { localStorage.setItem(INTRO_SEEN_KEY, '1'); } catch { /* storage blocked */ }
}

/* ── tiny engine ─────────────────────────────────────────────── */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const E = {
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inCubic: (t: number) => t * t * t,
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: (t: number) => { const c1 = 1.34, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};
function seg(time: number, s: number, e: number, ease: (t: number) => number = E.outCubic) {
  if (time <= s) return 0;
  if (time >= e) return 1;
  return ease((time - s) / (e - s));
}
function mulberry(seed: number) { return function () { let t = (seed += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ── palette ─────────────────────────────────────────────────── */
const CREAM = '#f6efd8', CREAM_HI = '#fdf8e8', INK = '#173458';
const SAFFRON = '#ee7d23', GREEN = '#1fa24a';
const PIXEL_FONT = "var(--font-pixel), 'Press Start 2P', ui-monospace, monospace";
const ATTRIBUTION_ONE = 'AN INITIATIVE OF THE OFFICE OF SHRI SUJEET KUMAR';
const ATTRIBUTION_TWO = ['AN INITIATIVE OF', 'THE OFFICE OF SHRI SUJEET KUMAR'];

/* ── timeline ────────────────────────────────────────────────── */
const DURATION = 10.4;        // full film
const STING_START = 4.2;      // return-visit sting: logo resolve + tricolour only
const STING_END = 5.4;

/* ── source geometry (cropped logo source coords) ────────────── */
const SRC_W = 1600;
const LCUTS = [0, 246, 347, 609, 844, 1083, 1321, 1526];   // per-letter slices of the mid band
const CARD_RATIO = 311 / 232;
const HAND_ANGLES = [-39, -26, -13, 0, 13, 26, 39];
const HAND_SRC = [
  '/intro/card-skill.webp', '/intro/card-swachh.webp', '/intro/card-adarshgram.webp', '/intro/card-bank.webp',
  '/intro/card-jandhan.webp', '/intro/card-indradhanush.webp', '/intro/card-makeinindia.webp',
];
const ARW_PTS = '36,0 72,64 47,64 47,247 24,247 24,64 0,64';

interface Rect { left: number; top: number; w: number; h: number }
interface LetterRect extends Rect { cx: number; cy: number }
interface Layout {
  W: number; H: number; portrait: boolean;
  u: number;                 // unit scale for strokes, shadows and type (1 at a 1080-short-side stage)
  cx: number;
  scale: number;             // source-px → screen-px for the logo artwork
  top: Rect; mid: Rect; bottom: Rect;
  colL: number; colW: number;
  letters: LetterRect[];
  cardW: number; cardH: number;
  radius: number; pivotY: number; deckY: number;
  arrow: Rect;
}

/* Everything on stage is derived from the viewport. Landscape reproduces the original
   1920×1080 composition exactly; portrait re-proportions it around a 90%-wide wordmark. */
function makeLayout(W: number, H: number): Layout {
  const portrait = H > W;
  const u = clamp(Math.min(W, H) / 1080, 0.3, 1.6);
  const cx = W / 2;
  const logoW = portrait ? W * 0.9 : Math.min(W * 0.6146, H * 1.093);
  const scale = logoW / SRC_W;
  const logoLeft = cx - (43 + 727.5) * scale;
  const blockH = 582 * scale;
  const logoTop = portrait ? H * 0.42 - blockH / 2 : H * 0.2778;
  const rectFor = (c: { x: number; y: number; w: number; h: number }): Rect => ({
    left: logoLeft + c.x * scale, top: logoTop + c.y * scale, w: c.w * scale, h: c.h * scale,
  });
  const mid = rectFor({ x: 43, y: 138, w: 1526, h: 347 });
  const colL = mid.left, colW = mid.w;
  const top: Rect = { left: colL, top: logoTop + 48 * scale, w: colW, h: colW * 57 / 1080 };
  const bottom: Rect = { left: colL, top: logoTop + 533 * scale, w: colW, h: colW * 97 / 1401 };
  const letters: LetterRect[] = LCUTS.slice(0, -1).map((x0, i) => {
    const x1 = LCUTS[i + 1];
    return {
      left: mid.left + x0 * scale, top: mid.top, w: (x1 - x0) * scale, h: mid.h,
      cx: mid.left + (x0 + x1) / 2 * scale, cy: mid.top + mid.h / 2,
    };
  });
  const cardW = Math.round(portrait ? W * 0.215 : 232 * (H / 1080));
  const cardH = Math.round(cardW * CARD_RATIO);
  const radius = 0.588 * W;                       // the fan spans ±37% of the width at ±39°
  const fanCy = portrait ? H * 0.45 : H * 0.454;  // the fan sits where the letters will land
  const pivotY = fanCy + radius;
  const deckY = H + cardH / 2 + 20 * u;           // cards deal in from below the stage
  const arrow: Rect = { left: mid.left + 692 * scale, top: mid.top + 68 * scale, w: 72 * scale, h: 247 * scale };
  return { W, H, portrait, u, cx, scale, top, mid, bottom, colL, colW, letters, cardW, cardH, radius, pivotY, deckY, arrow };
}

const TimeCtx = createContext(0);
const LayoutCtx = createContext<Layout | null>(null);
const useTime = () => useContext(TimeCtx);
const useLayout = () => useContext(LayoutCtx) as Layout;

/* ── the dealt hand (real scheme cards) ──────────────────────── */
function Card({ i, n, time }: { i: number; n: number; time: number }) {
  const L = useLayout();
  const ang = HAND_ANGLES[i];
  const r = ang * Math.PI / 180;
  const fan = { x: L.cx + L.radius * Math.sin(r), y: L.pivotY - L.radius * Math.cos(r), rot: ang };
  const deck = { x: L.cx + (i - (n - 1) / 2) * 1.5 * L.u, y: L.deckY, rot: (i - (n - 1) / 2) * 1.2 };
  const dealS = 0.5 + i * 0.09;
  const dealP = seg(time, dealS, dealS + 0.62, E.outCubic);
  const hold = seg(time, dealS, dealS + 0.66, E.outCubic);
  const moveStart = 2.45 + i * 0.16;
  const moveP = seg(time, moveStart, moveStart + 0.42, E.inOutCubic);
  const dissolve = seg(time, moveStart + 0.28, moveStart + 0.62, E.inOutSine);
  if (dissolve >= 1) return null;

  const Lr = L.letters[i];
  const fx = lerp(deck.x, fan.x, dealP);
  const fy = lerp(deck.y, fan.y, dealP);
  const fr = lerp(deck.rot, fan.rot, dealP);

  const x = lerp(fx, Lr.cx, moveP);
  const y = lerp(fy, Lr.cy, moveP);
  const rot = lerp(fr, 0, moveP);
  const sc = lerp(lerp(0.78, 1, hold), L.mid.h / L.cardH, moveP) * (1 + 0.06 * dissolve);
  const arc = Math.sin(moveP * Math.PI) * -36 * L.u;
  const lift = (12 + 22 * hold) * L.u;
  const radius = Math.max(6, 16 * L.u);

  return (
    <div style={{ position: 'absolute', left: x, top: y + arc, width: L.cardW, height: L.cardH, marginLeft: -L.cardW / 2, marginTop: -L.cardH / 2,
      transform: `rotate(${rot}deg) scale(${sc})`, opacity: 1 - dissolve, zIndex: 20 + i,
      borderRadius: radius, overflow: 'hidden', background: CREAM,
      boxShadow: `0 ${lift}px ${lift * 2.4}px rgba(23,52,88,0.30), 0 0 0 1px rgba(23,52,88,0.10)`,
      WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>
      <img src={HAND_SRC[i]} draggable={false} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
      <div style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 0 ${Math.max(2, 6 * L.u)}px rgba(255,255,255,0.55)`, borderRadius: radius, pointerEvents: 'none' }} />
    </div>
  );
}

/* a single VIKAS 75 glyph that materialises out of chunky pixels (canvas pixelate-in) */
const _imgCache: Record<string, HTMLImageElement> = {};
function _loadImg(src: string) { if (!_imgCache[src]) { const im = new Image(); im.src = src; _imgCache[src] = im; } return _imgCache[src]; }
function PixelLetter({ i, time }: { i: number; time: number }) {
  const L = useLayout();
  const moveStart = 2.45 + i * 0.16;
  const start = moveStart + 0.28;
  const p = seg(time, start, start + 0.62, E.outCubic);
  const sharp = seg(time, start + 0.30, start + 0.66, E.inOutSine);
  const fadeOut = seg(time, 4.35, 4.62, E.inCubic);
  const ref = useRef<HTMLCanvasElement>(null);
  const Lr = L.letters[i];
  const cw = Math.max(1, Math.round(Lr.w)), ch = Math.max(1, Math.round(Lr.h));
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const img = _loadImg(`/intro/letter_${i}.webp`);
    const draw = () => {
      ctx.clearRect(0, 0, cw, ch);
      if (!img.complete || !img.naturalWidth) return;
      const cell = Math.max(1, Math.round(1 + 12 * L.u * Math.pow(1 - p, 1.7)));
      const sw = Math.max(1, Math.round(cw / cell)), sh = Math.max(1, Math.round(ch / cell));
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, sw, sh);
      ctx.drawImage(cv, 0, 0, sw, sh, 0, 0, cw, ch);
    };
    if (img.complete && img.naturalWidth) draw(); else img.addEventListener('load', draw, { once: true });
  });
  if (p <= 0 || fadeOut >= 1) return null;
  const baseOp = Math.min(p * 2.4, 1) * (1 - fadeOut);
  return (
    <div style={{ position: 'absolute', left: Lr.left, top: Lr.top, width: Lr.w, height: Lr.h, opacity: baseOp, zIndex: 6, filter: `drop-shadow(0 ${6 * L.u}px ${14 * L.u}px rgba(23,52,88,0.16))` }}>
      <canvas ref={ref} width={cw} height={ch} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated', opacity: 1 - sharp }} />
      <img src={`/intro/letter_${i}.webp`} draggable={false} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', opacity: sharp }} />
    </div>
  );
}

function Letters({ time }: { time: number }) {
  if (time < 2.6) return null;
  return <>{[0, 1, 2, 3, 4, 5, 6].map(i => <PixelLetter key={i} i={i} time={time} />)}</>;
}

function Hand({ time }: { time: number }) {
  if (time > 4.0) return null;
  return <>{HAND_SRC.map((_, i) => <Card key={i} i={i} n={HAND_SRC.length} time={time} />)}</>;
}

/* ── background: cream paper, soft vignette, warm centre ──────── */
const GRAIN = (() => { const r = mulberry(11); const a: { fx: number; fy: number; s: number; o: number }[] = []; for (let i = 0; i < 90; i++) a.push({ fx: r(), fy: r(), s: 1 + Math.round(r()), o: 0.02 + r() * 0.04 }); return a; })();
function Background({ time }: { time: number }) {
  const L = useLayout();
  const fade = seg(time, 0, 0.5);
  const breathe = 0.5 + 0.5 * Math.sin(time * 1.1);
  const dot = Math.max(1, Math.round(L.u));
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fade, background: CREAM }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 60% at 50% 46%, ${CREAM_HI} 0%, rgba(253,248,232,0) 60%)`, opacity: 0.7 + 0.3 * breathe }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(0,0,0,0) 58%, rgba(23,52,88,0.10) 100%)' }} />
      {GRAIN.map((g, i) => <div key={i} style={{ position: 'absolute', left: g.fx * L.W, top: g.fy * L.H, width: g.s * dot, height: g.s * dot, background: INK, opacity: g.o }} />)}
    </div>
  );
}

/* ── tricolour rule (flag motif from the cards) ───────────────── */
function Tricolor({ time }: { time: number }) {
  const L = useLayout();
  const p = seg(time, 4.6, 5.2, E.outQuint);
  if (p <= 0) return null;
  const w = L.colW * p;
  const cy = L.bottom.top + L.bottom.h + 87 * L.scale;
  const th = Math.max(3, 9.5 * L.scale);
  const step = th + Math.max(1, th / 7);
  const stripe = (color: string, top: number) => (
    <div style={{ position: 'absolute', left: L.colL + (L.colW - w) / 2, top, width: w, height: th, background: color }} />
  );
  return (
    <div style={{ position: 'absolute', left: 0, top: cy, height: step * 3, opacity: clamp(p * 1.4, 0, 1) }}>
      {stripe(SAFFRON, 0)}
      {stripe('#ffffff', step)}
      {stripe(GREEN, step * 2)}
    </div>
  );
}

/* ── logo resolve: attribution (live pixel text), wordmark, tagline band ── */
function Logo({ time }: { time: number }) {
  const L = useLayout();
  const midIn = seg(time, 4.35, 4.62, E.outCubic);
  const topP = seg(time, 4.35, 4.85, E.outBack);
  const botP = seg(time, 4.2, 4.7, E.outExpo);
  const botY = (1 - botP) * 70 * L.u;
  const settle = seg(time, 4.55, 5.1);
  const glow = 0.22 + 0.5 * settle + 0.08 * Math.sin(time * 1.8);
  const drop = `drop-shadow(0 ${8 * L.u}px ${22 * L.u}px rgba(23,52,88,${0.16 + 0.1 * settle})) drop-shadow(0 0 ${(6 + 10 * settle) * L.u}px rgba(238,125,35,${0.12 * glow}))`;

  // The attribution is set live (not baked into an image) so the wording is always the binding
  // line. Two lines on narrow stages so it stays legible; one line otherwise.
  const twoLines = L.W < 640;
  const chars = twoLines ? ATTRIBUTION_TWO[1].length : ATTRIBUTION_ONE.length;
  const fontSize = Math.max(7, Math.min(L.top.h * (twoLines ? 0.5 : 0.72), L.top.w / (chars * 1.02)));

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', left: L.mid.left, top: L.mid.top, width: L.mid.w, height: L.mid.h, opacity: midIn, filter: drop }}>
        <img src="/intro/logo_mid_navy.webp" alt="" style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: L.top.left, top: L.top.top - (twoLines ? L.top.h * 0.6 : 0), width: L.top.w, height: L.top.h * (twoLines ? 1.6 : 1),
          opacity: topP, transform: `translateY(${(1 - topP) * -14 * L.u}px)`,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', textAlign: 'center',
          color: INK, fontFamily: PIXEL_FONT, fontSize, lineHeight: 1.3, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}
      >
        {twoLines ? <span>{ATTRIBUTION_TWO[0]}<br />{ATTRIBUTION_TWO[1]}</span> : ATTRIBUTION_ONE}
      </div>
      <div style={{ position: 'absolute', left: L.bottom.left, top: L.bottom.top, width: L.bottom.w, height: L.bottom.h, opacity: clamp(botP * 1.6, 0, 1), transform: `translateY(${botY}px)`, filter: drop }}>
        <img src="/intro/logo_bottom_navy.webp" alt="" style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    </div>
  );
}

/* ── soft wash to white as everything cascades off ────────────── */
function Cascade({ time }: { time: number }) {
  const p = seg(time, 6.6, 7.9, E.inOutCubic);
  if (p <= 0) return null;
  return <div style={{ position: 'absolute', inset: 0, zIndex: 30, pointerEvents: 'none', background: '#ffffff', opacity: p }} />;
}

/* ── the up-arrow knocked out of the A lifts straight off ────── */
function Arrow({ time }: { time: number }) {
  const L = useLayout();
  const launch = seg(time, 5.4, 7.1, E.inCubic);
  if (launch <= 0) return null;
  const { left, top, w, h } = L.arrow;
  const ty = -(top + h + 80 * L.u) * launch;
  const opOut = launch < 0.82 ? 1 : 1 - (launch - 0.82) / 0.18;
  const trailH = lerp(40, 460, launch) * L.u;
  const trailW = Math.max(8, 22 * L.u);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 31, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: L.cx, top: top + h, marginLeft: -trailW / 2, width: trailW, height: trailH, transform: `translateY(${ty}px)`, opacity: opOut * 0.9, borderRadius: trailW / 2, filter: 'blur(1px)',
        background: `linear-gradient(180deg, rgba(238,125,35,0) 0%, ${SAFFRON} 30%, #ffffff 55%, ${GREEN} 80%, rgba(31,162,74,0) 100%)` }} />
      <svg width={w} height={h} viewBox="0 0 72 247" style={{ position: 'absolute', left, top, transform: `translateY(${ty}px)`, opacity: opOut, filter: `drop-shadow(0 ${5 * L.u}px ${12 * L.u}px rgba(23,52,88,0.30))` }}>
        <polygon points={ARW_PTS} fill={CREAM} />
      </svg>
    </div>
  );
}

/* tricolour pixel-confetti burst at the apex */
const CONFETTI = (() => { const r = mulberry(33); const a: { ox: number; vx: number; vy: number; size: number; col: string; spin: number; delay: number }[] = []; const cols = [SAFFRON, GREEN, INK, '#ffffff']; for (let i = 0; i < 64; i++) { const ang = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.3; const spd = 380 + r() * 780; a.push({ ox: (r() - 0.5) * 360, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, size: 7 + Math.round(r() * 4) * 2, col: cols[Math.floor(r() * cols.length)], spin: (r() - 0.5) * 920, delay: r() * 0.12 }); } return a; })();
function Confetti({ time }: { time: number }) {
  const L = useLayout();
  const t0 = 6.55, g = 880 * L.u, OY = 80 * L.u;
  const base = time - t0; if (base <= 0 || time > 9.6) return null;
  return <>{CONFETTI.map((c, i) => { const lt = base - c.delay; if (lt <= 0) return null; const x = L.cx + c.ox * L.u + c.vx * L.u * lt * 0.72; const y = OY + c.vy * L.u * lt * 0.72 + 0.5 * g * lt * lt; const op = clamp(1 - (lt - 1.1) / 1.0, 0, 1); if (op <= 0) return null; const size = Math.max(3, c.size * L.u); return <div key={i} style={{ position: 'absolute', left: x, top: y, width: size, height: size, background: c.col, opacity: op, transform: `rotate(${c.spin * lt}deg)`, zIndex: 34, boxShadow: c.col === INK ? 'none' : '0 1px 2px rgba(23,52,88,0.18)' }} />; })}</>;
}

/* ── end-screen call to action (a real button) ───────────────── */
function Cta({ time, onPlay }: { time: number; onPlay: () => void }) {
  const L = useLayout();
  const p = seg(time, 7.95, 8.65, E.outBack);
  if (p <= 0) return null;
  const sc = 0.72 + 0.28 * Math.min(p, 1);
  const breathe = p >= 1 ? 1 + 0.022 * Math.sin((time - 8.65) * 3.2) : 1;
  const fontSize = Math.max(12, 21 * L.u);
  return (
    <div style={{ position: 'absolute', left: L.cx, top: L.H / 2, transform: `translate(-50%,-50%) scale(${sc * breathe})`, opacity: Math.min(p, 1), zIndex: 40 }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPlay(); }}
        aria-label="Play now"
        style={{ display: 'flex', alignItems: 'center', gap: Math.max(10, 16 * L.u), padding: `${Math.max(14, 20 * L.u)}px ${Math.max(24, 48 * L.u)}px`, background: INK, color: CREAM, border: 'none', cursor: 'pointer',
          fontFamily: PIXEL_FONT, fontSize, letterSpacing: 2, borderRadius: 8, boxShadow: '0 14px 32px rgba(23,52,88,0.4)' }}
      >
        <span>PLAY NOW</span>
        <span aria-hidden="true" style={{ width: 0, height: 0, borderLeft: `${Math.max(6, 10 * L.u)}px solid transparent`, borderRight: `${Math.max(6, 10 * L.u)}px solid transparent`, borderBottom: `${Math.max(10, 17 * L.u)}px solid ${SAFFRON}` }} />
      </button>
    </div>
  );
}

/* ── scene ───────────────────────────────────────────────────── */
function Scene({ variant, onPlay }: { variant: IntroVariant; onPlay: () => void }) {
  const time = useTime();
  const L = useLayout();
  const t0 = variant === 'sting' ? STING_START : 0;
  const end = variant === 'sting' ? STING_END : DURATION;
  const fadeIn = seg(time, t0, t0 + 0.3);
  const fadeOut = 1 - seg(time, end - 0.5, end, E.inCubic);
  const alpha = fadeIn * fadeOut;
  const land = (time > 3.15 && time < 3.42) ? Math.sin((time - 3.15) / 0.27 * Math.PI) * 5 * L.u : 0;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: alpha, background: CREAM }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${land}px)` }}>
        <Background time={time} />
        <Letters time={time} />
        <Hand time={time} />
        <Logo time={time} />
        <Tricolor time={time} />
        <Arrow time={time} />
        <Cascade time={time} />
        <Confetti time={time} />
        <Cta time={time} onPlay={onPlay} />
      </div>
    </div>
  );
}

const PRELOAD = [
  ...HAND_SRC,
  ...[0, 1, 2, 3, 4, 5, 6].map(i => `/intro/letter_${i}.webp`),
  '/intro/logo_mid_navy.webp', '/intro/logo_bottom_navy.webp',
];

/**
 * One-shot brand intro. Composes to the live viewport (no letterbox), runs the timeline once
 * via a wall-clock rAF, marks the device as having seen it, and calls onDone() at the end, on
 * tap / Skip / PLAY NOW / Space / Enter / Escape, or immediately under reduced motion.
 */
export default function IntroAnimation({ onDone, variant = 'full' }: { onDone: () => void; variant?: IntroVariant }) {
  const t0 = variant === 'sting' ? STING_START : 0;
  const end = variant === 'sting' ? STING_END : DURATION;
  const [time, setTime] = useState(t0);
  const [size, setSize] = useState({ W: 0, H: 0 });
  const [exiting, setExiting] = useState(false);
  const raf = useRef(0);
  const doneRef = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layout = useMemo(() => (size.W > 0 && size.H > 0 ? makeLayout(size.W, size.H) : null), [size]);

  // Fade the overlay out for a smooth handoff instead of an instant cut, then unmount via onDone.
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    markIntroSeen();
    if (raf.current) cancelAnimationFrame(raf.current);
    setExiting(true);
    exitTimer.current = setTimeout(onDone, 380);
  }, [onDone]);

  useEffect(() => () => { if (exitTimer.current) clearTimeout(exitTimer.current); }, []);

  // Respect reduced-motion: skip straight to the app with no animation or fade.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      doneRef.current = true;
      markIntroSeen();
      onDone();
    }
  }, [onDone]);

  // Warm the cache for every frame's artwork. Fire-and-forget: the clock never waits on a load.
  useEffect(() => { PRELOAD.forEach(s => { const im = new Image(); im.src = s; }); }, []);

  // The stage is the viewport itself; recompute the composition on resize / rotation.
  useEffect(() => {
    const fit = () => setSize({ W: window.innerWidth, H: window.innerHeight });
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // rAF clock driven by elapsed wall-clock time (never stalls, never fast-forwards a backgrounded gap).
  useEffect(() => {
    const start = performance.now();
    const step = (ts: number) => {
      const t = Math.min(t0 + (ts - start) / 1000, end);
      setTime(t);
      if (t >= end) { finish(); return; }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [finish, t0, end]);

  // Keyboard skip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter' || k === ' ' || k === 'Escape' || k === 'Enter') { e.preventDefault(); finish(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  const sting = variant === 'sting';
  return (
    <div
      onClick={finish}
      role="region"
      aria-label={sting ? 'Vikas 75' : 'Vikas 75 intro animation. Tap anywhere to skip.'}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#08070f', overflow: 'hidden', cursor: 'pointer',
        opacity: exiting ? 0 : 1, transition: 'opacity 0.38s ease' }}
    >
      {layout && (
        <LayoutCtx.Provider value={layout}>
          <TimeCtx.Provider value={time}><Scene variant={variant} onPlay={finish} /></TimeCtx.Provider>
        </LayoutCtx.Provider>
      )}
      {/* The printed hint only where it has room beside the Skip pill; narrow stages keep it in the region label. */}
      {!sting && size.W >= 640 && (
        <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 'max(24px, env(safe-area-inset-bottom))', textAlign: 'center', pointerEvents: 'none',
          fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(23,52,88,0.55)' }}>
          Tap anywhere to skip
        </div>
      )}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); finish(); }}
        style={{ position: 'absolute', bottom: 'max(16px, env(safe-area-inset-bottom))', right: 16, zIndex: 10000,
          minHeight: 44, padding: '0 18px', borderRadius: 999, border: '1px solid rgba(23,52,88,0.25)',
          background: 'rgba(253,248,232,0.85)', color: INK, fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      >
        {sting ? 'Skip' : 'Skip intro'} ▸
      </button>
    </div>
  );
}
