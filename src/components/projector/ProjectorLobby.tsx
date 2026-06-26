'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Avatar from '@/lib/avatars';
import { getLobbyMusic } from '@/lib/music-manager';
import type { GameRoom, Player } from '@/types/game';

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((m) => ({ default: m.QRCodeSVG })),
  { ssr: false }
);

const FACTS = [
  'Over 56 crore Jan Dhan accounts have been opened, making it the world\'s largest financial inclusion programme. (PIB, August 2025)',
  '56% of all Jan Dhan account holders are women. (PIB, August 2025)',
  'PM-KISAN has disbursed over ₹4.09 lakh crore to farmers since its launch. (Lok Sabha reply, December 2025)',
  'Over 9.35 crore farmers received money directly in their bank accounts in the 21st PM-KISAN installment alone. (DD News, November 2025)',
  'PM Mudra Yojana has sanctioned over 52 crore loans worth more than ₹33 lakh crore in 10 years. (PIB, April 2025)',
  '68% of all Mudra loans have gone to women entrepreneurs. (Dept. of Financial Services, April 2025)',
  'Ayushman Bharat is the world\'s largest government-funded health assurance scheme, covering 55 crore Indians. (National Health Authority)',
  'Over 10.30 crore hospital admissions have been authorised under Ayushman Bharat, saving families ₹1.48 lakh crore in cashless care. (News on Air, September 2025)',
  'Ayushman Bharat now covers every Indian aged 70 and above, regardless of income. (Government of India, October 2024)',
  'Swachh Bharat Mission built over 11 crore household toilets in rural India alone. (PIB, September 2024)',
  'A peer-reviewed study in Nature Scientific Reports found Swachh Bharat saves 60,000 to 70,000 infant lives every year. (Chakrabarti et al., 2024)',
  'Stand-Up India has sanctioned loans to nearly 2 lakh women entrepreneurs since 2016. (Inc42, February 2025)',
  'Stand-Up India has sanctioned ₹61,020 crore in loans for first-time SC, ST, and women entrepreneurs. (Ministry of Finance, March 2025)',
  'Direct Benefit Transfer through Jan Dhan accounts saved the government an estimated ₹3.48 lakh crore by removing middlemen. (DBT Mission)',
  '₹6.9 lakh crore was transferred directly to citizens through DBT schemes in 2024–25 alone. (PIB, August 2025)',
  'PM Suraksha Bima Yojana provides accident insurance of ₹2 lakh for just ₹20 per year. (Ministry of Finance)',
  'Over 50 crore Indians are enrolled in PM Suraksha Bima Yojana. (PIB, March 2025)',
  'Atal Pension Yojana now has over 7.49 crore subscribers preparing for retirement. (Ministry of Finance, March 2025)',
  'PM Jan Dhan accounts now hold over ₹2.68 lakh crore in deposits, a 12-fold increase in a decade. (PIB, August 2025)',
  'Jan Dhan accounts now power Direct Benefit Transfer for 327 government schemes. (Dept. of Financial Services, August 2025)',
];

// The tile rotations for each letter — tiny rotations like playing cards freshly placed
const TILE_ROTATIONS = ['-3deg', '1.5deg', '-1deg', '2.5deg'];

interface BanterItem { name: string; key: number }
interface Props { room: GameRoom }

// ── Open seat placeholder ────────────────────────────────────────────────────
function OpenSeat({ w, h }: { w: number; h: number }) {
  const avatarRing = Math.round(w * 0.44);
  return (
    <div style={{
      width: w, height: h,
      borderRadius: 18,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      border: '1.5px dashed rgba(250,248,240,0.18)',
      background: 'rgba(250,248,240,0.015)',
      flexShrink: 0,
    }}>
      <div style={{
        width: avatarRing, height: avatarRing, borderRadius: '50%',
        border: '1.5px dashed rgba(250,248,240,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(250,248,240,0.3)',
        fontSize: Math.round(w * 0.17), fontWeight: 300,
      }}>+</div>
      <div style={{
        fontFamily: 'var(--font-inter),sans-serif',
        fontSize: Math.round(w * 0.07), fontWeight: 500,
        letterSpacing: '0.16em', textTransform: 'uppercase' as const,
        color: 'rgba(250,248,240,0.45)',
      }}>open seat</div>
    </div>
  );
}

