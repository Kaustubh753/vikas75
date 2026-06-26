'use client';
/* VIKAS 75 — editorial card-game intro. Deals the real scheme cards into a fan, collects
   them, and resolves to the brand mark. Cream paper · navy ink · tricolor.
   Ported from the Claude Design handoff (game-logo-intro-animation) into a production
   one-shot splash: a real rAF clock plays the 1920×1080 timeline once, scaled to fit the
   viewport, then calls onDone(). Tap anywhere or "Skip" to dismiss; reduced-motion skips it. */
import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';

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
const TimeCtx = createContext(0);
const useTime = () => useContext(TimeCtx);
function mulberry(seed: number) { return function () { let t = (seed += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ── palette ─────────────────────────────────────────────────── */
const CREAM = '#f6efd8', CREAM_HI = '#fdf8e8', INK = '#173458';
const SAFFRON = '#ee7d23', GREEN = '#1fa24a';
const PSFONT = "'Press Start 2P', ui-monospace, monospace";

/* ── logo geometry (cropped-source coords → 1920×1080) ───────── */
const SRC_W = 1600, LOGO_W = 1180, SCALE = LOGO_W / SRC_W;     // 0.7375
const LOGO_TOP = 300;
const ARROW_X = 960;
const LOGO_LEFT = ARROW_X - (43 + 727.5) * SCALE;
const rectFor = (c: { x: number; y: number; w: number; h: number }) => ({ left: LOGO_LEFT + c.x * SCALE, top: LOGO_TOP + c.y * SCALE, w: c.w * SCALE, h: c.h * SCALE });
const BANDS = {
  top: rectFor({ x: 267, y: 48, w: 1080, h: 57 }),
  mid: rectFor({ x: 43, y: 138, w: 1526, h: 347 }),
  bottom: rectFor({ x: 107, y: 533, w: 1401, h: 97 }),
};
const COL_L = BANDS.mid.left, COL_W = BANDS.mid.w;
BANDS.top = { left: COL_L, top: BANDS.top.top, w: COL_W, h: COL_W * 57 / 1080 };
BANDS.bottom = { left: COL_L, top: BANDS.bottom.top, w: COL_W, h: COL_W * 97 / 1401 };

/* ── per-letter slots of VIKAS 75 (sliced from the mid band) ──── */
const LCUTS = [0, 246, 347, 609, 844, 1083, 1321, 1526];
function letterRect(i: number) {
  const x0 = LCUTS[i], x1 = LCUTS[i + 1];
  return {
    left: BANDS.mid.left + x0 * SCALE, top: BANDS.mid.top, w: (x1 - x0) * SCALE, h: BANDS.mid.h,
    cx: BANDS.mid.left + (x0 + x1) / 2 * SCALE, cy: BANDS.mid.top + BANDS.mid.h / 2,
  };
}

/* ── the dealt hand (real scheme cards) ──────────────────────── */
const CARD_W = 232, CARD_H = 311;
const PIVOT_X = 960, PIVOT_Y = 1620, RADIUS = 1130;
const HAND = [
  { src: '/intro/card-skill.png', ang: -39 },
  { src: '/intro/card-swachh.png', ang: -26 },
  { src: '/intro/card-adarshgram.png', ang: -13 },
  { src: '/intro/card-bank.png', ang: 0 },
  { src: '/intro/card-jandhan.png', ang: 13 },
  { src: '/intro/card-indradhanush.png', ang: 26 },
  { src: '/intro/card-makeinindia.png', ang: 39 },
];
const slot = (a: number) => { const r = a * Math.PI / 180; return { x: PIVOT_X + RADIUS * Math.sin(r), y: PIVOT_Y - RADIUS * Math.cos(r), rot: a }; };

function Card({ card, i, n, time }: { card: { src: string; ang: number }; i: number; n: number; time: number }) {
  const fan = slot(card.ang);
  const deck = { x: PIVOT_X + (i - (n - 1) / 2) * 1.5, y: 1230, rot: (i - (n - 1) / 2) * 1.2 };
  const dealS = 0.5 + i * 0.09;
  const dealP = seg(time, dealS, dealS + 0.62, E.outCubic);
  const hold = seg(time, dealS, dealS + 0.66, E.outCubic);
  const moveStart = 2.45 + i * 0.16;
  const moveP = seg(time, moveStart, moveStart + 0.42, E.inOutCubic);
  const dissolve = seg(time, moveStart + 0.28, moveStart + 0.62, E.inOutSine);
  if (dissolve >= 1) return null;

  const L = letterRect(i);
  const fx = lerp(deck.x, fan.x, dealP);
  const fy = lerp(deck.y, fan.y, dealP);
  const fr = lerp(deck.rot, fan.rot, dealP);

  const x = lerp(fx, L.cx, moveP);
  const y = lerp(fy, L.cy, moveP);
  const rot = lerp(fr, 0, moveP);
  const sc = lerp(lerp(0.78, 1, hold), BANDS.mid.h / CARD_H, moveP) * (1 + 0.06 * dissolve);
  const arc = Math.sin(moveP * Math.PI) * -36;
  const lift = 12 + 22 * hold;

  return (
    <div style={{ position: 'absolute', left: x, top: y + arc, width: CARD_W, height: CARD_H, marginLeft: -CARD_W / 2, marginTop: -CARD_H / 2,
      transform: `rotate(${rot}deg) scale(${sc})`, opacity: 1 - dissolve, zIndex: 20 + i,
      borderRadius: 16, overflow: 'hidden', background: CREAM,
      boxShadow: `0 ${lift}px ${lift * 2.4}px rgba(23,52,88,0.30), 0 0 0 1px rgba(23,52,88,0.10)`,
      WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>
      <img src={card.src} draggable={false} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 6px rgba(255,255,255,0.55)', borderRadius: 16, pointerEvents: 'none' }} />
    </div>
  );
}

/* a single VIKAS 75 glyph that materialises out of chunky pixels (canvas pixelate-in) */
const _imgCache: Record<string, HTMLImageElement> = {};
function _loadImg(src: string) { if (!_imgCache[src]) { const im = new Image(); im.src = src; _imgCache[src] = im; } return _imgCache[src]; }
function PixelLetter({ i, time }: { i: number; time: number }) {
  const moveStart = 2.45 + i * 0.16;
  const start = moveStart + 0.28;
  const p = seg(time, start, start + 0.62, E.outCubic);
  const sharp = seg(time, start + 0.30, start + 0.66, E.inOutSine);
  const fadeOut = seg(time, 4.35, 4.62, E.inCubic);
  const ref = useRef<HTMLCanvasElement>(null);
  const L = letterRect(i);
  const cw = Math.round(L.w), ch = Math.round(L.h);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const img = _loadImg(`/intro/letter_${i}.png`);
    const draw = () => {
      ctx.clearRect(0, 0, cw, ch);
      if (!img.complete || !img.naturalWidth) return;
      const cell = Math.max(1, Math.round(1 + 12 * Math.pow(1 - p, 1.7)));
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
    <div style={{ position: 'absolute', left: L.left, top: L.top, width: L.w, height: L.h, opacity: baseOp, zIndex: 6, filter: 'drop-shadow(0 6px 14px rgba(23,52,88,0.16))' }}>
      <canvas ref={ref} width={cw} height={ch} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated', opacity: 1 - sharp }} />
      <img src={`/intro/letter_${i}.png`} draggable={false} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', opacity: sharp }} />
    </div>
  );
}

function Letters({ time }: { time: number }) {
  if (time < 2.6) return null;
  return <>{[0, 1, 2, 3, 4, 5, 6].map(i => <PixelLetter key={i} i={i} time={time} />)}</>;
}

function Hand({ time }: { time: number }) {
  if (time > 4.0) return null;
  return <>{HAND.map((c, i) => <Card key={i} card={c} i={i} n={HAND.length} time={time} />)}</>;
}

/* ── background: cream paper, soft vignette, warm center ──────── */
const GRAIN = (() => { const r = mulberry(11); const a: { x: number; y: number; s: number; o: number }[] = []; for (let i = 0; i < 90; i++) a.push({ x: r() * 1920, y: r() * 1080, s: 1 + Math.round(r()), o: 0.02 + r() * 0.04 }); return a; })();
function Background({ time }: { time: number }) {
  const fade = seg(time, 0, 0.5);
  const breathe = 0.5 + 0.5 * Math.sin(time * 1.1);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fade, background: CREAM }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 60% at 50% 46%, ${CREAM_HI} 0%, rgba(253,248,232,0) 60%)`, opacity: 0.7 + 0.3 * breathe }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(0,0,0,0) 58%, rgba(23,52,88,0.10) 100%)' }} />
      {GRAIN.map((g, i) => <div key={i} style={{ position: 'absolute', left: g.x, top: g.y, width: g.s, height: g.s, background: INK, opacity: g.o }} />)}
    </div>
  );
}

/* ── tricolor rule (flag motif from the cards) ───────────────── */
function Tricolor({ time }: { time: number }) {
  const p = seg(time, 4.6, 5.2, E.outQuint);
  if (p <= 0) return null;
  const w = COL_W * p;
  const cy = BANDS.bottom.top + BANDS.bottom.h + 64;
  const stripe = (color: string, top: number) => (
    <div style={{ position: 'absolute', left: COL_L + (COL_W - w) / 2, top, width: w, height: 7, background: color }} />
  );
  return (
    <div style={{ position: 'absolute', left: 0, top: cy, height: 23, opacity: clamp(p * 1.4, 0, 1) }}>
      {stripe(SAFFRON, 0)}
      {stripe('#ffffff', 8)}
      {stripe(GREEN, 16)}
    </div>
  );
}

/* ── logo resolve + cascade-up exit (trails the arrow) ───────── */
function Logo({ time }: { time: number }) {
  const midIn = seg(time, 4.35, 4.62, E.outCubic);
  const topP = seg(time, 4.35, 4.85, E.outBack);
  const botP = seg(time, 4.2, 4.7, E.outExpo);
  const botY = (1 - botP) * 70;
  const settle = seg(time, 4.55, 5.1);
  const glow = 0.22 + 0.5 * settle + 0.08 * Math.sin(time * 1.8);
  const drop = `drop-shadow(0 8px 22px rgba(23,52,88,${0.16 + 0.1 * settle})) drop-shadow(0 0 ${6 + 10 * settle}px rgba(238,125,35,${0.12 * glow}))`;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', left: BANDS.mid.left, top: BANDS.mid.top, width: BANDS.mid.w, height: BANDS.mid.h, opacity: midIn, filter: drop }}>
        <img src="/intro/logo_mid_navy.png" alt="" style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
      <div style={{ position: 'absolute', left: BANDS.top.left, top: BANDS.top.top, width: BANDS.top.w, height: BANDS.top.h, opacity: topP, transform: `translateY(${(1 - topP) * -14}px)` }}>
        <img src="/intro/logo_top_navy.png" alt="" style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
      <div style={{ position: 'absolute', left: BANDS.bottom.left, top: BANDS.bottom.top, width: BANDS.bottom.w, height: BANDS.bottom.h, opacity: clamp(botP * 1.6, 0, 1), transform: `translateY(${botY}px)`, filter: drop }}>
        <img src="/intro/logo_bottom_navy.png" alt="" style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    </div>
  );
}

/* ── soft wash to the opening cream as everything cascades off ── */
function Cascade({ time }: { time: number }) {
  const p = seg(time, 6.6, 7.9, E.inOutCubic);
  if (p <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, pointerEvents: 'none', background: '#ffffff', opacity: p }} />
  );
}

/* ── the up-arrow knocked out of the A lifts straight off ────── */
const ARW_L = 692, ARW_T = 68, ARW_W = 72, ARW_H = 247;
const ARW_PTS = "36,0 72,64 47,64 47,247 24,247 24,64 0,64";
function Arrow({ time }: { time: number }) {
  const launch = seg(time, 5.4, 7.1, E.inCubic);
  if (launch <= 0) return null;
  const restLeft = BANDS.mid.left + ARW_L * SCALE;
  const restTop = BANDS.mid.top + ARW_T * SCALE;
  const dispW = ARW_W * SCALE, dispH = ARW_H * SCALE;
  const ty = -(restTop + dispH + 80) * launch;
  const opOut = launch < 0.82 ? 1 : 1 - (launch - 0.82) / 0.18;
  const trailH = lerp(40, 460, launch);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 31, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: ARROW_X, top: restTop + dispH, marginLeft: -11, width: 22, height: trailH, transform: `translateY(${ty}px)`, opacity: opOut * 0.9, borderRadius: 11, filter: 'blur(1px)',
        background: `linear-gradient(180deg, rgba(238,125,35,0) 0%, ${SAFFRON} 30%, #ffffff 55%, ${GREEN} 80%, rgba(31,162,74,0) 100%)` }} />
      <svg width={dispW} height={dispH} viewBox="0 0 72 247" style={{ position: 'absolute', left: restLeft, top: restTop, transform: `translateY(${ty}px)`, opacity: opOut, filter: 'drop-shadow(0 5px 12px rgba(23,52,88,0.30))' }}>
        <polygon points={ARW_PTS} fill={CREAM} />
      </svg>
    </div>
  );
}

/* tricolor pixel-confetti burst at the apex */
const CONFETTI = (() => { const r = mulberry(33); const a: { ox: number; vx: number; vy: number; size: number; col: string; spin: number; delay: number }[] = []; const cols = [SAFFRON, GREEN, INK, '#ffffff']; for (let i = 0; i < 64; i++) { const ang = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.3; const spd = 380 + r() * 780; a.push({ ox: (r() - 0.5) * 360, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, size: 7 + Math.round(r() * 4) * 2, col: cols[Math.floor(r() * cols.length)], spin: (r() - 0.5) * 920, delay: r() * 0.12 }); } return a; })();
function Confetti({ time }: { time: number }) {
  const t0 = 6.55, g = 880, OX = ARROW_X, OY = 80;
  const base = time - t0; if (base <= 0 || time > 9.6) return null;
  return <>{CONFETTI.map((c, i) => { const lt = base - c.delay; if (lt <= 0) return null; const x = OX + c.ox + c.vx * lt * 0.72; const y = OY + c.vy * lt * 0.72 + 0.5 * g * lt * lt; const op = clamp(1 - (lt - 1.1) / 1.0, 0, 1); if (op <= 0) return null; return <div key={i} style={{ position: 'absolute', left: x, top: y, width: c.size, height: c.size, background: c.col, opacity: op, transform: `rotate(${c.spin * lt}deg)`, zIndex: 34, boxShadow: c.col === INK ? 'none' : '0 1px 2px rgba(23,52,88,0.18)' }} />; })}</>;
}

/* ── end-screen call to action ───────────────────────────────── */
function Cta({ time }: { time: number }) {
  const p = seg(time, 7.95, 8.65, E.outBack);
  if (p <= 0) return null;
  const sc = 0.72 + 0.28 * Math.min(p, 1);
  const breathe = p >= 1 ? 1 + 0.022 * Math.sin((time - 8.65) * 3.2) : 1;
  return (
    <div style={{ position: 'absolute', left: 960, top: 540, transform: `translate(-50%,-50%) scale(${sc * breathe})`, opacity: Math.min(p, 1), zIndex: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 48px', background: INK, color: CREAM, fontFamily: PSFONT, fontSize: 21, letterSpacing: 2, borderRadius: 8, boxShadow: '0 14px 32px rgba(23,52,88,0.4)' }}>
        <span>PLAY NOW</span>
        <span style={{ width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: `17px solid ${SAFFRON}` }} />
      </div>
    </div>
  );
}

/* ── scene ───────────────────────────────────────────────────── */
function Scene() {
  const time = useTime();
  const fadeIn = seg(time, 0, 0.3);
  const fadeOut = 1 - seg(time, 9.9, 10.4, E.inCubic);
  const alpha = fadeIn * fadeOut;
  const land = (time > 3.15 && time < 3.42) ? Math.sin((time - 3.15) / 0.27 * Math.PI) * 5 : 0;
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
        <Cta time={time} />
      </div>
    </div>
  );
}

const STAGE_W = 1920, STAGE_H = 1080, DURATION = 10.4;
const PRELOAD = [
  ...HAND.map(c => c.src),
  ...[0, 1, 2, 3, 4, 5, 6].map(i => `/intro/letter_${i}.png`),
  '/intro/logo_mid_navy.png', '/intro/logo_top_navy.png', '/intro/logo_bottom_navy.png',
];

/**
 * One-shot brand intro. Renders the 1920×1080 scene scaled to fit the viewport (letterboxed
 * on #08070f), runs the timeline once via rAF, and calls onDone() at the end, on tap/skip,
 * or immediately if the user prefers reduced motion.
 */
export default function IntroAnimation({ onDone }: { onDone: () => void }) {
  const [time, setTime] = useState(0);
  const [scale, setScale] = useState(1);
  const raf = useRef(0);
  const last = useRef<number | null>(null);
  const tRef = useRef(0);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (raf.current) cancelAnimationFrame(raf.current);
    onDone();
  }, [onDone]);

  // Respect reduced-motion: skip straight to the app.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      finish();
    }
  }, [finish]);

  // Preload every frame's assets so nothing pops in mid-animation.
  useEffect(() => { PRELOAD.forEach(s => { const im = new Image(); im.src = s; }); }, []);

  // Scale 1920×1080 to fit (contain) so the wordmark is never cropped.
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // rAF clock — plays the timeline exactly once.
  useEffect(() => {
    const step = (ts: number) => {
      if (last.current == null) last.current = ts;
      const dt = (ts - last.current) / 1000;
      last.current = ts;
      tRef.current = Math.min(tRef.current + dt, DURATION);
      setTime(tRef.current);
      if (tRef.current >= DURATION) { finish(); return; }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [finish]);

  // Let players who've seen it bail early.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter') { e.preventDefault(); finish(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  return (
    <div
      onClick={finish}
      role="button"
      tabIndex={-1}
      aria-label="Intro animation — tap to skip"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#08070f', overflow: 'hidden', cursor: 'pointer' }}
    >
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center center' }}>
        <TimeCtx.Provider value={time}><Scene /></TimeCtx.Provider>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); finish(); }}
        style={{ position: 'absolute', bottom: 'max(20px, env(safe-area-inset-bottom))', right: 20, zIndex: 10000,
          padding: '8px 16px', borderRadius: 999, border: '1px solid rgba(246,239,216,0.3)',
          background: 'rgba(8,7,15,0.5)', color: CREAM, fontFamily: 'var(--font-inter), sans-serif',
          fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      >
        Skip ▸
      </button>
    </div>
  );
}
