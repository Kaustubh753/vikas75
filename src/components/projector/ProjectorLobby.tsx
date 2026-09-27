'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Avatar from '@/lib/avatars';
import { getLobbyMusic } from '@/lib/music-manager';
import { getMusicManager } from '@/lib/music';
import LogoLockup from '@/components/ui/LogoLockup';
import type { GameRoom, Player } from '@/types/game';

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((m) => ({ default: m.QRCodeSVG })),
  { ssr: false }
);

// Verified scheme statistics for the ticker. The trailing "(source, date)" is split off at
// render and kept off screen for now (the data stays intact, so showing sources is one line).
const FACTS = [
  'Over 56 crore Jan Dhan accounts have been opened, making it the world\'s largest financial inclusion programme. (PIB, August 2025)',
  '56% of all Jan Dhan account holders are women. (PIB, August 2025)',
  'PM-KISAN has disbursed over ₹4.09 lakh crore to farmers since its launch. (Lok Sabha reply, December 2025)',
  'Over 9.35 crore farmers received money directly in their bank accounts in the 21st PM-KISAN installment alone. (DD News, November 2025)',
  'PM Mudra Yojana has sanctioned over 52 crore loans worth more than ₹33 lakh crore in 10 years. (PIB, April 2025)',
  '68% of all Mudra loans have gone to women entrepreneurs. (Dept. of Financial Services, April 2025)',
  'Ayushman Bharat is the world\'s largest government-funded health assurance scheme, covering 55 crore Indians. (National Health Authority)',
  'Over 10.30 crore hospital admissions have been authorised under Ayushman Bharat, saving families ₹1.48 lakh crore in cashless care. (News on Air, September 2025)',
  'Direct Benefit Transfer through Jan Dhan accounts saved the government an estimated ₹3.48 lakh crore by removing middlemen. (DBT Mission)',
  '₹6.9 lakh crore was transferred directly to citizens through DBT schemes in 2024–25 alone. (PIB, August 2025)',
  'PM Suraksha Bima Yojana provides accident insurance of ₹2 lakh for just ₹20 per year. (Ministry of Finance)',
  'Over 50 crore Indians are enrolled in PM Suraksha Bima Yojana. (PIB, March 2025)',
  'Atal Pension Yojana now has over 7.49 crore subscribers preparing for retirement. (Ministry of Finance, March 2025)',
  'PM Jan Dhan accounts now hold over ₹2.68 lakh crore in deposits, a 12-fold increase in a decade. (PIB, August 2025)',
  'Jan Dhan accounts now power Direct Benefit Transfer for 327 government schemes. (Dept. of Financial Services, August 2025)',
];
const FACT_DWELL_MS = 10_000;
function splitFact(fact: string): { text: string; cite: string } {
  const m = fact.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return m ? { text: m[1], cite: m[2] } : { text: fact, cite: '' };
}

// The tile rotations for each letter — tiny rotations like playing cards freshly placed
const TILE_ROTATIONS = ['-3deg', '1.5deg', '-1deg', '2.5deg'];
const MAX_SEATS = 16;
const CALLOUT_MS = 1700;

const INTER = 'var(--font-inter),sans-serif';
const BEBAS = 'var(--font-bebas),sans-serif';
const NAME_STACK = 'var(--font-inter),var(--font-devanagari),sans-serif';
// Bebas has no Devanagari: names in the callout fall through to Noto Sans Devanagari.
const CALLOUT_STACK = 'var(--font-bebas),var(--font-devanagari),sans-serif';
const HINDI = 'var(--font-devanagari),var(--font-inter),sans-serif';
const HOUSE_70 = 'rgba(250,248,240,0.7)';
const HOUSE_45 = 'rgba(250,248,240,0.45)';
const HAIRLINE = 'rgba(250,248,240,0.14)';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface Props { room: GameRoom; bottomInset?: number }
interface Joiner { name: string; avatarId: Player['avatarId'] }
interface Callout { players: Joiner[]; key: number }

/** "RAVI IS IN!", "RAVI & MEENA ARE IN!", "RAVI, MEENA AND 3 MORE ARE IN!" — a burst of joins is one callout. */
function calloutLine(names: string[]): string {
  if (names.length === 1) return `${names[0]} IS IN!`;
  if (names.length === 2) return `${names[0]} & ${names[1]} ARE IN!`;
  return `${names[0]}, ${names[1]} AND ${names.length - 2} MORE ARE IN!`;
}

