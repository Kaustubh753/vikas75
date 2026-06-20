'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { FaGlobe, FaInstagram, FaXTwitter, FaLinkedin, FaFacebook, FaYoutube } from 'react-icons/fa6';
import { getLobbyMusic } from '@/lib/music-manager';
import type { AvatarId } from '@/types/game';
import AvatarPicker from '@/components/ui/AvatarPicker';

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
// How To Play steps
// ─────────────────────────────────────────────────────────────
const HTP_STEPS = [
  { num: '01', title: 'Get a room.',         body: "Host a game, share the four-letter code with friends. They'll show up. They always do." },
  { num: '02', title: 'A challenge drops.',  body: "A real-sounding problem statement appears. It will sound serious. It won't be." },
  { num: '03', title: 'Play your scheme.',   body: "You're dealt four absurd policy proposals. Pick the one you can sell with a straight face." },
  { num: '04', title: 'Convince the judge.', body: 'Sixty seconds to defend it. Logic optional. Conviction mandatory.' },
  { num: '05', title: 'Funniest wins.',      body: 'Not the most correct. The most creative. Five rounds, one winner, eternal bragging rights.' },
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
// HowToPlay — horizontal carousel with in-panel arrows + dot nav
// ─────────────────────────────────────────────────────────────
function HowToPlay() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = HTP_STEPS.length;
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setStep(s => (s + 1) % total), 5200);
    return () => clearTimeout(t);
  }, [step, paused, total]);

  // Clean up pause timer on unmount
  useEffect(() => () => { if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current); }, []);

  const goTo = useCallback((i: number) => {
    setStep(i);
    setPaused(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => setPaused(false), 6500);
  }, []);

  const prev = () => goTo((step - 1 + total) % total);
  const next = () => goTo((step + 1) % total);

  const arrowBtn = (dir: 'prev' | 'next', onClick: () => void) => (
    <button
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous' : 'Next'}
      style={{
        position: 'absolute',
        [dir === 'prev' ? 'left' : 'right']: 6,
        top: '50%', transform: 'translateY(-50%)',
        width: 32, height: 32, borderRadius: 6,
        background: 'rgba(255,153,51,0.08)',
        border: '1px solid rgba(255,153,51,0.28)',
        color: 'rgba(255,153,51,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 10,
        transition: 'background .15s, border-color .15s, color .15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = 'rgba(255,153,51,0.18)';
        b.style.borderColor = '#FF9933';
        b.style.color = '#FF9933';
      }}
      onMouseLeave={e => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = 'rgba(255,153,51,0.08)';
        b.style.borderColor = 'rgba(255,153,51,0.28)';
        b.style.color = 'rgba(255,153,51,0.85)';
      }}
    >
      {dir === 'prev'
        ? <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      }
    </button>
  );

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        width: '100%',
        background: 'linear-gradient(180deg,rgba(255,153,51,.05) 0%,rgba(255,153,51,0) 22%),linear-gradient(180deg,rgba(5,11,28,.85) 0%,rgba(2,6,18,.9) 100%)',
        border: '1px solid rgba(255,153,51,.22)',
        borderRadius: 12,
        padding: 'clamp(16px, 1.5vw, 22px) clamp(12px, 1.2vw, 18px)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 48px rgba(0,0,0,.45),0 6px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,153,51,.18),inset 0 0 0 1px rgba(255,255,255,.02)',
        backdropFilter: 'blur(8px)',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-inter),sans-serif', fontWeight: 500, fontSize: 'clamp(8px, 0.76vw, 11px)', color: 'rgba(250,248,240,.7)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          How to play
        </div>
        <div style={{ fontFamily: 'var(--font-inter),sans-serif', fontWeight: 500, fontSize: 'clamp(8px, 0.76vw, 11px)', color: '#FF9933', letterSpacing: '0.14em' }}>
          {String(step + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>
      </div>

      {/* Carousel body */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 200 }}>
        {/* Prev / Next arrows — overlaid on the slide content */}
        {arrowBtn('prev', prev)}
        {arrowBtn('next', next)}

        {/* Slide track — all slides in a flex row, translate to show current */}
        <div style={{
          display: 'flex',
          height: '100%',
          transform: `translateX(calc(-${step} * 100%))`,
          transition: 'transform .42s cubic-bezier(.4,0,.2,1)',
        }}>
          {HTP_STEPS.map((s, i) => (
            <div key={i} style={{
              flexShrink: 0, width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column', gap: 12,
              // inset horizontal padding keeps text clear of the arrow buttons
              padding: '4px 44px 0',
            }}>
              <div style={{
                fontFamily: 'var(--font-yatra),var(--font-inter),sans-serif',
                fontSize: 'clamp(26px, 3vw, 44px)', lineHeight: 1, color: '#FF9933', letterSpacing: '-0.01em',
              }}>
                {s.num}
              </div>
              <div style={{
                fontFamily: 'var(--font-inter),sans-serif',
                fontWeight: 700, fontSize: 'clamp(12px, 1.3vw, 19px)', lineHeight: 1.15,
                letterSpacing: '-0.005em', color: '#fff',
              }}>
                {s.title}
              </div>
              <div style={{
                fontFamily: 'var(--font-inter),sans-serif',
                fontWeight: 400, fontSize: 'clamp(10px, 0.88vw, 13px)', lineHeight: 1.6,
                color: 'rgba(250,248,240,.7)',
              }}>
                {s.body}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dot nav — centred, each dot navigates directly to that slide */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(250,248,240,.14)' }}>
        {HTP_STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to step ${i + 1}`}
            style={{
              width: i === step ? 20 : 8,
              height: 8,
              borderRadius: i === step ? 4 : '50%',
              background: i === step ? '#FF9933' : 'rgba(250,248,240,.22)',
              border: 'none', padding: 0, cursor: 'pointer',
              transition: 'background .2s ease, width .28s cubic-bezier(.4,0,.2,1)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// JoinForm — collapsible, wired to real game API
// ─────────────────────────────────────────────────────────────
function JoinForm({ open, initialCode, onClose }: { open: boolean; initialCode: string; onClose: () => void }) {
  const router = useRouter();
  const [name, setName]     = useState('');
  const [code, setCode]     = useState(initialCode);
  const [avatarId, setAvatarId] = useState<AvatarId>('a1');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const nameRef             = useRef<HTMLInputElement>(null);
  const slotsRef            = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { if (open) setTimeout(() => nameRef.current?.focus(), 350); }, [open]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmedCode = code.replace(/\s/g, '');
    if (!name.trim() || trimmedCode.length !== 4) return;
    setLoading(true); setError('');
    const playerId = crypto.randomUUID();
    try {
      const res = await fetch('/api/game', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', code: trimmedCode, playerId, playerName: name.trim(), avatarId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not join room'); setLoading(false); return; }
      // If the server reclaimed a disconnected seat with this name, adopt that seat's id
      // so our localStorage identity points at the restored player (score/hand preserved).
      const effectiveId = data.reclaimedPlayerId || playerId;
      localStorage.setItem('vikas75_playerId',  effectiveId);
      localStorage.setItem('vikas75_playerName', name.trim());
      localStorage.setItem('vikas75_avatarId',   avatarId);
      localStorage.setItem('vikas75_roomCode',   trimmedCode);
      // Cache the player's hand from the join response so PlayerView has it immediately
      // (the GET endpoint will also return it via ?me=pid, but caching avoids a round-trip flash)
      try {
        const myHand = data.room?.players?.[effectiveId]?.hand;
        if (Array.isArray(myHand) && myHand.length) {
          localStorage.setItem(`vikas75_hand_${trimmedCode}`, JSON.stringify(myHand));
        }
      } catch { /* ignore */ }
      router.push(`/room/${trimmedCode}`);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  const baseSlot: React.CSSProperties = {
    width: 44, height: 52,
    background: 'rgba(250,248,240,.04)',
    border: '1px solid rgba(250,248,240,.14)',
    borderRadius: 4, color: '#fff',
    fontFamily: 'var(--font-inter),sans-serif', fontWeight: 600, fontSize: 22,
    textAlign: 'center', textTransform: 'uppercase', outline: 'none',
    transition: 'border-color .12s ease',
  };

  return (
    <div style={{
      maxWidth: 380, overflow: 'hidden',
      display: 'grid',
      gridTemplateRows: open ? '1fr' : '0fr',
      transition: 'grid-template-rows .35s cubic-bezier(.6,0,.3,1), opacity .25s ease, margin-top .25s ease',
      marginTop: open ? 4 : 0,
      opacity: open ? 1 : 0,
    }}>
      <div style={{ minHeight: 0 }}>
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          <input
            ref={nameRef}
            style={{
              height: 44, background: 'rgba(250,248,240,.04)',
              border: '1px solid rgba(250,248,240,.14)', borderRadius: 4,
              padding: '0 14px', color: '#fff',
              fontFamily: 'var(--font-inter),sans-serif', fontSize: 14,
              outline: 'none', width: '100%',
              transition: 'border-color .12s ease',
            }}
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20} autoComplete="off"
            onFocus={e => (e.target.style.borderColor = '#FF9933')}
            onBlur={e => (e.target.style.borderColor = 'rgba(250,248,240,.14)')}
          />

          {/* OTP code slots */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1, 2, 3].map(i => (
              <input
                key={i}
                ref={el => { slotsRef.current[i] = el; }}
                style={{ ...baseSlot, borderColor: code[i] ? '#FF9933' : 'rgba(250,248,240,.14)' }}
                value={code[i] ?? ''}
                maxLength={1} inputMode="text"
                aria-label={`Room code character ${i + 1}`}
                onChange={e => {
                  // Exclude I and O — generateRoomCode never produces them (too similar to 1 and 0)
                  const ch = e.target.value.slice(-1).toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '');
                  // Maintain full 4-slot array so editing slot i never collapses other slots
                  const arr = [code[0] ?? '', code[1] ?? '', code[2] ?? '', code[3] ?? ''];
                  arr[i] = ch;
                  setCode(arr.join(''));
                  if (ch) slotsRef.current[i + 1]?.focus();
                }}
                onKeyDown={e => {
                  if (e.key === 'Backspace' && !code[i] && i > 0) slotsRef.current[i - 1]?.focus();
                }}
                onFocus={e => (e.target.style.borderColor = '#FF9933')}
                onBlur={e => (e.target.style.borderColor = code[i] ? '#FF9933' : 'rgba(250,248,240,.14)')}
              />
            ))}
          </div>

          <AvatarPicker value={avatarId} onChange={setAvatarId} disabled={loading} />

          {error && <div style={{ color: '#f87171', fontSize: 13, fontFamily: 'var(--font-inter),sans-serif' }}>{error}</div>}

          <button
            type="submit"
            disabled={loading || !name.trim() || code.length !== 4}
            style={{
              height: 44, padding: '0 18px',
              background: '#FF9933', color: '#1a1208',
              border: '1.5px solid #FF9933', borderRadius: 6,
              fontFamily: 'var(--font-inter),sans-serif', fontWeight: 600,
              fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: 'pointer', opacity: (loading || !name.trim() || code.length !== 4) ? 0.45 : 1,
              transition: 'opacity .15s ease',
            }}
          >
            {loading ? 'Joining…' : 'Join'}
          </button>

          <button
            type="button" onClick={onClose}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(250,248,240,.55)',
              fontFamily: 'var(--font-inter),sans-serif', fontSize: 12,
              cursor: 'pointer', textAlign: 'left',
              letterSpacing: '0.04em',
              transition: 'color .15s ease',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(250,248,240,.85)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(250,248,240,.55)'}
          >
            ← back
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Full-page landing layout — fully responsive, no fixed canvas
// ─────────────────────────────────────────────────────────────
function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = (searchParams.get('code') ?? '').toUpperCase().slice(0, 4);
  const [joinOpen, setJoinOpen] = useState(Boolean(initialCode));
  const [musicOn, setMusicOn] = useState(false);

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
    if (initialCode) return;
    const pid  = localStorage.getItem('vikas75_playerId');
    const pname = localStorage.getItem('vikas75_playerName');
    const avid = localStorage.getItem('vikas75_avatarId');
    const rc   = localStorage.getItem('vikas75_roomCode');
    if (pid && pname && avid && rc) router.replace(`/room/${rc}`);
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

  return (
    /* Outer container — fills viewport, no scrollbars */
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', isolation: 'isolate' }}>

      {/* Dark background */}
      <div style={{ position: 'absolute', inset: 0, background: '#07101f', zIndex: 0 }} />

      {/* Warm saffron radial-gradient light from top */}
      <div style={{
        position: 'absolute', left: '50%', top: '-25%',
        width: '83vw', height: '100vh',
        transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse at center,rgba(255,153,51,.16) 0%,rgba(255,153,51,.06) 28%,rgba(255,153,51,0) 60%)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Film grain SVG overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        opacity: 0.12, mixBlendMode: 'overlay', pointerEvents: 'none', zIndex: 2,
      }} />

      {/* 3-column grid */}
      <div style={{
        position: 'relative', zIndex: 3,
        width: '100%', height: '100%',
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
          {/* Logo unit with saffron left bar */}
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: 16, alignItems: 'stretch' }}>
            <div style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 2, background: '#FF9933' }} />
            <div style={{
              fontFamily: 'var(--font-inter),sans-serif', fontWeight: 500,
              fontSize: 'clamp(8px, 0.68vw, 10px)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'rgba(250,248,240,.7)', lineHeight: 1.4,
              marginBottom: 12, whiteSpace: 'nowrap',
            }}>
              An initiative of the Office of Shri Sujeet Kumar
            </div>
            <button onClick={handleLogoClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
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
            </button>
            <div style={{
              fontFamily: 'var(--font-inter),sans-serif',
              fontWeight: 400,
              fontSize: 'clamp(12px, 1.3vw, 19px)',
              lineHeight: 1.35,
              color: '#FF9933', letterSpacing: '-0.005em',
              marginTop: 12, whiteSpace: 'nowrap',
            }}>
              The best answer isn&apos;t always right
            </div>

          </div>

          {/* CTA buttons — width: 100% stretches to match logo above */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              style={{ ...btnBase, width: '100%', background: '#FF9933', color: '#1a1208', borderColor: '#FF9933' }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#e6862b'; b.style.transform = 'translateY(-1px)'; b.style.boxShadow = '0 6px 24px rgba(255,153,51,.32)'; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#FF9933'; b.style.transform = ''; b.style.boxShadow = ''; }}
              onClick={() => router.push('/host/setup')}
            >
              Host a Game
            </button>
            <button
              style={{ ...btnBase, width: '100%', background: joinOpen ? 'rgba(255,153,51,.12)' : 'transparent', color: '#FF9933', borderColor: '#FF9933' }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; if (!joinOpen) b.style.background = 'rgba(255,153,51,.08)'; b.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = joinOpen ? 'rgba(255,153,51,.12)' : 'transparent'; b.style.transform = ''; }}
              onClick={() => setJoinOpen(o => !o)}
            >
              Join a Game
            </button>
            <JoinForm open={joinOpen} initialCode={initialCode} onClose={() => setJoinOpen(false)} />
          </div>
          </div>{/* end shared width wrapper */}
        </div>

        {/* ── CENTER: card fan ─────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'visible', zIndex: 1 }}>
          <HeroFan />
        </div>

        {/* ── RIGHT: How To Play ───────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', zIndex: 5 }}>
          <HowToPlay />
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
              © 2026 · Vikas 75 · all rounds reserved
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
    <Suspense fallback={<div style={{ background: '#07101f', position: 'fixed', inset: 0 }} />}>
      <LandingPage />
    </Suspense>
  );
}
