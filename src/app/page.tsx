'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { FaGlobe, FaInstagram, FaXTwitter, FaLinkedin, FaFacebook, FaYoutube } from 'react-icons/fa6';
import { getLobbyMusic } from '@/lib/music-manager';
import IntroAnimation from '@/components/intro/IntroAnimation';
import LogoLockup from '@/components/ui/LogoLockup';
import HowToPlayPanel from '@/components/landing/HowToPlayPanel';

// ─────────────────────────────────────────────────────────────
// Card data — real game card images
// ─────────────────────────────────────────────────────────────
const CARDS = [
  { src: '/cards/card-001.webp', kind: 'challenge' as const, id: 'challenge' },    // c001 — blue problem card
  { src: '/cards/card-031.webp', kind: 'scheme'    as const, id: 'jan-dhan' },     // s001
  { src: '/cards/card-033.webp', kind: 'scheme'    as const, id: 'make-in-india' }, // s003
  { src: '/cards/card-032.webp', kind: 'scheme'    as const, id: 'skill-india' },  // s002
  { src: '/cards/card-034.webp', kind: 'scheme'    as const, id: 'swachh-bharat' }, // s004
  { src: '/cards/card-037.webp', kind: 'scheme'    as const, id: 'indradhanush' }, // s007
];

// ─────────────────────────────────────────────────────────────
// Social links
// ─────────────────────────────────────────────────────────────
const SOCIAL_LINKS = [
  { label: 'Website',   href: 'https://www.sujeetkofficial.com/',                                    Icon: FaGlobe     },
  { label: 'Instagram', href: 'https://www.instagram.com/sujeetkofficial/',                          Icon: FaInstagram  },
  { label: 'X',         href: 'https://x.com/SujeetKOfficial',                                       Icon: FaXTwitter   },
  { label: 'LinkedIn',  href: 'https://www.linkedin.com/in/sujeet--kumar/',                          Icon: FaLinkedin   },
  { label: 'Facebook',  href: 'https://www.facebook.com/SujeetKOfficial/',                           Icon: FaFacebook   },
  { label: 'YouTube',   href: 'https://www.youtube.com/channel/UC6yGMDZkljNPgX8vGUcBTbA/playlists', Icon: FaYoutube    },
];

// ─────────────────────────────────────────────────────────────
// useFanScale — computes scale from viewport vs 1440×900 baseline
// ─────────────────────────────────────────────────────────────
function useFanScale() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      // Multiply by 0.9 so the card fan matches the 90%-zoom proportions at native 100%
      setScale(Math.min(window.innerWidth / 1440, window.innerHeight / 900) * 0.9);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return scale;
}

// ─────────────────────────────────────────────────────────────
// Card visual-state
// Single click → lifts card (selected). Click again → deselects.
// NO second-click "full card" state.
// ─────────────────────────────────────────────────────────────
type CardState = {
  x: number; y: number; r: number; s: number;
  status: string; pivot: 'center' | 'bottom'; clickable: boolean;
};

function getCardState(
  idx: number,
  dealt: Set<string>,
  pickedId: string | null,
  hoverId: string | null,
  chlPicked: boolean,
  chlHovered: boolean,
  scale: number,
): CardState {
  const card = CARDS[idx];
  const isChl = card.kind === 'challenge';
  const t = (idx - 1) - 2;

  const CHL_Y  = Math.round(-200 * scale);
  const HAND_Y = Math.round(153 * scale);

  if (!dealt.has(card.id))
    return isChl
      ? { x: 0,                          y: 900, r: -3,    s: 0.9,  status: '', pivot: 'center', clickable: false }
      : { x: t * Math.round(25 * scale), y: 900, r: t * 5, s: 0.85, status: '', pivot: 'bottom', clickable: false };

  if (isChl) {
    if (chlPicked)
      return { x: 0, y: CHL_Y - Math.round(38 * scale), r: 0, s: 1.12, status: 'is-chl-front', pivot: 'center', clickable: true };
    if (chlHovered)
      return { x: 0, y: CHL_Y - Math.round(10 * scale), r: -0.5, s: 1.03, status: 'is-chl-hover', pivot: 'center', clickable: true };
    return { x: 0, y: CHL_Y, r: -1.5, s: 0.95, status: '', pivot: 'center', clickable: true };
  }

  const isPicked    = pickedId === card.id;
  const otherPicked = !!pickedId && pickedId !== card.id;
  const hovered     = hoverId === card.id && !pickedId;
  const spread60    = t * Math.round(60 * scale);
  const arc5        = Math.abs(t) * Math.round(5 * scale);

  if (isPicked)
    return { x: t * Math.round(50 * scale), y: HAND_Y - Math.round(90 * scale), r: t * 3, s: 1.04, status: 'is-front', pivot: 'bottom', clickable: true };

  if (otherPicked)
    return { x: t * Math.round(105 * scale), y: HAND_Y + Math.round(55 * scale), r: t * 9, s: 0.76, status: 'is-dim', pivot: 'bottom', clickable: true };

  return {
    x: spread60,
    y: HAND_Y + arc5 + (hovered ? -Math.round(22 * scale) : 0),
    r: t * 7,
    s: 0.92 + (hovered ? 0.02 : 0),
    status: hovered ? 'is-hover' : '',
    pivot: 'bottom',
    clickable: true,
  };
}

