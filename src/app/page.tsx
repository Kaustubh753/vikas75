'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { FaGlobe, FaInstagram, FaXTwitter, FaLinkedin, FaFacebook, FaYoutube } from 'react-icons/fa6';
import { getLobbyMusic } from '@/lib/music-manager';
import IntroAnimation, { hasSeenIntro, type IntroVariant } from '@/components/intro/IntroAnimation';

// ─────────────────────────────────────────────────────────────
// Card data — real game card images (names from context/cards_schemes.json)
// ─────────────────────────────────────────────────────────────
// Six of the real deck. `hi` and `line` are the printed cards' own words (context/cards_*.json),
// read out under the fan when a card is picked, so the fan teaches instead of only lifting.
const CARDS = [
  { src: '/cards/card-001.webp', kind: 'challenge' as const, id: 'challenge',     name: 'Challenge card',
    hi: 'बैंक खाता सबका बने गरीब हो या अमीर, पीएम का मिशन आर्थिक स्थिति हो सबकी ठीक',
    line: 'Whether rich or poor, a bank account for all, it is a mission to make your finances stand tall' }, // c001
  { src: '/cards/card-031.webp', kind: 'scheme'    as const, id: 'jan-dhan',      name: 'Pradhan Mantri Jan Dhan Yojana',
    hi: 'प्रधान मंत्री जन धन योजना', line: 'Ensures access to banking, pensions, and insurance for every family.' },          // s001
  { src: '/cards/card-033.webp', kind: 'scheme'    as const, id: 'make-in-india', name: 'Make in India',
    hi: 'मेक इन इंडिया', line: 'Makes India a hub for manufacturing, design, and innovation.' },                              // s003
  { src: '/cards/card-032.webp', kind: 'scheme'    as const, id: 'skill-india',   name: 'Skill India Mission',
    hi: 'स्किल इंडिया मिशन', line: 'Improves employability and entrepreneurship with certification and digital skilling.' }, // s002
  { src: '/cards/card-034.webp', kind: 'scheme'    as const, id: 'swachh-bharat', name: 'Swachh Bharat Abhiyan',
    hi: 'स्वच्छ भारत अभियान', line: 'Targets cleaner cities and villages and better public health.' },                       // s004
  { src: '/cards/card-037.webp', kind: 'scheme'    as const, id: 'indradhanush',  name: 'Mission Indradhanush',
    hi: 'मिशन इन्द्रधनुष', line: 'Immunisation drive to cover children and pregnant women.' },                              // s007
];

// ─────────────────────────────────────────────────────────────
// How To Play — the short version of /how-to-play, on engine truth:
// seven cards in hand, 25 words, 90 s by default, most rounds won takes the game.
// ─────────────────────────────────────────────────────────────
const HTP_STEPS = [
  { num: '01', title: 'Set the stage.',      body: 'One laptop or TV shows the game. Everyone else plays from their phone. No app, no accounts.' },
  { num: '02', title: 'Get a room.',         body: "Host a game and share the four-letter code, or the QR on the big screen. They'll show up. They always do." },
  { num: '03', title: 'A challenge drops.',  body: "A real problem statement appears. It will sound serious. It won't stay that way." },
  { num: '04', title: 'Play your scheme.',   body: 'You hold seven real government schemes. Pick the one you can sell with a straight face and defend it in 25 words. One crisp sentence earns a bonus.' },
  { num: '05', title: 'Convince the judge.', body: 'Ninety seconds on the clock by default. An AI judge ranks every answer and the funniest valid one takes the round. Win the most rounds, win the game.' },
];