/** The seat's inner budget, from its height: a square avatar, then the name on one or two lines.
 *  Names past 18 characters step down a size so two lines hold them whole. */
function seatMetrics(h: number, nameLength = 0) {
  const padV = Math.round(h * 0.06);
  const gap = Math.round(h * 0.05);
  const base = Math.max(18, Math.round(h * 0.15));
  let avatar = Math.round(h * 0.44);
  let nameSize = nameLength > 18 ? Math.max(16, Math.round(base * 0.8)) : base;
  let lines = h - padV * 2 - avatar - gap >= nameSize * 1.15 * 2 ? 2 : 1;
  if (lines === 1) {
    // A small seat: a slightly smaller face and a 16px name buy the second line the name needs.
    const smallAvatar = Math.round(h * 0.38);
    if (h - padV * 2 - smallAvatar - gap >= 16 * 1.15 * 2) { avatar = smallAvatar; nameSize = 16; lines = 2; }
  }
  return { padV, avatar, gap, nameSize, lines };
}

// ── Open seat placeholder ────────────────────────────────────────────────────
function OpenSeat({ w, h }: { w: number; h: number }) {
  const { avatar, gap } = seatMetrics(h);
  return (
    <div style={{
      width: w, height: h, borderRadius: 18,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap,
      border: '1.5px dashed rgba(250,248,240,0.22)',
      background: 'rgba(250,248,240,0.015)',
      flexShrink: 0, boxSizing: 'border-box',
    }}>
      <div style={{
        width: avatar, height: avatar, borderRadius: Math.round(avatar * 0.14),
        border: '1.5px dashed rgba(250,248,240,0.26)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(250,248,240,0.35)', fontSize: Math.round(avatar * 0.5), fontWeight: 300, lineHeight: 1,
      }}>+</div>
      <div style={{
        fontFamily: BEBAS, fontSize: Math.max(13, Math.round(h * 0.11)),
        letterSpacing: '0.1em', color: HOUSE_45, lineHeight: 1,
      }}>OPEN SEAT</div>
    </div>
  );
}