function cardFilter(status: string) {
  switch (status) {
    case 'is-chl-front':
      // Blue/navy glow to match the challenge card colour
      return 'drop-shadow(0 0 28px rgba(99,149,255,.7)) drop-shadow(0 0 10px rgba(99,149,255,.4)) drop-shadow(0 32px 44px rgba(0,0,0,.65)) drop-shadow(0 10px 18px rgba(0,0,0,.5))';
    case 'is-chl-hover':
      return 'drop-shadow(0 0 16px rgba(99,149,255,.4)) drop-shadow(0 28px 34px rgba(0,0,0,.58)) drop-shadow(0 8px 14px rgba(0,0,0,.45))';
    case 'is-front':
      // Gold glow for selected scheme card
      return 'drop-shadow(0 0 22px rgba(255,215,0,.55)) drop-shadow(0 0 8px rgba(255,215,0,.3)) drop-shadow(0 28px 38px rgba(0,0,0,.6)) drop-shadow(0 8px 16px rgba(0,0,0,.5))';
    case 'is-hover':
      return 'drop-shadow(0 0 18px rgba(255,215,0,.4)) drop-shadow(0 26px 32px rgba(0,0,0,.55)) drop-shadow(0 8px 14px rgba(0,0,0,.45))';
    default:
      return 'drop-shadow(0 22px 30px rgba(0,0,0,.55)) drop-shadow(0 7px 12px rgba(0,0,0,.45))';
  }
}