// ── Filled seat with player avatar ──────────────────────────────────────────
function FilledSeat({ player, w, h }: { player: Player; w: number; h: number }) {
  const avatarSize = Math.round(w * 0.44);
  return (
    <div style={{
      width: w, height: h,
      borderRadius: 18,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      background: 'linear-gradient(180deg,rgba(26,58,110,0.55) 0%,rgba(26,58,110,0.22) 100%)',
      border: '1px solid rgba(255,153,51,0.22)',
      boxShadow: '0 18px 36px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)',
      animation: 'vkSeatIn 0.55s cubic-bezier(.2,.8,.25,1) both',
      flexShrink: 0,
    }}>
      <div style={{
        width: avatarSize, height: avatarSize, borderRadius: '50%',
        overflow: 'hidden',
        border: '2px solid rgba(255,153,51,0.4)',
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4),0 6px 16px rgba(0,0,0,0.3)',
        flexShrink: 0,
      }}>
        <Avatar id={player.avatarId} size={avatarSize} />
      </div>
      <div style={{
        fontFamily: 'var(--font-inter),sans-serif',
        fontSize: Math.round(w * 0.105), fontWeight: 600,
        letterSpacing: '0.01em', color: '#fff',
        maxWidth: w - 16, textAlign: 'center' as const,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
      }}>{player.name}</div>
      <div style={{
        fontFamily: 'var(--font-inter),sans-serif',
        fontSize: Math.round(w * 0.062), fontWeight: 600,
        letterSpacing: '0.16em', textTransform: 'uppercase' as const,
        color: '#138808', background: 'rgba(19,136,8,0.12)',
        border: '1px solid rgba(19,136,8,0.3)', borderRadius: 999,
        padding: `${Math.round(w * 0.022)}px ${Math.round(w * 0.056)}px`,
      }}>ready</div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ProjectorLobby({ room }: Props) {
  const [origin, setOrigin]     = useState('');
  const [winW, setWinW]         = useState(1920);
  const [factIdx, setFactIdx]   = useState(0);
  const [banterItems, setBanterItems] = useState<BanterItem[]>([]);

  // Track which player IDs were already in the room when the component mounted,
  // so only future joiners trigger banter chips
  const prevIdsRef   = useRef<Set<string>>(new Set(Object.keys(room.players)));
  const banterKeyRef = useRef(0);

  useEffect(() => {
    setOrigin(window.location.origin);
    getLobbyMusic().autoPlay();
    const update = () => setWinW(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Rotate "Did you know" facts
  useEffect(() => {
    const iv = setInterval(() => setFactIdx(i => (i + 1) % FACTS.length), 5200);
    return () => clearInterval(iv);
  }, []);

  // Detect new players joining and emit banter chips
  useEffect(() => {
    const currentPlayers = Object.values(room.players);
    const newPlayers = currentPlayers.filter(p => !prevIdsRef.current.has(p.id));
    if (newPlayers.length > 0) {
      newPlayers.forEach(p => {
        const key = ++banterKeyRef.current;
        setBanterItems(prev => [...prev, { name: p.name, key }].slice(-3));
      });
      prevIdsRef.current = new Set(currentPlayers.map(p => p.id));
    }
  }, [room.players]);

  const players   = Object.values(room.players);
  const joinUrl   = origin ? `${origin}/join?code=${room.code}` : '';
  const letters   = room.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).split('');
  while (letters.length < 4) letters.push('');

  // How many seats to show
  const MAX_VISIBLE = 6;
  const visiblePlayers = players.slice(0, MAX_VISIBLE);
  const extraCount     = Math.max(0, players.length - MAX_VISIBLE);
  const openSeats      = players.length >= MAX_VISIBLE
    ? 0
    : Math.max(1, Math.min(3, 4 - players.length));

  // Seat sizing: fit all seats within 78% of viewport width
  const totalSeatCols = visiblePlayers.length + openSeats + (extraCount > 0 ? 1 : 0);
  const seatGap = Math.round(winW * 0.01);
  const availW  = winW * 0.78;
  const seatW   = Math.max(90, Math.min(166, Math.floor((availW - seatGap * (totalSeatCols - 1)) / totalSeatCols)));
  const seatH   = Math.round(seatW * 1.15);

  // QR code size
  const qrSize = Math.round(Math.min(winW * 0.094, 140));

  // Code tile sizing
  const tileW    = Math.round(Math.min(winW * 0.052, 76));
  const tileH    = Math.round(tileW * 1.31);
  const tileFsz  = Math.round(tileW * 0.70);

  return (
    // Fill the parent (ProjectorView reserves space for the host control bar via
    // paddingBottom) instead of position:fixed, which would escape that reservation and
    // let the host bar overlap the lobby's bottom strip.
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', isolation: 'isolate' }}>

      {/* ── Background ────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, background: '#07101f', zIndex: 0 }} />

      {/* Warm saffron glow from top-centre */}
      <div style={{
        position: 'absolute', left: '50%', top: '-25%',
        width: '83vw', height: '100vh',
        transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse at center,rgba(255,153,51,.16) 0%,rgba(255,153,51,.06) 28%,rgba(255,153,51,0) 60%)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Film grain */}
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
        padding: 'clamp(20px,2.6vh,40px) clamp(40px,5vw,72px) 0',
        boxSizing: 'border-box',
      }}>

        {/* ── HEADER ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>

          {/* Saffron-border logo unit — attribution + wordmark + tagline */}
          <div style={{
            display: 'inline-flex', flexDirection: 'column',
            position: 'relative', paddingLeft: 16, alignItems: 'stretch',
          }}>
            {/* Left saffron rule */}
            <div style={{
              position: 'absolute', left: 0, top: 4, bottom: 4,
              width: 2, background: '#FF9933',
            }} />
            <div style={{
              fontFamily: 'var(--font-inter),sans-serif', fontWeight: 500,
              fontSize: 'clamp(8px,0.68vw,10px)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'rgba(250,248,240,0.7)', lineHeight: 1.4,
              marginBottom: 10, whiteSpace: 'nowrap',
            }}>
              An initiative of the Office of Shri Sujeet Kumar
            </div>
            {/* Wordmark + Lobby pill on same baseline */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span style={{
                fontFamily: 'var(--font-yatra),var(--font-inter),sans-serif',
                fontSize: 'clamp(22px,2.4vw,34px)', lineHeight: 1, color: '#fff',
              }}>Vikas 75</span>
              <span style={{
                fontFamily: 'var(--font-inter),sans-serif',
                fontSize: 'clamp(8px,0.7vw,10px)', fontWeight: 600,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                color: '#FF9933',
                border: '1px solid rgba(255,153,51,0.35)',
                borderRadius: 999, padding: '5px 12px',
              }}>Lobby</span>
            </div>
            <div style={{
              fontFamily: 'var(--font-inter),sans-serif', fontWeight: 400,
              fontSize: 'clamp(11px,1.1vw,16px)',
              lineHeight: 1.35, color: '#FF9933', letterSpacing: '-0.005em',
              marginTop: 8, whiteSpace: 'nowrap',
            }}>
              The best answer isn&apos;t always right
            </div>
          </div>

          {/* Live status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#138808',
              animation: 'vkPulseDot 2.4s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: 'var(--font-inter),sans-serif',
              fontSize: 'clamp(8px,0.76vw,11px)', fontWeight: 500,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              color: 'rgba(250,248,240,0.7)',
            }}>Room open · {players.length} joined</span>
          </div>
        </div>

        {/* ── BODY — vertically centred ─────────────────────────────── */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 'clamp(18px,2.6vh,34px)',
          position: 'relative',
        }}>

          {/* JOIN CARD — QR + code tiles in a glass container */}
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: 'clamp(20px,2.4vw,36px)',
            padding: 'clamp(14px,1.6vh,24px) clamp(20px,2.4vw,32px)',
            borderRadius: 18,
            background: 'rgba(250,248,240,0.025)',
            border: '1px solid rgba(250,248,240,0.14)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>

            {/* QR code */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              {joinUrl ? (
                <div style={{
                  position: 'relative', borderRadius: 12, padding: 10, background: '#faf8f0',
                  boxShadow: '0 12px 26px rgba(0,0,0,0.4),inset 0 0 0 1px rgba(0,0,0,0.06)',
                }}>
                  <QRCodeSVG value={joinUrl} size={qrSize} level="M" bgColor="#faf8f0" />
                  {/* V·75 badge over QR centre */}
                  <div style={{
                    position: 'absolute', left: '50%', top: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: Math.round(qrSize * 0.26), height: Math.round(qrSize * 0.26),
                    borderRadius: Math.round(qrSize * 0.065),
                    background: '#FF9933',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-yatra),var(--font-inter)', fontSize: Math.round(qrSize * 0.115), color: '#15110a',
                    boxShadow: `0 0 0 3px #faf8f0, 0 4px 10px rgba(0,0,0,0.35)`,
                  }}>V·75</div>
                </div>
              ) : (
                <div style={{
                  width: qrSize + 20, height: qrSize + 20,
                  background: 'rgba(250,248,240,0.04)', borderRadius: 12,
                  display: 'grid', placeItems: 'center',
                }}>
                  <span style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: 12, color: 'rgba(250,248,240,0.3)' }}>
                    Loading…
                  </span>
                </div>
              )}
              <span style={{
                fontFamily: 'var(--font-inter),sans-serif',
                fontSize: 'clamp(8px,0.76vw,11px)', fontWeight: 600,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: 'rgba(250,248,240,0.7)',
              }}>scan to join</span>
            </div>

            {/* "or" vertical divider */}
            <div style={{
              position: 'relative', alignSelf: 'stretch',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px',
            }}>
              <div style={{
                position: 'absolute', top: 6, bottom: 6, left: '50%', width: 1,
                background: 'rgba(250,248,240,0.14)',
              }} />
              <span style={{
                position: 'relative', zIndex: 1,
                background: '#0a1320', padding: '6px 0',
                fontFamily: 'var(--font-inter),sans-serif',
                fontSize: 'clamp(8px,0.76vw,11px)', fontWeight: 600,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'rgba(250,248,240,0.45)',
              }}>or</span>
            </div>

            {/* Room code block */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                fontFamily: 'var(--font-inter),sans-serif',
                fontSize: 'clamp(8px,0.76vw,11px)', fontWeight: 600,
                letterSpacing: '0.24em', textTransform: 'uppercase',
                color: 'rgba(250,248,240,0.7)',
              }}>enter the room code</div>

              {/* Cream playing-card tiles */}
              <div style={{ display: 'flex', gap: 'clamp(8px,0.8vw,14px)' }}>
                {letters.map((ch, i) => (
                  <div key={i} style={{
                    width: tileW, height: tileH,
                    background: '#faf8f0', color: '#15110a',
                    borderRadius: 'clamp(8px,0.7vw,14px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-yatra),var(--font-inter)',
                    fontSize: tileFsz, lineHeight: 1,
                    boxShadow: '0 16px 30px rgba(0,0,0,0.45),0 4px 8px rgba(0,0,0,0.35),inset 0 2px 0 rgba(255,255,255,0.6)',
                    border: '1px solid rgba(0,0,0,0.12)',
                    position: 'relative',
                    transform: `rotate(${TILE_ROTATIONS[i]})`,
                    userSelect: 'none',
                    flexShrink: 0,
                  }}>
                    {ch}
                    {/* Corner pip — like a playing card */}
                    <div style={{
                      position: 'absolute', top: 8, left: 10,
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'rgba(255,153,51,0.7)',
                    }} />
                  </div>
                ))}
              </div>

              <div style={{
                fontFamily: 'var(--font-inter),sans-serif',
                fontSize: 'clamp(11px,0.9vw,14px)', letterSpacing: '0.04em',
                color: 'rgba(250,248,240,0.7)',
              }}>
                at{' '}
                <span style={{ color: '#fff', fontWeight: 600 }}>
                  {origin ? origin.replace(/^https?:\/\//, '') : 'vikas75.in'}
                </span>
                {' '}on your phone
              </div>
            </div>
          </div>

          {/* ── SEATS ─────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: seatGap, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              {visiblePlayers.map(p => (
                <FilledSeat key={p.id} player={p} w={seatW} h={seatH} />
              ))}
              {Array.from({ length: openSeats }).map((_, i) => (
                <OpenSeat key={`open-${i}`} w={seatW} h={seatH} />
              ))}
              {extraCount > 0 && (
                <div style={{
                  width: seatW, height: seatH,
                  borderRadius: 18, flexShrink: 0,
                  border: '1px solid rgba(255,153,51,0.22)',
                  background: 'rgba(26,58,110,0.3)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <span style={{
                    fontFamily: 'var(--font-yatra),var(--font-inter)',
                    fontSize: Math.round(seatW * 0.3), color: '#FF9933', lineHeight: 1,
                  }}>+{extraCount}</span>
                  <span style={{
                    fontFamily: 'var(--font-inter),sans-serif',
                    fontSize: Math.round(seatW * 0.068), fontWeight: 600,
                    letterSpacing: '0.16em', textTransform: 'uppercase' as const,
                    color: 'rgba(250,248,240,0.5)',
                  }}>more</span>
                </div>
              )}
            </div>

            <div style={{
              fontFamily: 'var(--font-inter),sans-serif',
              fontSize: 'clamp(9px,0.76vw,11px)', fontWeight: 600,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: 'rgba(250,248,240,0.45)',
            }}>
              <span style={{ color: '#FF9933' }}>{players.length}</span>
              {' '}{players.length === 1 ? 'player' : 'players'} joined · waiting for host to start
            </div>
          </div>

          {/* ── BANTER STRIP — new player join chips ──────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 12, minHeight: 38, flexWrap: 'wrap',
          }}>
            {banterItems.length === 0 ? (
              <span style={{
                fontFamily: 'var(--font-inter),sans-serif',
                fontSize: 'clamp(11px,0.9vw,13px)', fontStyle: 'italic',
                color: 'rgba(250,248,240,0.45)',
              }}>quiet so far. someone always breaks it.</span>
            ) : (
              banterItems.map(b => (
                <div key={b.key} style={{
                  display: 'inline-flex', alignItems: 'baseline', gap: 8,
                  padding: '8px 14px', borderRadius: 999,
                  background: 'rgba(250,248,240,0.04)',
                  border: '1px solid rgba(250,248,240,0.14)',
                  animation: 'vkChipIn 0.4s cubic-bezier(.2,.8,.25,1) both',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-inter),sans-serif',
                    fontSize: 'clamp(10px,0.9vw,12px)', fontWeight: 700,
                    letterSpacing: '0.04em', color: '#FF9933',
                  }}>{b.name}</span>
                  <span style={{
                    fontFamily: 'var(--font-inter),sans-serif',
                    fontSize: 'clamp(11px,0.9vw,13px)',
                    color: 'rgba(250,248,240,0.7)', letterSpacing: '0.005em',
                  }}>just joined</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── FOOTER — "waiting for host" spinner ───────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 'clamp(52px,7vh,76px)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            height: 52, padding: '0 28px',
            border: '1px solid rgba(255,153,51,0.3)', borderRadius: 8,
            background: 'rgba(255,153,51,0.05)',
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              border: '2px solid rgba(255,153,51,0.25)', borderTopColor: '#FF9933',
              animation: 'vkSpin 0.9s linear infinite',
            }} />
            <span style={{
              fontFamily: 'var(--font-inter),sans-serif',
              fontSize: 'clamp(12px,1vw,14px)', fontWeight: 500,
              letterSpacing: '0.04em', color: '#FF9933',
            }}>Waiting for the host to deal…</span>
          </div>
        </div>

        {/* ── BOTTOM STRIP — attribution, centred ──────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          paddingBottom: 'clamp(8px,1vh,14px)',
        }}>
          <div style={{
            fontFamily: 'var(--font-inter),sans-serif',
            fontSize: 'clamp(9px,0.76vw,11px)',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'rgba(250,248,240,0.4)', textAlign: 'center',
          }}>An initiative of the Office of Shri Sujeet Kumar</div>
        </div>

        {/* ── TICKER — "Did you know" rotating facts ────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: 'clamp(10px,1.3vh,16px) 0',
          borderTop: '1px solid rgba(250,248,240,0.14)',
        }}>
          <span style={{
            flexShrink: 0,
            fontFamily: 'var(--font-inter),sans-serif',
            fontSize: 'clamp(8px,0.76vw,10px)', fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: '#FF9933',
            paddingRight: 16, borderRight: '1px solid rgba(250,248,240,0.14)',
          }}>Did you know</span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <span key={factIdx} style={{
              display: 'block',
              fontFamily: 'var(--font-inter),sans-serif',
              fontSize: 'clamp(11px,1vw,14px)',
              color: 'rgba(250,248,240,0.7)', letterSpacing: '0.005em',
              animation: 'vkFactIn 0.5s ease both',
            }}>{FACTS[factIdx]}</span>
          </div>
          <span style={{
            flexShrink: 0,
            fontFamily: 'var(--font-inter),sans-serif',
            fontSize: 'clamp(8px,0.76vw,10px)', fontWeight: 600,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'rgba(250,248,240,0.45)',
            paddingLeft: 16, borderLeft: '1px solid rgba(250,248,240,0.14)',
          }}>{room.totalRounds} rounds · funniest wins</span>
        </div>

      </div>

      <style>{`
        @keyframes vkPulseDot {
          0%, 100% { box-shadow: 0 0 0 3px rgba(19,136,8,0.10); }
          50%       { box-shadow: 0 0 0 6px rgba(19,136,8,0.22); }
        }
        @keyframes vkSeatIn {
          from { transform: translateY(16px) scale(0.95); }
          to   { transform: translateY(0)    scale(1);    }
        }
        @keyframes vkChipIn {
          from { transform: translateY(8px) scale(0.96); opacity: 0; }
          to   { transform: translateY(0)   scale(1);    opacity: 1; }
        }
        @keyframes vkFactIn {
          from { opacity: 0; transform: translateX(14px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes vkSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