// ── Filled seat with player avatar ──────────────────────────────────────────
function FilledSeat({ player, w, h }: { player: Player; w: number; h: number }) {
  const { padV, avatar, gap, nameSize, lines } = seatMetrics(h, player.name.length);
  return (
    <div style={{
      width: w, height: h, borderRadius: 18,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap,
      background: 'linear-gradient(180deg,rgba(26,58,110,0.55) 0%,rgba(26,58,110,0.22) 100%)',
      border: '1px solid rgba(255,153,51,0.22)',
      boxShadow: '0 18px 36px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)',
      animation: 'vkSeatIn 0.55s cubic-bezier(.2,.8,.25,1) both',
      flexShrink: 0, padding: `${padV}px ${Math.round(w * 0.06)}px`, boxSizing: 'border-box',
    }}>
      <div style={{
        width: avatar, height: avatar, borderRadius: Math.round(avatar * 0.14), overflow: 'hidden',
        border: '2px solid rgba(255,153,51,0.4)',
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4),0 6px 16px rgba(0,0,0,0.3)',
        flexShrink: 0,
      }}>
        <Avatar id={player.avatarId} size={avatar} />
      </div>
      <div style={{
        fontFamily: NAME_STACK, fontSize: nameSize, fontWeight: 600, lineHeight: 1.15,
        letterSpacing: '0.005em', color: '#ffffff', maxWidth: '100%', textAlign: 'center',
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical',
        wordBreak: 'break-word',
      }} title={player.name}>{player.name}</div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ProjectorLobby({ room, bottomInset = 0 }: Props) {
  const [origin, setOrigin] = useState('');
  const [win, setWin] = useState({ w: 1920, h: 1080 });
  const [factIdx, setFactIdx] = useState(0);
  const [callout, setCallout] = useState<Callout | null>(null);

  // Players already seated when the component mounted don't get a callout; only real joins do.
  const prevIdsRef = useRef<Set<string>>(new Set(Object.keys(room.players)));
  const queueRef = useRef<Joiner[]>([]);
  const calloutKeyRef = useRef(0);

  useEffect(() => {
    setOrigin(window.location.origin);
    getLobbyMusic().autoPlay();
    const update = () => setWin({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Rotate "Did you know" facts slowly enough to be read from the room.
  useEffect(() => {
    const iv = setInterval(() => setFactIdx(i => (i + 1) % FACTS.length), FACT_DWELL_MS);
    return () => clearInterval(iv);
  }, []);

  // New players get a callout over the seat band. Joins that land while one is showing queue up
  // and play as a single combined callout, so a rush never hides the roster for long.
  useEffect(() => {
    const current = Object.values(room.players);
    const fresh = current.filter(p => !prevIdsRef.current.has(p.id));
    if (fresh.length === 0) return;
    prevIdsRef.current = new Set(current.map(p => p.id));
    queueRef.current.push(...fresh.map(p => ({ name: p.name, avatarId: p.avatarId })));
    if (!callout) setCallout({ players: queueRef.current.splice(0), key: ++calloutKeyRef.current });
  }, [room.players]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!callout) return;
    getMusicManager().ping('join');
    const t = setTimeout(() => {
      const next = queueRef.current.splice(0);
      setCallout(next.length ? { players: next, key: ++calloutKeyRef.current } : null);
    }, CALLOUT_MS);
    return () => clearTimeout(t);
  }, [callout]);

  const players = Object.values(room.players);
  const n = players.length;
  const joinUrl = origin ? `${origin}/join?code=${room.code}` : '';
  const host = origin ? origin.replace(/^https?:\/\//, '') : 'vikas75.in';
  const letters = room.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).split('');
  while (letters.length < 4) letters.push('');

  // Seats: one row up to eight, two rows to sixteen, then "+N more".
  const visiblePlayers = players.slice(0, MAX_SEATS);
  const extraCount = Math.max(0, n - MAX_SEATS);
  const openSeats = n >= MAX_SEATS ? 0 : Math.max(1, Math.min(3, 4 - n));
  const seatCount = visiblePlayers.length + openSeats + (extraCount > 0 ? 1 : 0);
  const twoRows = seatCount > 8;
  const rows = twoRows ? 2 : 1;
  const perRow = twoRows ? Math.ceil(seatCount / 2) : seatCount;
  const short = win.h < 800;
  // On a short screen (a 720p laptop mirrored to the projector) the ticker is the first thing to
  // go: with the brand lockup in the header it would leave the seats under 80px tall.
  const showTicker = !short;

  // The QR is the hero: 30% of the height, less when the roster needs room or the screen is short.
  const qrShare = twoRows ? (short ? 0.2 : 0.23) : (short ? 0.24 : 0.3);
  const qrSize = Math.round(clamp(win.h * qrShare, 150, 420));
  const qrPad = Math.round(qrSize * 0.06);
  const badge = Math.round(qrSize * 0.15);
  const tileH = Math.round(qrSize * (short ? 0.56 : 0.48));
  const tileW = Math.round(tileH / 1.31);
  const tileFsz = Math.round(tileW * 0.72);

  // Vertical budget for the seat band, from the same clamps the CSS uses (vw/vh are viewport
  // units, the host bar inset is not), so the roster is sized from the height that is actually
  // left and shrinks before anything else clips. The ticker reserves two lines so it is fixed.
  const W = win.w, VH = win.h, H = VH - bottomInset;
  const topPad = clamp(VH * 0.02, 12, 28);
  // The md lockup is three bands at a fixed 232px column (12 + 53 + 16px, two 8px gaps): 97px.
  const headerH = 98;
  const tickerLineH = clamp(W * 0.0125, 15, 24) * 1.35;
  const tickerH = showTicker ? clamp(VH * 0.012, 8, 16) * 2 + tickerLineH * 2 + 1 : 0;
  const promiseH = clamp(W * 0.021, 22, 40) * 1.05 + 4 + clamp(W * 0.0115, 13, 21) * 1.4 + 4 + clamp(W * 0.0085, 11, 14) * 1.4 + 4;
  const cardH = clamp(VH * 0.014, 12, 20) * 2 + clamp(W * 0.019, 20, 36) + 12 + qrSize + qrPad * 2 + 2;
  const bodyGap = Math.round(clamp(VH * 0.014, 8, 18));
  const bandGap = Math.round(clamp(VH * 0.012, 8, 14));
  const statusH = Math.round(clamp(W * 0.02, 20, 36));
  const seatGap = Math.round(W * 0.01);
  const freeH = H - topPad - headerH - tickerH - promiseH - cardH - bodyGap * 2 - bandGap - statusH - 8;
  const seatHMax = Math.round(win.h * (twoRows ? 0.14 : 0.18));
  let seatH = clamp(Math.floor((freeH - seatGap * (rows - 1)) / rows), 64, seatHMax);
  // Width: the row's free width, but never wider than 1.4× the height; if the row is the
  // constraint, the height follows so the seats keep their shape.
  const availW = win.w * 0.86;
  const widthFit = Math.floor((availW - seatGap * (perRow - 1)) / perRow);
  const seatW = Math.max(80, Math.min(widthFit, Math.round(seatH * 1.4)));
  seatH = Math.min(seatH, Math.round(seatW / 0.92));
  const bandH = rows * seatH + seatGap * (rows - 1) + bandGap + statusH;
  const calloutAvatar = Math.round(clamp(bandH * 0.62, 64, 170));
  const calloutFsz = Math.round(clamp(bandH * 0.4, 32, 104));

  // What the room is told while it waits, by head-count.
  const idleLine = n === 1 ? 'ONE MORE AND WE CAN START' : 'READY WHEN THE HOST IS';
  const fact = splitFact(FACTS[factIdx]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', isolation: 'isolate' }}>

      {/* ── Background ────────────────────────────────────────────── */}
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

      {/* ── Main layout — flex column ─────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 3,
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        padding: 'clamp(12px,2vh,28px) clamp(32px,4vw,64px) 0',
        boxSizing: 'border-box',
      }}>

        {/* ── HEADER ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          {/* The real brand mark (attribution, pixel wordmark, PLAY FOR PROGRESS) with the phase
              pill beside it, centred on the lockup's own height. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <LogoLockup size="md" />
            <span style={{
              fontFamily: INTER, fontSize: 'clamp(11px,0.75vw,13px)', fontWeight: 600,
              letterSpacing: '0.22em', textTransform: 'uppercase', color: '#FF9933',
              border: '1px solid rgba(255,153,51,0.35)', borderRadius: 999, padding: '5px 12px',
            }}>Lobby</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#138808', animation: 'vkPulseDot 2.4s ease-in-out infinite' }} />
            <span style={{ fontFamily: INTER, fontSize: 'clamp(11px,0.85vw,14px)', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: HOUSE_70 }}>
              Room open
            </span>
          </div>
        </div>

        {/* ── BODY ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: bodyGap, position: 'relative' }}>

          {/* The promise: what this is and why to scan, in English and Hindi */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{ fontFamily: BEBAS, fontSize: 'clamp(22px,2.1vw,40px)', lineHeight: 1.05, letterSpacing: '0.06em', color: '#ffffff' }}>
              Pick a sarkari scheme · defend it in 25 words · funniest answer wins
            </div>
            <div lang="hi" style={{ fontFamily: HINDI, fontSize: 'clamp(13px,1.15vw,21px)', lineHeight: 1.4, color: HOUSE_70 }}>
              सरकारी योजना चुनो · 25 शब्दों में बचाव करो · सबसे मज़ेदार जवाब जीतेगा
            </div>
            <div style={{ fontFamily: INTER, fontSize: 'clamp(11px,0.85vw,14px)', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#FF9933', marginTop: 4 }}>
              No app · no sign-up · 30 seconds to join
            </div>
          </div>

          {/* JOIN CARD — QR hero + code tiles in a glass container */}
          <div style={{
            display: 'flex', alignItems: 'center', flexShrink: 0,
            gap: 'clamp(24px,3vw,56px)',
            padding: `clamp(12px,1.4vh,20px) clamp(20px,2.4vw,40px)`,
            borderRadius: 18,
            background: 'rgba(250,248,240,0.025)',
            border: `1px solid ${HAIRLINE}`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>
            {/* QR block */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: BEBAS, fontSize: 'clamp(20px,1.9vw,36px)', letterSpacing: '0.12em', color: '#ffffff', lineHeight: 1 }}>Scan to join</span>
              {joinUrl ? (
                <div style={{
                  position: 'relative', borderRadius: Math.round(qrSize * 0.06), padding: qrPad, background: '#faf8f0',
                  boxShadow: '0 16px 30px rgba(0,0,0,0.45),0 4px 8px rgba(0,0,0,0.35),inset 0 0 0 1px rgba(0,0,0,0.06)',
                }}>
                  <QRCodeSVG value={joinUrl} size={qrSize} level="H" bgColor="#faf8f0" fgColor="#15110a" />
                  <div aria-hidden="true" style={{
                    position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
                    width: badge, height: badge, borderRadius: Math.round(badge * 0.22),
                    background: '#FF9933', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-yatra),var(--font-inter)', fontSize: Math.round(badge * 0.42), color: '#15110a',
                    boxShadow: `0 0 0 ${Math.max(3, Math.round(badge * 0.09))}px #faf8f0, 0 4px 10px rgba(0,0,0,0.35)`,
                  }}>V·75</div>
                </div>
              ) : (
                <div style={{ width: qrSize + qrPad * 2, height: qrSize + qrPad * 2, background: 'rgba(250,248,240,0.04)', borderRadius: 12, display: 'grid', placeItems: 'center' }}>
                  <span style={{ fontFamily: INTER, fontSize: 14, color: HOUSE_45 }}>Loading…</span>
                </div>
              )}
            </div>

            {/* "or" divider */}
            <div style={{ position: 'relative', alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
              <div style={{ position: 'absolute', top: 6, bottom: 6, left: '50%', width: 1, background: HAIRLINE }} />
              <span style={{ position: 'relative', zIndex: 1, background: '#0b0a14', padding: '8px 0', fontFamily: BEBAS, fontSize: 'clamp(18px,1.6vw,30px)', letterSpacing: '0.16em', color: HOUSE_45 }}>OR</span>
            </div>

            {/* Room code block */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
              <span style={{ fontFamily: BEBAS, fontSize: 'clamp(20px,1.9vw,36px)', letterSpacing: '0.12em', color: '#ffffff', lineHeight: 1 }}>Type the code</span>
              <div style={{ display: 'flex', gap: Math.round(tileW * 0.16) }} aria-label={`Room code ${room.code}`}>
                {letters.map((ch, i) => (
                  <div key={i} style={{
                    width: tileW, height: tileH,
                    background: '#faf8f0', color: '#15110a',
                    borderRadius: Math.round(tileW * 0.16),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-yatra),var(--font-inter)', fontSize: tileFsz, lineHeight: 1,
                    boxShadow: '0 16px 30px rgba(0,0,0,0.45),0 4px 8px rgba(0,0,0,0.35),inset 0 2px 0 rgba(255,255,255,0.6)',
                    border: '1px solid rgba(0,0,0,0.12)',
                    position: 'relative', transform: `rotate(${TILE_ROTATIONS[i]})`, userSelect: 'none', flexShrink: 0,
                  }}>
                    {ch}
                    <div style={{ position: 'absolute', top: Math.round(tileW * 0.1), left: Math.round(tileW * 0.12), width: Math.max(5, Math.round(tileW * 0.08)), height: Math.max(5, Math.round(tileW * 0.08)), borderRadius: '50%', background: 'rgba(255,153,51,0.7)' }} />
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: INTER, fontSize: 'clamp(13px,1.1vw,20px)', color: HOUSE_70, letterSpacing: '0.02em', lineHeight: 1.2, display: 'flex', alignItems: 'baseline', gap: '0.4em', flexWrap: 'wrap' }}>
                <span>at</span>
                <span style={{ fontFamily: BEBAS, fontSize: 'clamp(22px,2.1vw,40px)', letterSpacing: '0.04em', color: '#ffffff' }}>{host}</span>
                <span>on your phone</span>
              </div>
            </div>
          </div>

          {/* ── SEATS — sized from the height that is left ───────────── */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: bandGap, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: seatGap, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', maxWidth: perRow * (seatW + seatGap) }}>
              {visiblePlayers.map(p => <FilledSeat key={p.id} player={p} w={seatW} h={seatH} />)}
              {Array.from({ length: openSeats }).map((_, i) => <OpenSeat key={`open-${i}`} w={seatW} h={seatH} />)}
              {extraCount > 0 && (
                <div style={{
                  width: seatW, height: seatH, borderRadius: 18, flexShrink: 0,
                  border: '1px solid rgba(255,153,51,0.22)', background: 'rgba(26,58,110,0.3)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <span style={{ fontFamily: 'var(--font-yatra),var(--font-inter)', fontSize: Math.round(seatH * 0.3), color: '#FF9933', lineHeight: 1 }}>+{extraCount}</span>
                  <span style={{ fontFamily: BEBAS, fontSize: Math.max(13, Math.round(seatH * 0.11)), letterSpacing: '0.1em', color: HOUSE_70 }}>MORE</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6em', fontFamily: BEBAS, fontSize: statusH, letterSpacing: '0.1em', lineHeight: 1, height: statusH }}>
              {n === 0 ? (
                <span style={{ color: '#FF9933' }}>BE THE FIRST IN</span>
              ) : (
                <>
                  <span style={{ color: '#FF9933' }}>{n} {n === 1 ? 'PLAYER' : 'PLAYERS'} IN</span>
                  <span style={{ color: HOUSE_45 }}>·</span>
                  <span style={{ color: HOUSE_70 }}>{idleLine}</span>
                </>
              )}
            </div>

            {/* ── JOIN CALLOUT — over the seat band, never over the QR or the code ── */}
            {callout && (
              <div key={callout.key} aria-live="polite" style={{
                position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: `vkCalloutIn 0.5s cubic-bezier(0.16,1,0.3,1) both, vkCalloutOut 0.35s ease-in ${CALLOUT_MS - 350}ms forwards`,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: Math.round(calloutAvatar * 0.2), maxWidth: '96%',
                  padding: `${Math.round(calloutAvatar * 0.12)}px ${Math.round(calloutAvatar * 0.28)}px`, borderRadius: 24,
                  background: 'rgba(8,7,15,0.92)', border: '1px solid rgba(255,153,51,0.4)',
                  boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 2px rgba(255,153,51,0.25)',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                }}>
                  <div style={{ display: 'flex', flexShrink: 0 }}>
                    {callout.players.slice(0, 3).map((p, i) => (
                      <div key={i} style={{
                        width: calloutAvatar, height: calloutAvatar, borderRadius: Math.round(calloutAvatar * 0.14), overflow: 'hidden',
                        border: '3px solid rgba(255,153,51,0.6)', background: '#08070f', flexShrink: 0,
                        marginLeft: i ? -Math.round(calloutAvatar * 0.3) : 0, boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                      }}>
                        <Avatar id={p.avatarId} size={calloutAvatar} />
                      </div>
                    ))}
                  </div>
                  <div style={{
                    fontFamily: CALLOUT_STACK, fontSize: calloutFsz, lineHeight: 0.95, letterSpacing: '0.04em', color: '#FF9933',
                    textShadow: '0 6px 30px rgba(0,0,0,0.7)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {calloutLine(callout.players.map(p => p.name))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── TICKER — "Did you know" facts, sized for the room ─────── */}
        {showTicker && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0,
            padding: 'clamp(8px,1.2vh,16px) 0',
            borderTop: `1px solid ${HAIRLINE}`,
          }}>
            <span style={{
              flexShrink: 0, fontFamily: INTER, fontSize: 'clamp(11px,0.85vw,14px)', fontWeight: 700,
              letterSpacing: '0.22em', textTransform: 'uppercase', color: '#FF9933',
              paddingRight: 20, borderRight: `1px solid ${HAIRLINE}`,
            }}>Did you know</span>
            <div style={{ flex: 1, overflow: 'hidden', height: Math.round(tickerLineH * 2), display: 'flex', alignItems: 'center' }}>
              <span key={factIdx} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', animation: 'vkFactIn 0.6s ease both', lineHeight: 1.35 }}>
                <span style={{ fontFamily: INTER, fontSize: 'clamp(15px,1.25vw,24px)', color: '#ffffff' }}>{fact.text}</span>
              </span>
            </div>
            <span style={{
              flexShrink: 0, fontFamily: INTER, fontSize: 'clamp(11px,0.85vw,14px)', fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase', color: HOUSE_70,
              paddingLeft: 20, borderLeft: `1px solid ${HAIRLINE}`,
            }}>{room.totalRounds} rounds · {room.timerDuration}s per answer</span>
          </div>
        )}

      </div>

      <style>{`
        @keyframes vkPulseDot {
          0%, 100% { box-shadow: 0 0 0 3px rgba(19,136,8,0.10); }
          50%       { box-shadow: 0 0 0 6px rgba(19,136,8,0.22); }
        }
        @keyframes vkSeatIn {
          from { transform: translateY(16px) scale(0.95); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        @keyframes vkCalloutIn {
          from { opacity: 0; transform: scale(0.86) translateY(24px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes vkCalloutOut {
          to { opacity: 0; transform: scale(0.96) translateY(-12px); }
        }
        @keyframes vkFactIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
}