// ─────────────────────────────────────────────────────────────
// HeroFan — entry animation + hover + click select/deselect
// ─────────────────────────────────────────────────────────────
function HeroFan() {
  const scale = useFanScale();
  const [dealt, setDealt]           = useState<Set<string>>(() => new Set());
  const [pickedId, setPicked]       = useState<string | null>(null);
  const [hoverId, setHover]         = useState<string | null>(null);
  const [chlPicked, setChlPicked]   = useState(false);
  const [chlHovered, setChlHovered] = useState(false);

  const CW = Math.round(248 * scale);
  const CH = Math.round(332 * scale);
  const stageW = Math.round(620 * scale);
  const stageH = Math.round(760 * scale);
  const borderRadius = Math.round(14 * scale);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setDealt(s => new Set([...s, 'challenge'])), 400));
    ['skill-india', 'make-in-india', 'jan-dhan', 'swachh-bharat', 'indradhanush'].forEach((id, i) => {
      timers.push(setTimeout(() => setDealt(s => new Set([...s, id])), 1300 + i * 120));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // Single click: select / deselect. Challenge and scheme cards are independent.
  const handleClick = (cardId: string) => {
    const card = CARDS.find(c => c.id === cardId);
    if (!card) return;
    if (card.kind === 'challenge') {
      setChlPicked(prev => !prev);
      setChlHovered(false);
      return;
    }
    setPicked(prev => prev === cardId ? null : cardId);
    setHover(null);
  };

  return (
    <div style={{ position: 'relative', width: stageW, height: stageH, overflow: 'visible' }}>
      {/* Focal warm glow */}
      <div style={{
        position: 'absolute', left: '50%', top: Math.round(60 * scale),
        width: Math.round(460 * scale), height: Math.round(400 * scale),
        transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse at center,rgba(255,153,51,.14) 0%,rgba(255,215,0,.06) 30%,rgba(255,153,51,0) 60%)',
        pointerEvents: 'none', zIndex: 0, filter: 'blur(2px)',
      }} />

      {CARDS.map((card, idx) => {
        const st = getCardState(idx, dealt, pickedId, hoverId, chlPicked, chlHovered, scale);
        const tf = `translate(-50%,-50%) translate(${st.x}px,${st.y}px) rotate(${st.r}deg) scale(${st.s})`;
        const zIndex = (st.status === 'is-front' || st.status === 'is-chl-front') ? 50 : 10 + idx;
        return (
          <div
            key={card.id}
            onClick={() => st.clickable && handleClick(card.id)}
            onMouseEnter={() => {
              if (!st.clickable) return;
              if (card.kind === 'challenge') { setChlHovered(true); return; }
              if (!pickedId) setHover(card.id);
            }}
            onMouseLeave={() => {
              if (card.kind === 'challenge') setChlHovered(false);
              else setHover(null);
            }}
            style={{
              position: 'absolute', left: '50%', top: '50%',
              width: CW, height: CH,
              transformOrigin: st.pivot === 'center' ? '50% 50%' : '50% 100%',
              transform: tf,
              filter: cardFilter(st.status),
              transition: 'transform .9s cubic-bezier(.2,.75,.25,1), filter .8s ease',
              willChange: 'transform, filter',
              zIndex,
              cursor: st.clickable ? 'pointer' : 'default',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.src} alt=""
              draggable={false}
              style={{ width: '100%', height: '100%', display: 'block', borderRadius, objectFit: 'cover' }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Full-page landing layout — fully responsive, no fixed canvas
// ─────────────────────────────────────────────────────────────
function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = (searchParams.get('code') ?? '').toUpperCase().slice(0, 4);
  const [musicOn, setMusicOn] = useState(false);
  const [hosting, setHosting] = useState(false);
  // Brand intro: plays on every load of the landing (a fixed, opaque overlay over the page).
  // Default-true so it covers the page from first paint; the redirect effect below decides
  // where to go *after* the intro (so a returning player still sees it, then lands in /room).
  const [showIntro, setShowIntro] = useState(true);
  const pendingRedirect = useRef<string | null>(null);
  const dismissIntro = useCallback(() => {
    setShowIntro(false);
    let dest = pendingRedirect.current;
    // The intro can finish before the redirect effect runs (reduced-motion fires onDone during
    // mount, and a child's effects run before its parent's). Re-derive the returning-player
    // destination here so those players still get routed back to their room.
    if (!dest && !initialCode) {
      try {
        const pid = localStorage.getItem('vikas75_playerId');
        const pname = localStorage.getItem('vikas75_playerName');
        const avid = localStorage.getItem('vikas75_avatarId');
        const rc = localStorage.getItem('vikas75_roomCode');
        if (pid && pname && avid && rc) dest = `/room/${rc}`;
      } catch { /* ignore */ }
    }
    pendingRedirect.current = null;
    if (dest) router.replace(dest);
  }, [router, initialCode]);
  // Starts false (desktop) so SSR and first client render agree, then corrects on mount.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Create a room directly and go straight to the projector/lobby. Game settings
  // (rounds, timer, mode) live in the lobby's host controls, so there's no separate
  // setup page — hosting is one click.
  async function handleHostGame() {
    if (hosting) return;
    setHosting(true);
    const hostId = crypto.randomUUID();
    try {
      const res = await fetch('/api/game', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-room', hostId, hostName: 'Host' }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Could not create room'); setHosting(false); return; }
      router.push(`/projector/${data.room.code}?h=${hostId}`);
    } catch {
      toast.error('Network error. Please try again.');
      setHosting(false);
    }
  }

  const logoClickCount = useRef(0);
  const logoEasterEggShown = useRef(false);
  function handleLogoClick() {
    if (logoEasterEggShown.current) return;
    logoClickCount.current += 1;
    if (logoClickCount.current === 7) {
      logoEasterEggShown.current = true;
      toast("Claude wrote the code. I wrote the prompt. Tomato tomato.\n— Kaustubh", {
        duration: 8000, position: 'bottom-center',
        style: { background: '#1a3a6e', color: '#ffffff' },
      });
    }
  }

  useEffect(() => {
    // A shared link / legacy QR landing on the home page with ?code= goes to the join page,
    // which plays the intro itself — so skip it here and redirect immediately.
    if (initialCode) { setShowIntro(false); router.replace(`/join?code=${initialCode}`); return; }
    const pid  = localStorage.getItem('vikas75_playerId');
    const pname = localStorage.getItem('vikas75_playerName');
    const avid = localStorage.getItem('vikas75_avatarId');
    const rc   = localStorage.getItem('vikas75_roomCode');
    // A returning player gets bounced back to their room — but only *after* the intro plays
    // (or they hit Skip), so the opening animation still shows on every load of the game.
    if (pid && pname && avid && rc) pendingRedirect.current = `/room/${rc}`;
  }, [router, initialCode]);

  // Sync music button state from saved preference and attempt to resume playback.
  // play() silently no-ops if autoplay is blocked by the browser.
  useEffect(() => {
    const mgr = getLobbyMusic();
    setMusicOn(mgr.enabled);
    mgr.play();
  }, []);

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    height: 'clamp(38px, 4.2vh, 52px)',
    padding: '0 24px',
    width: 'auto',
    borderRadius: 6, border: '1.5px solid transparent',
    fontFamily: 'var(--font-inter),sans-serif',
    fontWeight: 600, fontSize: 'clamp(10px, 0.95vw, 13px)',
    letterSpacing: '0.14em', textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'transform .15s ease, background .15s ease, box-shadow .15s ease, border-color .15s ease',
  };

  // Shared background layers (dark base, saffron glow, film grain) used by both layouts.
  const backdrop = (
    <>
      <div style={{ position: 'absolute', inset: 0, background: '#08070f', zIndex: 0 }} />
      <div style={{
        position: 'absolute', left: '50%', top: '-25%',
        width: '83vw', height: '100vh',
        transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse at center,rgba(255,153,51,.16) 0%,rgba(255,153,51,.06) 28%,rgba(255,153,51,0) 60%)',
        pointerEvents: 'none', zIndex: 1,
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        opacity: 0.12, mixBlendMode: 'overlay', pointerEvents: 'none', zIndex: 2,
      }} />
    </>
  );

  // ── Mobile: a stacked, scrollable single column (the desktop 3-column grid needs
  //    ~440px of side columns alone and would clip on phones). ───────────────────
  if (isMobile) {
    return (
      <div style={{ position: 'relative', minHeight: '100dvh', width: '100%', background: '#08070f', overflowX: 'hidden', isolation: 'isolate' }}>
        {showIntro && <IntroAnimation onDone={dismissIntro} />}
        {backdrop}
        <div style={{
          position: 'relative', zIndex: 3, minHeight: '100dvh',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 'clamp(22px,5vh,40px)', padding: '40px 24px', boxSizing: 'border-box',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button onClick={handleLogoClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <LogoLockup size="lg" />
            </button>
          </div>

          {/* CTAs */}
          <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              style={{ ...btnBase, height: 52, fontSize: 13, width: '100%', background: '#FF9933', color: '#1a1208', borderColor: '#FF9933' }}
              onClick={handleHostGame}
            >
              {hosting ? 'Creating…' : 'Host a Game'}
            </button>
            <button
              style={{ ...btnBase, height: 52, fontSize: 13, width: '100%', background: 'transparent', color: '#FF9933', borderColor: '#FF9933' }}
              onClick={() => router.push('/join')}
            >
              Join a Game
            </button>
          </div>

          {/* The column has stacked, so the panel takes its list layout — five steps in place
              beats a link to another page. */}
          <div style={{ width: '100%', maxWidth: 340 }}>
            <HowToPlayPanel layout="list" />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 'auto', paddingTop: 24 }}>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  style={{ color: 'rgba(250,248,240,.6)', fontSize: 18, display: 'flex' }}>
                  <Icon />
                </a>
              ))}
            </div>
            <a href="/explore" style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: 11, letterSpacing: '0.08em', color: 'rgba(250,248,240,0.4)', textDecoration: 'none' }}>
              Curious what&apos;s in the deck? →
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={() => { const next = getLobbyMusic().toggle(); setMusicOn(next); }}
                aria-label={musicOn ? 'Turn off music' : 'Turn on music'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: musicOn ? 'rgba(255,153,51,0.7)' : 'rgba(250,248,240,0.3)', padding: 0 }}
              >
                {musicOn ? '🔊' : '🔇'}
              </button>
              <div style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(250,248,240,.4)' }}>
                © 2026 · Vikas 75
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    /* Outer container — fills the viewport; scrolls vertically only if the content can't fit
       (e.g. a short laptop viewport), instead of hard-clipping the grid. */
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', overflowX: 'hidden', isolation: 'isolate' }}>
      {showIntro && <IntroAnimation onDone={dismissIntro} />}
      {backdrop}

      {/* 3-column grid */}
      <div style={{
        position: 'relative', zIndex: 3,
        width: '100%', minHeight: '100%',
        padding: 'clamp(20px, 3.5vh, 48px) clamp(24px, 3.5vw, 56px) clamp(14px, 2.2vh, 30px)',
        display: 'grid',
        gridTemplateColumns: 'minmax(200px, 20vw) 1fr minmax(220px, 22vw)',
        gridTemplateRows: '1fr auto',
        gap: '0 clamp(12px, 1.8vw, 24px)',
        alignItems: 'stretch',
        boxSizing: 'border-box',
      }}>

        {/* ── LEFT: logo + CTAs ─────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 5, alignItems: 'flex-start' }}>
          {/* Shared width wrapper — logo and buttons size together */}
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 16, width: 'fit-content' }}>
          {/* Logo unit — the brand mark the intro resolves to */}
          <button onClick={handleLogoClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            <LogoLockup size="lg" />
          </button>

          {/* CTA buttons — width: 100% stretches to match logo above */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              style={{ ...btnBase, width: '100%', background: '#FF9933', color: '#1a1208', borderColor: '#FF9933' }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#e6862b'; b.style.transform = 'translateY(-1px)'; b.style.boxShadow = '0 6px 24px rgba(255,153,51,.32)'; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#FF9933'; b.style.transform = ''; b.style.boxShadow = ''; }}
              onClick={handleHostGame}
            >
              {hosting ? 'Creating…' : 'Host a Game'}
            </button>
            <button
              style={{ ...btnBase, width: '100%', background: 'transparent', color: '#FF9933', borderColor: '#FF9933' }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(255,153,51,.08)'; b.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'transparent'; b.style.transform = ''; }}
              onClick={() => router.push('/join')}
            >
              Join a Game
            </button>
          </div>
          </div>{/* end shared width wrapper */}
        </div>

        {/* ── CENTER: card fan ─────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'visible', zIndex: 1 }}>
          <HeroFan />
        </div>

        {/* ── RIGHT: How To Play ───────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', zIndex: 5 }}>
          {/* Held at step 01 until the intro clears — the panel renders behind it, and a sequence
              that runs during the intro would greet the visitor mid-way through. */}
          <HowToPlayPanel active={!showIntro} />
        </div>

        {/* ── BOTTOM STRIP ────────────────────────────────────── */}
        <div style={{
          gridColumn: '1 / -1',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 10, paddingTop: 16,
          borderTop: '1px solid rgba(250,248,240,.14)',
        }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                style={{ color: 'rgba(250,248,240,.6)', transition: 'color .15s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(14px, 1.25vw, 18px)' }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#FF9933'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,248,240,.6)'}
              >
                <Icon />
              </a>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="/explore" style={{
              fontFamily: 'var(--font-inter),sans-serif',
              fontSize: 'clamp(9px, 0.76vw, 11px)',
              fontWeight: 500, letterSpacing: '0.08em',
              color: 'rgba(250,248,240,0.35)',
              textDecoration: 'none',
              transition: 'color .15s',
              whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#FF9933'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,248,240,0.35)'}
            >
              Curious what&apos;s in the deck? →
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Music toggle — sits in bottom strip, never overlaps content */}
            <button
              onClick={() => { const next = getLobbyMusic().toggle(); setMusicOn(next); }}
              aria-label={musicOn ? 'Turn off music' : 'Turn on music'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 'clamp(14px, 1.25vw, 18px)',
                color: musicOn ? 'rgba(255,153,51,0.7)' : 'rgba(250,248,240,0.3)',
                padding: 0, lineHeight: 1,
                transition: 'color .15s ease',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = musicOn ? '#FF9933' : 'rgba(250,248,240,0.6)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = musicOn ? 'rgba(255,153,51,0.7)' : 'rgba(250,248,240,0.3)'}
            >
              {musicOn ? '🔊' : '🔇'}
            </button>
            <div style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: 'clamp(9px, 0.76vw, 11px)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(250,248,240,.4)' }}>
              © 2026 · Vikas 75
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <Suspense fallback={<div style={{ background: '#08070f', position: 'fixed', inset: 0 }} />}>
      <LandingPage />
    </Suspense>
  );
}