// The phone gets the three lines that matter before the buttons.
const MOBILE_RULES = [
  'One screen shows the game. Everyone plays from their phone.',
  'Pick a real government scheme and defend it in 25 words.',
  'The funniest valid answer wins the round.',
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

const ATTRIBUTION = 'An initiative of the Office of Shri Sujeet Kumar';
const TAGLINE = 'Play for Progress';
// The one-glance premise, in the same words the projector lobby uses.
const PREMISE = 'Pick a sarkari scheme · defend it in 25 words · funniest answer wins';
const PREMISE_HI = 'सरकारी योजना चुनो · 25 शब्दों में बचाव करो · सबसे मज़ेदार जवाब जीतेगा';
const INTER = 'var(--font-inter),sans-serif';
const HOUSE_70 = 'rgba(250,248,240,.7)';
const HOUSE_55 = 'rgba(250,248,240,.55)';
const HAIRLINE = 'rgba(250,248,240,.14)';

// ─────────────────────────────────────────────────────────────
// useFanScale — computes scale from viewport vs 1440×900 baseline
// ─────────────────────────────────────────────────────────────
function useFanScale() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      // 0.84 of the 1440×900 baseline: the fan plus the 96px caption under it fit a 1280×720 laptop.
      setScale(Math.min(window.innerWidth / 1440, window.innerHeight / 900) * 0.84);
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

// Selection glows: saffron on a scheme card (the one action colour), the problem card's own
// navy on the challenge. Gold stays reserved for winners.
function cardFilter(status: string) {
  switch (status) {
    case 'is-chl-front':
      return 'drop-shadow(0 0 28px rgba(66,112,173,.7)) drop-shadow(0 0 10px rgba(66,112,173,.4)) drop-shadow(0 32px 44px rgba(0,0,0,.65)) drop-shadow(0 10px 18px rgba(0,0,0,.5))';
    case 'is-chl-hover':
      return 'drop-shadow(0 0 16px rgba(66,112,173,.4)) drop-shadow(0 28px 34px rgba(0,0,0,.58)) drop-shadow(0 8px 14px rgba(0,0,0,.45))';
    case 'is-front':
      return 'drop-shadow(0 0 22px rgba(255,153,51,.55)) drop-shadow(0 0 8px rgba(255,153,51,.3)) drop-shadow(0 28px 38px rgba(0,0,0,.6)) drop-shadow(0 8px 16px rgba(0,0,0,.5))';
    case 'is-hover':
      return 'drop-shadow(0 0 18px rgba(255,153,51,.4)) drop-shadow(0 26px 32px rgba(0,0,0,.55)) drop-shadow(0 8px 14px rgba(0,0,0,.45))';
    default:
      return 'drop-shadow(0 22px 30px rgba(0,0,0,.55)) drop-shadow(0 7px 12px rgba(0,0,0,.45))';
  }
}

// ─────────────────────────────────────────────────────────────
// HeroFan — entry animation + hover + click select/deselect
// ─────────────────────────────────────────────────────────────
function HeroFan({ active }: { active: boolean }) {
  const scale = useFanScale();
  const [dealt, setDealt]           = useState<Set<string>>(() => new Set());
  const [pickedId, setPicked]       = useState<string | null>(null);
  const [hoverId, setHover]         = useState<string | null>(null);
  const [chlPicked, setChlPicked]   = useState(false);
  const [chlHovered, setChlHovered] = useState(false);
  // The caption under the fan reads whichever card was picked last; the keyboard reaches the
  // hand through one tab stop and walks it with the arrow keys.
  const [lastPicked, setLastPicked] = useState<string | null>(null);
  const [focusId, setFocusId]       = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const CW = Math.round(248 * scale);
  const CH = Math.round(332 * scale);
  const stageW = Math.round(620 * scale);
  const stageH = Math.round(760 * scale);
  const borderRadius = Math.round(14 * scale);
  const capName = Math.max(17, Math.round(24 * scale));
  const capText = Math.max(12, Math.round(13.5 * scale));
  const capH = 96;
  const tabStopId = focusId ?? lastPicked ?? CARDS[0].id;
  const captionCard = lastPicked ? CARDS.find(c => c.id === lastPicked) ?? null : null;

  // The deal waits for the intro overlay to leave, so it is actually seen instead of playing
  // behind an opaque curtain.
  useEffect(() => {
    if (!active) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setDealt(s => new Set([...s, 'challenge'])), 400));
    ['skill-india', 'make-in-india', 'jan-dhan', 'swachh-bharat', 'indradhanush'].forEach((id, i) => {
      timers.push(setTimeout(() => setDealt(s => new Set([...s, id])), 1300 + i * 120));
    });
    return () => timers.forEach(clearTimeout);
  }, [active]);

  // Single click: select / deselect. Challenge and scheme cards are independent.
  const handleClick = (cardId: string) => {
    const card = CARDS.find(c => c.id === cardId);
    if (!card) return;
    if (card.kind === 'challenge') {
      const next = !chlPicked;
      setChlPicked(next);
      setChlHovered(false);
      setLastPicked(next ? 'challenge' : pickedId);
      return;
    }
    const next = pickedId === cardId ? null : cardId;
    setPicked(next);
    setHover(null);
    setLastPicked(next ?? (chlPicked ? 'challenge' : null));
  };

  // Arrow keys walk the dealt cards in hand order; Home and End jump to the ends.
  const moveFocus = (fromId: string, key: string) => {
    const order = CARDS.map(c => c.id);
    const i = order.indexOf(fromId);
    let j = -1;
    if (key === 'ArrowRight' || key === 'ArrowDown') j = (i + 1) % order.length;
    else if (key === 'ArrowLeft' || key === 'ArrowUp') j = (i - 1 + order.length) % order.length;
    else if (key === 'Home') j = 0;
    else if (key === 'End') j = order.length - 1;
    if (j < 0) return false;
    const id = order[j];
    setFocusId(id);
    cardRefs.current[id]?.focus();
    return true;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(6 * scale) }}>
    <div role="group" aria-label="A dealt hand from the deck. Arrow keys move between the cards; Enter picks one up." style={{ position: 'relative', width: stageW, height: stageH, overflow: 'visible' }}>
      {/* Focal warm glow */}
      <div style={{
        position: 'absolute', left: '50%', top: Math.round(60 * scale),
        width: Math.round(460 * scale), height: Math.round(400 * scale),
        transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse at center,rgba(255,153,51,.14) 0%,rgba(255,153,51,.06) 30%,rgba(255,153,51,0) 60%)',
        pointerEvents: 'none', zIndex: 0, filter: 'blur(2px)',
      }} />

      {CARDS.map((card, idx) => {
        const st = getCardState(idx, dealt, pickedId, hoverId, chlPicked, chlHovered, scale);
        const tf = `translate(-50%,-50%) translate(${st.x}px,${st.y}px) rotate(${st.r}deg) scale(${st.s})`;
        const zIndex = (st.status === 'is-front' || st.status === 'is-chl-front') ? 50 : 10 + idx;
        const pressed = card.kind === 'challenge' ? chlPicked : pickedId === card.id;
        return (
          <div
            key={card.id}
            ref={(el) => { cardRefs.current[card.id] = el; }}
            role="button"
            tabIndex={st.clickable && card.id === tabStopId ? 0 : -1}
            aria-label={card.name}
            aria-pressed={pressed}
            onClick={() => st.clickable && handleClick(card.id)}
            onKeyDown={(e) => {
              if (!st.clickable) return;
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(card.id); return; }
              if (moveFocus(card.id, e.key)) e.preventDefault();
            }}
            onMouseEnter={() => {
              if (!st.clickable) return;
              if (card.kind === 'challenge') { setChlHovered(true); return; }
              if (!pickedId) setHover(card.id);
            }}
            onMouseLeave={() => {
              if (card.kind === 'challenge') setChlHovered(false);
              else setHover(null);
            }}
            onFocus={() => {
              if (!st.clickable) return;
              setFocusId(card.id);
              if (card.kind === 'challenge') { setChlHovered(true); return; }
              if (!pickedId) setHover(card.id);
            }}
            onBlur={() => {
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
              borderRadius,
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

    {/* The cue card: the picked card's own words, in a box that never changes size */}
    <div aria-live="polite" style={{ width: stageW, height: capH, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      {captionCard ? (
        <div key={captionCard.id} className="animate-rise-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, maxWidth: Math.round(stageW * 0.92) }}>
          <span style={{ fontFamily: INTER, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#FF9933' }}>
            {captionCard.kind === 'challenge' ? 'The challenge card' : 'One of 75 scheme cards'}
          </span>
          <span style={{ fontFamily: 'var(--font-bebas),sans-serif', fontSize: captionCard.kind === 'challenge' ? capName - 4 : capName, lineHeight: 1.1, letterSpacing: '0.04em', color: '#fff' }}>
            {captionCard.kind === 'challenge' ? captionCard.line : captionCard.name}
          </span>
          <span lang="hi" style={{ fontFamily: 'var(--font-devanagari),var(--font-inter),sans-serif', fontSize: capText, lineHeight: 1.4, color: HOUSE_70 }}>
            {captionCard.hi}
          </span>
          {captionCard.kind === 'scheme' && (
            <span style={{ fontFamily: INTER, fontSize: capText, lineHeight: 1.4, color: HOUSE_70, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{captionCard.line}</span>
          )}
        </div>
      ) : (
        <span style={{ fontFamily: INTER, fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: HOUSE_55, marginTop: 8 }}>
          Six of the 75 · pick one up to read it
        </span>
      )}
    </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HowToPlayPanel — the five steps, all visible, no carousel. Reads in one glance, needs no
// pause control, and the first thing anyone sees is step one.
// ─────────────────────────────────────────────────────────────
function HowToPlayPanel() {
  return (
    <aside
      aria-labelledby="htp-heading"
      style={{
        width: '100%',
        background: 'rgba(250,248,240,.025)',
        border: `1px solid ${HAIRLINE}`,
        borderRadius: 18,
        padding: 'clamp(16px, 1.6vw, 22px) clamp(14px, 1.4vw, 20px)',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
        height: '100%',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 'clamp(10px, 1.2vh, 16px)' }}>
        <h2 id="htp-heading" style={{ fontFamily: INTER, fontWeight: 600, fontSize: 'clamp(11px, 0.85vw, 12px)', color: HOUSE_70, letterSpacing: '0.22em', textTransform: 'uppercase', margin: 0 }}>
          How to play
        </h2>
        <a
          href="/how-to-play"
          style={{ fontFamily: INTER, fontWeight: 500, fontSize: 'clamp(11px, 0.85vw, 12px)', color: '#FF9933', letterSpacing: '0.08em', textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 0' }}
        >
          Full rules →
        </a>
      </div>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.1vh, 14px)', flex: 1, justifyContent: 'space-evenly' }}>
        {HTP_STEPS.map((s) => (
          <li key={s.num} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', columnGap: 10, alignItems: 'start' }}>
            <span aria-hidden="true" style={{ fontFamily: INTER, fontWeight: 600, fontSize: 'clamp(11px, 0.8vw, 12px)', letterSpacing: '0.12em', color: '#FF9933', paddingTop: 2 }}>
              {s.num}
            </span>
            <div>
              <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 'clamp(14px, 1.05vw, 16px)', lineHeight: 1.2, letterSpacing: '-0.005em', color: '#fff', marginBottom: 4 }}>
                {s.title}
              </div>
              <div style={{ fontFamily: INTER, fontWeight: 400, fontSize: 'clamp(12px, 0.9vw, 13px)', lineHeight: 1.5, color: HOUSE_70 }}>
                {s.body}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// Full-page landing layout — fully responsive, no fixed canvas
// ─────────────────────────────────────────────────────────────
function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = (searchParams.get('code') ?? '').toUpperCase().slice(0, 4);
  const [musicOn, setMusicOn] = useState(false);
  const [hosting, setHosting] = useState(false);
  // Brand intro: covers the page from first paint. The redirect effect below decides where to
  // go *after* the intro (so a returning player still sees it, then lands in /room).
  const [showIntro, setShowIntro] = useState(true);
  // First visit on a device plays the full film; return visits get the short logo sting.
  const [introVariant, setIntroVariant] = useState<IntroVariant>('full');
  const hostBtnRef = useRef<HTMLButtonElement>(null);
  const pendingRedirect = useRef<string | null>(null);
  // Focus lands on Host a Game only after React has lifted `inert` from the page (the main is
  // inert while the curtain is up, and an inert subtree ignores focus()).
  const [focusHost, setFocusHost] = useState(false);
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
    else setFocusHost(true);
  }, [router, initialCode]);
  useEffect(() => {
    if (!focusHost || showIntro) return;
    hostBtnRef.current?.focus({ preventScroll: true });
    setFocusHost(false);
  }, [focusHost, showIntro]);
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
  // (rounds, timer) live in the lobby's host controls, so there's no separate setup page —
  // hosting is one click.
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
    if (hasSeenIntro()) setIntroVariant('sting');
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

  // Entry buttons: the system's 52px ticket-sharp CTA (DESIGN.md `button-entry`).
  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    height: 52,
    padding: '0 24px',
    width: 'auto',
    borderRadius: 6, border: '1.5px solid transparent',
    fontFamily: INTER,
    fontWeight: 600, fontSize: 13,
    letterSpacing: '0.14em', textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'transform .15s ease, background .15s ease, box-shadow .15s ease, border-color .15s ease, opacity .15s ease',
  };
  const btnFilled: React.CSSProperties = { ...btnBase, background: '#FF9933', color: '#1a1208', borderColor: '#FF9933' };
  const btnGhost: React.CSSProperties = { ...btnBase, background: 'transparent', color: '#FF9933', borderColor: '#FF9933' };
  const hostLabel = hosting ? 'Creating…' : 'Host a Game';

  // Shared background layers (dark base, saffron spotlight, film grain) used by both layouts.
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

  const musicToggle = (size: number) => (
    <button
      onClick={() => { const next = getLobbyMusic().toggle(); setMusicOn(next); }}
      aria-label={musicOn ? 'Turn off music' : 'Turn on music'}
      aria-pressed={musicOn}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: musicOn ? 'rgba(255,153,51,0.85)' : HOUSE_55,
        padding: 0, lineHeight: 1,
        transition: 'color .15s ease',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4z" />
        {musicOn ? <><path d="M16.5 9a4.5 4.5 0 0 1 0 6" /><path d="M19 6.5a8 8 0 0 1 0 11" /></> : <path d="M17 9.5l5 5M22 9.5l-5 5" />}
      </svg>
    </button>
  );

  // ── Mobile: a stacked column. Players are on phones, so Join is the filled action here,
  //    and the pair sits in the lower half where a thumb lands. ────────────────────────
  if (isMobile) {
    return (
      <div style={{ position: 'relative', minHeight: '100dvh', width: '100%', background: '#08070f', overflowX: 'hidden', isolation: 'isolate' }}>
        {showIntro && <IntroAnimation variant={introVariant} onDone={dismissIntro} />}
        {backdrop}
        <main inert={showIntro} style={{
          position: 'relative', zIndex: 3, minHeight: '100dvh',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'clamp(20px,4vh,32px)', padding: 'clamp(28px,6vh,48px) 16px 16px', boxSizing: 'border-box',
        }}>
          {/* Lockup */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: INTER, fontWeight: 500, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: HOUSE_70 }}>
              {ATTRIBUTION}
            </div>
            <div onClick={handleLogoClick}>
              <h1 style={{ fontFamily: 'var(--font-yatra),var(--font-bebas),sans-serif', fontWeight: 400, fontSize: 'clamp(56px,18vw,84px)', lineHeight: 0.9, color: '#fff', margin: 0 }}>
                Vikas 75
              </h1>
            </div>
            <div style={{ fontFamily: INTER, fontWeight: 500, fontSize: 'clamp(15px,4.5vw,20px)', color: '#FF9933', lineHeight: 1.35 }}>
              {TAGLINE}
            </div>
          </div>

          {/* The three lines that matter */}
          <ul aria-label="How it works" style={{ listStyle: 'none', margin: 0, padding: 0, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOBILE_RULES.map((line, i) => (
              <li key={i} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', columnGap: 10, alignItems: 'baseline' }}>
                <span aria-hidden="true" style={{ fontFamily: INTER, fontWeight: 600, fontSize: 10, letterSpacing: '0.12em', color: '#FF9933' }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ fontFamily: INTER, fontSize: 14, lineHeight: 1.45, color: HOUSE_70 }}>{line}</span>
              </li>
            ))}
          </ul>

          {/* CTAs — pushed into the lower half */}
          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 'auto' }}>
            <button style={{ ...btnFilled, width: '100%' }} onClick={() => router.push('/join')}>
              Join a Game
            </button>
            <button
              ref={hostBtnRef}
              style={{ ...btnGhost, width: '100%', opacity: hosting ? 0.6 : 1 }}
              onClick={handleHostGame}
              disabled={hosting}
              aria-busy={hosting}
            >
              {hostLabel}
            </button>
            <a href="/how-to-play" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, fontFamily: INTER, fontSize: 13, letterSpacing: '0.06em', color: HOUSE_70, textDecoration: 'none' }}>
              How to play →
            </a>
          </div>

          {/* Footer */}
          <footer style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 8, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  style={{ color: 'rgba(250,248,240,.6)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44 }}>
                  <Icon />
                </a>
              ))}
              {musicToggle(18)}
            </div>
            <a href="/explore" style={{ display: 'flex', alignItems: 'center', minHeight: 44, fontFamily: INTER, fontSize: 12, letterSpacing: '0.06em', color: HOUSE_55, textDecoration: 'none' }}>
              Curious what&apos;s in the deck? →
            </a>
            <div style={{ fontFamily: INTER, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: HOUSE_55 }}>
              © 2026 · Vikas 75 · all rounds reserved
            </div>
          </footer>
        </main>
      </div>
    );
  }

  return (
    /* Outer container — fills the viewport; scrolls vertically only if the content can't fit
       (e.g. a short laptop viewport), instead of hard-clipping the grid. */
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', overflowX: 'hidden', isolation: 'isolate' }}>
      {showIntro && <IntroAnimation variant={introVariant} onDone={dismissIntro} />}
      {backdrop}

      {/* 3-column grid; inert while the intro curtain is up so Tab cannot slip behind it */}
      <main inert={showIntro} style={{
        position: 'relative', zIndex: 3,
        width: '100%', minHeight: '100%',
        padding: 'clamp(20px, 3.5vh, 48px) clamp(24px, 3.5vw, 56px) clamp(14px, 2.2vh, 30px)',
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 21vw) 1fr minmax(240px, 24vw)',
        gridTemplateRows: '1fr auto',
        gap: '0 clamp(12px, 1.8vw, 24px)',
        alignItems: 'stretch',
        boxSizing: 'border-box',
      }}>

        {/* ── LEFT: logo + CTAs ─────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 5, alignItems: 'flex-start' }}>
          {/* Shared width wrapper — logo and buttons size together */}
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 18, width: 'fit-content', minWidth: 220 }}>
          {/* Logo unit with saffron left bar */}
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: 16, alignItems: 'stretch' }}>
            <div style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 2, background: '#FF9933' }} />
            <div style={{
              fontFamily: INTER, fontWeight: 500,
              fontSize: 'clamp(10px, 0.68vw, 11px)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: HOUSE_70, lineHeight: 1.4,
              marginBottom: 12, whiteSpace: 'nowrap',
            }}>
              {ATTRIBUTION}
            </div>
            <div onClick={handleLogoClick} style={{ textAlign: 'left' }}>
              <h1 style={{
                fontFamily: 'var(--font-yatra),var(--font-bebas),sans-serif',
                fontWeight: 400,
                fontSize: 'clamp(44px, 5.5vw, 78px)',
                lineHeight: 0.9,
                letterSpacing: '-0.01em', color: '#fff',
                margin: 0, whiteSpace: 'nowrap',
              }}>
                Vikas 75
              </h1>
            </div>
            <div style={{
              fontFamily: INTER,
              fontWeight: 500,
              fontSize: 'clamp(13px, 1.3vw, 19px)',
              lineHeight: 1.35,
              color: '#FF9933', letterSpacing: '-0.005em',
              marginTop: 12, whiteSpace: 'nowrap',
            }}>
              {TAGLINE}
            </div>
            <p style={{
              fontFamily: 'var(--font-bebas),sans-serif', fontSize: 'clamp(18px, 1.5vw, 26px)',
              lineHeight: 1.1, letterSpacing: '0.06em', color: HOUSE_70,
              margin: '14px 0 0', maxWidth: 'min(300px, 22vw)',
            }}>
              {PREMISE}
            </p>
            <p lang="hi" style={{
              fontFamily: 'var(--font-devanagari),var(--font-inter),sans-serif', fontSize: 'clamp(12px, 0.95vw, 14px)',
              lineHeight: 1.4, color: HOUSE_55, margin: '6px 0 0', maxWidth: 'min(300px, 22vw)',
            }}>
              {PREMISE_HI}
            </p>
          </div>

          {/* CTA buttons — width: 100% stretches to match logo above */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              ref={hostBtnRef}
              style={{ ...btnFilled, width: '100%', opacity: hosting ? 0.6 : 1 }}
              onMouseEnter={e => { if (hosting) return; const b = e.currentTarget as HTMLButtonElement; b.style.background = '#e8872a'; b.style.borderColor = '#e8872a'; b.style.transform = 'translateY(-1px)'; b.style.boxShadow = '0 6px 24px rgba(255,153,51,.32)'; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#FF9933'; b.style.borderColor = '#FF9933'; b.style.transform = ''; b.style.boxShadow = ''; }}
              onClick={handleHostGame}
              disabled={hosting}
              aria-busy={hosting}
            >
              {hostLabel}
            </button>
            <button
              style={{ ...btnGhost, width: '100%' }}
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
          <HeroFan active={!showIntro} />
        </div>

        {/* ── RIGHT: How To Play ───────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', zIndex: 5 }}>
          <HowToPlayPanel />
        </div>

        {/* ── BOTTOM STRIP ────────────────────────────────────── */}
        <footer style={{
          gridColumn: '1 / -1',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 10, paddingTop: 8,
          borderTop: `1px solid ${HAIRLINE}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                style={{ color: 'rgba(250,248,240,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, fontSize: 'clamp(14px, 1.25vw, 18px)', transition: 'color .15s ease' }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#FF9933'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,248,240,.6)'}
              >
                <Icon />
              </a>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="/explore" style={{
              fontFamily: INTER,
              fontSize: 'clamp(11px, 0.8vw, 12px)',
              fontWeight: 500, letterSpacing: '0.06em',
              color: HOUSE_55,
              textDecoration: 'none',
              transition: 'color .15s',
              whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', minHeight: 44,
            }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#FF9933'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = HOUSE_55}
            >
              Curious what&apos;s in the deck? →
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {musicToggle(16)}
            <div style={{ fontFamily: INTER, fontSize: 'clamp(11px, 0.8vw, 12px)', letterSpacing: '0.12em', textTransform: 'uppercase', color: HOUSE_55 }}>
              © 2026 · Vikas 75 · all rounds reserved
            </div>
          </div>
        </footer>
      </main>
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
