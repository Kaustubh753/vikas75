'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { FaGlobe, FaInstagram, FaXTwitter, FaLinkedin, FaFacebook, FaYoutube } from 'react-icons/fa6';
import type { AvatarId } from '@/types/game';
import AvatarPicker from '@/components/ui/AvatarPicker';
import CodeInput from '@/components/ui/CodeInput';

// ─────────────────────────────────────────────────────────────
// Card data — real game card images
// ─────────────────────────────────────────────────────────────
const CARDS = [
  { src: '/cards/card-076.webp', kind: 'challenge' as const, id: 'challenge' },   // c001
  { src: '/cards/card-001.webp', kind: 'scheme' as const,    id: 'jan-dhan' },    // s001
  { src: '/cards/card-003.webp', kind: 'scheme' as const,    id: 'make-in-india' }, // s003
  { src: '/cards/card-002.webp', kind: 'scheme' as const,    id: 'skill-india' }, // s002
  { src: '/cards/card-004.webp', kind: 'scheme' as const,    id: 'swachh-bharat' }, // s004
  { src: '/cards/card-007.webp', kind: 'scheme' as const,    id: 'indradhanush' }, // s007
];

// ─────────────────────────────────────────────────────────────
// How To Play steps
// ─────────────────────────────────────────────────────────────
const HTP_STEPS = [
  { num: '01', title: 'Get a room.',        body: "Host a game, share the four-letter code with friends. They'll show up. They always do." },
  { num: '02', title: 'A challenge drops.', body: "A real-sounding problem statement appears. It will sound serious. It won't be." },
  { num: '03', title: 'Play your scheme.',  body: "You're dealt four absurd policy proposals. Pick the one you can sell with a straight face." },
  { num: '04', title: 'Convince the judge.', body: 'Sixty seconds to defend it. Logic optional. Conviction mandatory.' },
  { num: '05', title: 'Funniest wins.',     body: 'Not the most correct. The most creative. Five rounds, one winner, eternal bragging rights.' },
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
// Card visual-state helpers
// ─────────────────────────────────────────────────────────────
const CHL_Y  = -210;
const HAND_Y = 180;

type CardState = {
  x: number; y: number; r: number; s: number;
  status: string; pivot: 'center' | 'bottom'; clickable: boolean;
};

function getCardState(
  idx: number,
  dealt: Set<string>,
  picked: { id: string; stage: 'selected' | 'played' } | null,
  hoverId: string | null,
): CardState {
  const card = CARDS[idx];
  const isChl = card.kind === 'challenge';
  const t = (idx - 1) - 2; // –2 … +2 for the 5 scheme slots

  if (!dealt.has(card.id))
    return isChl
      ? { x: 0,      y: 900, r: -3,    s: 0.9,  status: '', pivot: 'center', clickable: false }
      : { x: t * 30, y: 900, r: t * 6, s: 0.85, status: '', pivot: 'bottom', clickable: false };

  if (isChl)
    return picked?.stage === 'played'
      ? { x: 0, y: CHL_Y, r: -1.5, s: 0.88, status: 'is-dim',  pivot: 'center', clickable: false }
      : { x: 0, y: CHL_Y, r: -1.5, s: 0.95, status: '',        pivot: 'center', clickable: false };

  const isPicked    = picked?.id === card.id;
  const otherPlayed = !!picked && picked.id !== card.id && picked.stage === 'played';
  const hovered     = hoverId === card.id && !picked;

  if (isPicked)
    return picked!.stage === 'selected'
      ? { x: t * 50, y: HAND_Y - 95, r: t * 3, s: 1.02, status: 'is-front',  pivot: 'bottom', clickable: true }
      : { x: 0,      y: 30,          r: 0,      s: 1.1,  status: 'is-winner', pivot: 'center', clickable: false };

  if (otherPlayed)
    return { x: t * 115, y: HAND_Y + 60, r: t * 9, s: 0.74, status: 'is-dim', pivot: 'bottom', clickable: false };

  return {
    x: t * 72,
    y: HAND_Y + Math.abs(t) * 6 + (hovered ? -22 : 0),
    r: t * 8.5,
    s: 0.92 + (hovered ? 0.02 : 0),
    status: hovered ? 'is-hover' : '',
    pivot: 'bottom',
    clickable: true,
  };
}

function cardFilter(status: string) {
  if (status === 'is-front')  return 'drop-shadow(0 0 22px rgba(255,153,51,.28)) drop-shadow(0 -4px 12px rgba(255,153,51,.18)) drop-shadow(0 36px 44px rgba(0,0,0,.55)) drop-shadow(0 10px 18px rgba(0,0,0,.45))';
  if (status === 'is-dim')    return 'drop-shadow(0 18px 24px rgba(0,0,0,.6)) brightness(0.42) saturate(0.55)';
  if (status === 'is-hover')  return 'drop-shadow(0 0 18px rgba(255,215,0,.4)) drop-shadow(0 26px 32px rgba(0,0,0,.55)) drop-shadow(0 8px 14px rgba(0,0,0,.45))';
  if (status === 'is-winner') return 'drop-shadow(0 0 24px rgba(255,215,0,.65)) drop-shadow(0 0 60px rgba(255,215,0,.35)) drop-shadow(0 30px 40px rgba(0,0,0,.5))';
  return 'drop-shadow(0 28px 36px rgba(0,0,0,.55)) drop-shadow(0 8px 14px rgba(0,0,0,.45))';
}

// ─────────────────────────────────────────────────────────────
// ScaledStage — scales a 1440×900 canvas to fit any viewport
// ─────────────────────────────────────────────────────────────
function ScaledStage({ children }: { children: React.ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const fit = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const s = Math.min(window.innerWidth / 1440, window.innerHeight / 900);
    el.style.transform = `scale(${s})`;
  }, []);
  useEffect(() => {
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [fit]);
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      <div
        ref={stageRef}
        style={{
          width: 1440,
          height: 900,
          position: 'relative',
          background: '#07101f',
          overflow: 'hidden',
          transformOrigin: 'center center',
          isolation: 'isolate',
        }}
      >
        {/* Warm saffron key light from top */}
        <div style={{
          position: 'absolute', left: '50%', top: -360,
          width: 1200, height: 900,
          transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse at center, rgba(255,153,51,0.16) 0%, rgba(255,153,51,0.06) 28%, rgba(255,153,51,0) 60%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
        {/* Film grain */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
          opacity: 0.12,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
          zIndex: 1,
        }} />
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HeroFan — interactive card stage
// ─────────────────────────────────────────────────────────────
function HeroFan() {
  const [dealt, setDealt] = useState<Set<string>>(() => new Set());
  const [picked, setPicked] = useState<{ id: string; stage: 'selected' | 'played' } | null>(null);
  const [hoverId, setHover] = useState<string | null>(null);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setDealt(s => new Set([...s, 'challenge'])), 400));
    ['skill-india', 'make-in-india', 'jan-dhan', 'swachh-bharat', 'indradhanush'].forEach((id, i) => {
      timers.push(setTimeout(() => setDealt(s => new Set([...s, id])), 1300 + i * 120));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleClick = (cardId: string) => {
    const card = CARDS.find(c => c.id === cardId);
    if (!card || card.kind !== 'scheme' || !dealt.has(cardId)) return;
    setPicked(prev => {
      if (!prev || prev.id !== cardId) return { id: cardId, stage: 'selected' };
      if (prev.stage === 'selected')   return { id: cardId, stage: 'played' };
      return prev;
    });
    setHover(null);
  };

  const showResetHint = !!picked && picked.stage === 'played';
  const showPlayHint  = !!picked && picked.stage === 'selected';

  return (
    <div style={{ position: 'relative', width: 720, height: 820, overflow: 'visible' }}>
      {/* Focal glow */}
      <div style={{
        position: 'absolute', left: '50%', top: 70,
        width: 520, height: 460,
        transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse at center, rgba(255,153,51,0.14) 0%, rgba(255,215,0,0.06) 30%, rgba(255,153,51,0) 60%)',
        pointerEvents: 'none',
        zIndex: 0,
        filter: 'blur(2px)',
      }} />

      {CARDS.map((card, idx) => {
        const st = getCardState(idx, dealt, picked, hoverId);
        const tf = `translate(-50%, -50%) translate(${st.x}px, ${st.y}px) rotate(${st.r}deg) scale(${st.s})`;
        const zIndex = st.status === 'is-front' || st.status === 'is-winner' ? 50 : 10 + idx;
        return (
          <div
            key={card.id}
            onClick={() => st.clickable && handleClick(card.id)}
            onMouseEnter={() => st.clickable && setHover(card.id)}
            onMouseLeave={() => setHover(null)}
            style={{
              position: 'absolute',
              left: '50%', top: '50%',
              width: 296, height: 397,
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
              src={card.src}
              alt=""
              draggable={false}
              style={{ width: '100%', height: '100%', display: 'block', borderRadius: 16, objectFit: 'cover' }}
            />
          </div>
        );
      })}

      {/* Tap-again hint */}
      <div style={{
        position: 'absolute', left: '50%', bottom: 175,
        transform: 'translateX(-50%)',
        textAlign: 'center',
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: 11, fontWeight: 500,
        letterSpacing: '0.14em',
        color: 'rgba(255,153,51,0.7)',
        opacity: showPlayHint ? 1 : 0,
        transition: 'opacity .4s ease',
        pointerEvents: 'none',
        zIndex: 60,
      }}>
        <span style={{ display: 'inline-block', fontSize: 22, lineHeight: 1, color: '#FF9933', animation: 'htpBob 1.6s ease-in-out infinite' }}>↑</span>
      </div>

      {/* Reset hint */}
      <div style={{
        position: 'absolute', left: '50%', bottom: 56,
        transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        opacity: showResetHint ? 1 : 0,
        transition: 'opacity .4s ease',
        zIndex: 60,
      }}>
        <button
          onClick={() => setPicked(null)}
          style={{
            background: 'transparent', border: 'none',
            color: '#FF9933',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 12, letterSpacing: '0.16em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            padding: '4px 8px',
            borderBottom: '1px dotted #FF9933',
          }}
        >
          pick another →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HowToPlay — paginated panel
// ─────────────────────────────────────────────────────────────
function HowToPlay() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = HTP_STEPS.length;

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setStep(s => (s + 1) % total), 5200);
    return () => clearTimeout(t);
  }, [step, paused, total]);

  const goTo = (i: number) => { setStep(i); setPaused(true); setTimeout(() => setPaused(false), 6500); };

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        width: 340,
        background: 'linear-gradient(180deg, rgba(255,153,51,0.05) 0%, rgba(255,153,51,0) 22%), linear-gradient(180deg, rgba(5,11,28,0.85) 0%, rgba(2,6,18,0.9) 100%)',
        border: '1px solid rgba(255,153,51,0.22)',
        borderRadius: 12,
        padding: '28px 26px 22px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 48px rgba(0,0,0,.45), 0 6px 14px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,153,51,.18), inset 0 0 0 1px rgba(255,255,255,.02)',
        backdropFilter: 'blur(8px)',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 500, fontSize: 11, color: 'rgba(250,248,240,0.7)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          How to play
        </div>
        <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 500, fontSize: 11, color: '#FF9933', letterSpacing: '0.14em' }}>
          {String(step + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>
      </div>

      {/* Slides */}
      <div style={{ flex: 1, minHeight: 280, position: 'relative' }}>
        {HTP_STEPS.map((s, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', gap: 14,
            opacity: i === step ? 1 : 0,
            transform: i === step ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity .3s ease, transform .35s ease',
            pointerEvents: i === step ? 'auto' : 'none',
          }}>
            <div style={{ fontFamily: 'var(--font-yatra), var(--font-inter), sans-serif', fontSize: 56, lineHeight: 1, color: '#FF9933', letterSpacing: '-0.01em' }}>
              {s.num}
            </div>
            <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 700, fontSize: 24, lineHeight: 1.1, letterSpacing: '-0.005em', color: '#fff' }}>
              {s.title}
            </div>
            <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 400, fontSize: 15, lineHeight: 1.55, color: 'rgba(250,248,240,0.7)' }}>
              {s.body}
            </div>
          </div>
        ))}
      </div>

      {/* Footer — dots + nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(250,248,240,0.14)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {HTP_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Step ${i + 1}`}
              style={{
                width: i === step ? 18 : 6,
                height: 6,
                borderRadius: i === step ? 4 : '50%',
                background: i === step ? '#FF9933' : 'rgba(250,248,240,0.14)',
                border: 'none', padding: 0, cursor: 'pointer',
                transition: 'background .15s ease, width .25s ease',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['prev', 'next'] as const).map(dir => (
            <button
              key={dir}
              onClick={() => goTo(dir === 'prev' ? (step - 1 + total) % total : (step + 1) % total)}
              aria-label={dir === 'prev' ? 'Previous' : 'Next'}
              style={{
                width: 28, height: 28, borderRadius: 4,
                background: 'transparent',
                border: '1px solid rgba(250,248,240,0.14)',
                color: 'rgba(250,248,240,0.7)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border-color .15s ease, color .15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#FF9933'; (e.currentTarget as HTMLButtonElement).style.color = '#FF9933'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(250,248,240,0.14)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(250,248,240,0.7)'; }}
            >
              {dir === 'prev'
                ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              }
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// JoinForm — collapsible, wired to real game API
// ─────────────────────────────────────────────────────────────
function JoinForm({
  open,
  initialCode,
  onClose,
}: {
  open: boolean;
  initialCode: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode);
  const [avatarId, setAvatarId] = useState<AvatarId>('a1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => nameRef.current?.focus(), 350);
  }, [open]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || code.length !== 4) return;
    setLoading(true); setError('');
    const playerId = crypto.randomUUID();
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', code, playerId, playerName: name.trim(), avatarId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not join room'); setLoading(false); return; }
      localStorage.setItem('vikas75_playerId', playerId);
      localStorage.setItem('vikas75_playerName', name.trim());
      localStorage.setItem('vikas75_avatarId', avatarId);
      localStorage.setItem('vikas75_roomCode', code);
      router.push(`/room/${code}`);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    height: 44,
    background: 'rgba(250,248,240,0.04)',
    border: '1px solid rgba(250,248,240,0.14)',
    borderRadius: 4,
    padding: '0 14px',
    color: '#fff',
    fontFamily: 'var(--font-inter), sans-serif',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    transition: 'border-color .12s ease, background .12s ease',
  };

  return (
    <div style={{
      maxWidth: 380,
      overflow: 'hidden',
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
            style={inputStyle}
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
            autoComplete="off"
          />
          {/* OTP-style room code input — reuse the existing CodeInput component */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1, 2, 3].map(i => (
              <input
                key={i}
                style={{
                  width: 44, height: 52,
                  background: 'rgba(250,248,240,0.04)',
                  border: `1px solid ${code[i] ? '#FF9933' : 'rgba(250,248,240,0.14)'}`,
                  borderRadius: 4,
                  color: '#fff',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontWeight: 600,
                  fontSize: 22,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  outline: 'none',
                }}
                value={code[i] ?? ''}
                maxLength={1}
                inputMode="text"
                aria-label={`Room code character ${i + 1}`}
                onChange={e => {
                  const ch = e.target.value.slice(-1).toUpperCase().replace(/[^A-Z0-9]/g, '');
                  const next = (code + '    ').slice(0, 4).split('');
                  next[i] = ch;
                  setCode(next.join('').replace(/ /g, '').slice(0, 4));
                  if (ch) {
                    const nextEl = e.target.parentElement?.children[i + 1] as HTMLInputElement | undefined;
                    nextEl?.focus();
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Backspace' && !code[i] && i > 0) {
                    const prevEl = e.currentTarget.parentElement?.children[i - 1] as HTMLInputElement | undefined;
                    prevEl?.focus();
                  }
                }}
              />
            ))}
          </div>

          <AvatarPicker value={avatarId} onChange={setAvatarId} disabled={loading} />

          {error && (
            <div style={{ color: '#f87171', fontSize: 13, fontFamily: 'var(--font-inter), sans-serif' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || code.length !== 4}
            style={{
              height: 44, padding: '0 18px',
              background: loading || !name.trim() || code.length !== 4 ? 'rgba(255,153,51,0.4)' : '#FF9933',
              color: '#1a1208',
              border: '1.5px solid #FF9933',
              borderRadius: 6,
              fontFamily: 'var(--font-inter), sans-serif',
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background .15s ease',
            }}
          >
            {loading ? 'Joining…' : 'Join'}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(250,248,240,0.45)',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 12, cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            ← back
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Full-page landing layout
// ─────────────────────────────────────────────────────────────
function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = (searchParams.get('code') ?? '').toUpperCase().slice(0, 4);
  const [joinOpen, setJoinOpen] = useState(Boolean(initialCode));

  const logoClickCount = useRef(0);
  const logoEasterEggShown = useRef(false);
  function handleLogoClick() {
    if (logoEasterEggShown.current) return;
    logoClickCount.current += 1;
    if (logoClickCount.current === 7) {
      logoEasterEggShown.current = true;
      toast("Claude wrote the code. I wrote the prompt. Tomato tomato.\n— Kaustubh", {
        duration: 8000,
        position: 'bottom-center',
        style: { background: '#1a3a6e', color: '#ffffff' },
      });
    }
  }

  // Session restore — skip if arriving with a URL code (deliberate different-room join)
  useEffect(() => {
    if (initialCode) return;
    const playerId  = localStorage.getItem('vikas75_playerId');
    const playerName = localStorage.getItem('vikas75_playerName');
    const savedAvatar = localStorage.getItem('vikas75_avatarId');
    const roomCode  = localStorage.getItem('vikas75_roomCode');
    if (playerId && playerName && savedAvatar && roomCode) {
      router.replace(`/room/${roomCode}`);
    }
  }, [router, initialCode]);

  const titleStyle: React.CSSProperties = {
    fontFamily: 'var(--font-yatra), var(--font-bebas), sans-serif',
    fontWeight: 400,
    fontSize: 90,
    lineHeight: 0.9,
    letterSpacing: '-0.01em',
    color: '#fff',
    margin: 0,
    whiteSpace: 'nowrap',
  };

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    height: 60, padding: '0 32px',
    width: 380,
    borderRadius: 6,
    border: '1.5px solid transparent',
    fontFamily: 'var(--font-inter), sans-serif',
    fontWeight: 600, fontSize: 16,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'transform .15s ease, background .15s ease, box-shadow .15s ease',
  };

  return (
    <ScaledStage>
      {/* Keyframe for hint bob animation */}
      <style>{`
        @keyframes htpBob {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50%       { transform: translateY(6px); opacity: 1; }
        }
      `}</style>

      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', height: '100%',
        padding: '64px 72px 40px',
        display: 'grid',
        gridTemplateColumns: '440px 1fr 340px',
        gridTemplateRows: '1fr auto',
        gap: '0 24px',
        alignItems: 'stretch',
      }}>
        {/* ── LEFT: logo + CTAs ── */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 40, position: 'relative', zIndex: 5, alignItems: 'flex-start' }}>
          {/* Logo unit */}
          <div style={{ display: 'inline-flex', flexDirection: 'column', position: 'relative', paddingLeft: 18, alignItems: 'stretch' }}>
            {/* Saffron left bar */}
            <div style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 2, background: '#FF9933' }} />
            <div style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontWeight: 500, fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(250,248,240,0.7)',
              lineHeight: 1.4,
              marginBottom: 18,
              whiteSpace: 'nowrap',
              textAlign: 'justify',
              width: 350,
            }}>
              An initiative of the Office of Shri Sujeet Kumar
            </div>
            <button onClick={handleLogoClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
              <h1 style={titleStyle}>Vikas 75</h1>
            </button>
            <div style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontWeight: 400, fontSize: 22,
              lineHeight: 1.35,
              color: '#FF9933',
              letterSpacing: '-0.005em',
              marginTop: 18,
              whiteSpace: 'nowrap',
              textAlign: 'justify',
            }}>
              The best answer isn&apos;t always right
            </div>
          </div>

          {/* CTA row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400, width: '100%' }}>
            <button
              style={{ ...btnBase, background: '#FF9933', color: '#1a1208', borderColor: '#FF9933' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e6862b'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(255,153,51,0.32)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FF9933'; (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = ''; }}
              onClick={() => router.push('/host/setup')}
            >
              Host a Game
            </button>
            <button
              style={{
                ...btnBase,
                background: joinOpen ? 'rgba(255,153,51,0.12)' : 'transparent',
                color: '#FF9933',
                borderColor: '#FF9933',
              }}
              onMouseEnter={e => { if (!joinOpen) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,153,51,0.08)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = joinOpen ? 'rgba(255,153,51,0.12)' : 'transparent'; (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
              onClick={() => setJoinOpen(o => !o)}
            >
              Join a Game
            </button>
            <JoinForm open={joinOpen} initialCode={initialCode} onClose={() => setJoinOpen(false)} />
          </div>
        </div>

        {/* ── CENTER: card fan ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'visible', zIndex: 1 }}>
          <HeroFan />
        </div>

        {/* ── RIGHT: How To Play ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', position: 'relative', zIndex: 5 }}>
          <HowToPlay />
        </div>

        {/* ── BOTTOM STRIP ── */}
        <div style={{
          gridColumn: '1 / -1',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 12, paddingTop: 18,
          borderTop: '1px solid rgba(250,248,240,0.14)',
        }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                style={{ width: 20, height: 20, color: 'rgba(250,248,240,0.7)', transition: 'color .15s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#FF9933'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,248,240,0.7)'}
              >
                <Icon size={20} />
              </a>
            ))}
          </div>
          <div style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 11, letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(250,248,240,0.45)',
          }}>
            © 2026 · Vikas 75 · all rounds reserved
          </div>
        </div>
      </div>
    </ScaledStage>
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
