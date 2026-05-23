'use client';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Avatar from '@/lib/avatars';
import { getMusicManager } from '@/lib/music';
import type { GameRoom } from '@/types/game';
import { FaGlobe, FaInstagram, FaXTwitter, FaLinkedin, FaFacebook, FaYoutube } from 'react-icons/fa6';

// qrcode.react is only needed on the projector — lazy-load it to keep player bundles lean
const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((m) => ({ default: m.QRCodeSVG })),
  { ssr: false }
);

// ─── Social links ─────────────────────────────────────────────────────────────
const SOCIAL = [
  { handle: '@sujeetkofficial',   href: 'https://www.instagram.com/sujeetkofficial/',                          Icon: FaInstagram },
  { handle: '@SujeetKOfficial',    href: 'https://x.com/SujeetKOfficial',                                       Icon: FaXTwitter  },
  { handle: 'Sujeet Kumar',        href: 'https://www.linkedin.com/in/sujeet--kumar/',                          Icon: FaLinkedin  },
  { handle: 'SujeetKOfficial',     href: 'https://www.facebook.com/SujeetKOfficial/',                           Icon: FaFacebook  },
  { handle: '@SujeetKOfficial',    href: 'https://www.youtube.com/channel/UC6yGMDZkljNPgX8vGUcBTbA/playlists', Icon: FaYoutube   },
  { handle: 'sujeetkofficial.com', href: 'https://www.sujeetkofficial.com/',                                    Icon: FaGlobe     },
];

// Slots shown even before players join — fills the grid so it never looks empty
const TARGET_SLOTS = 14;

interface Props { room: GameRoom }

export default function ProjectorLobby({ room }: Props) {
  const [origin, setOrigin]   = useState('');
  // winW starts at 1920 (design baseline) so the first server render is correct;
  // updated to actual viewport width on the client.
  const [winW, setWinW]       = useState(1920);

  useEffect(() => {
    setOrigin(window.location.origin);
    getMusicManager().play('lobby');
    const update = () => setWinW(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const players  = Object.values(room.players);
  const joinUrl  = origin ? `${origin}/?code=${room.code}` : '';
  // Room code — sanitise to A-Z + digits, up to 4 chars (matches game-engine charset)
  const letters  = room.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).split('');
  while (letters.length < 4) letters.push('');

  // QR and avatar sizes scale with viewport width
  const qrSize     = Math.round(winW * 0.152);   // ~292 px at 1920
  const avatarSize = Math.round(winW * 0.048);   // ~92 px at 1920

  // Stable particle field — generated once on mount, not on every render
  const particles = useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    id:    i,
    left:  5 + Math.random() * 90,         // %
    size:  4 + Math.random() * 10,         // px
    dur:   16 + Math.random() * 16,        // s
    delay: -(Math.random() * 24),          // negative = already mid-flight
    dx:    (Math.random() - 0.5) * 220,    // px horizontal drift
    op:    0.35 + Math.random() * 0.5,
    gold:  Math.random() > 0.55,
  })), []);

  // How many grid slots to show — always at least TARGET_SLOTS, grows if more players join
  const slotCount = Math.max(TARGET_SLOTS, players.length);
  const gridCols  = Math.min(slotCount, TARGET_SLOTS); // max 14 columns

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#060d1f' }}>

      {/* ── Scoped styles for animations + pseudo-elements ─────────────────── */}
      <style>{`
        @keyframes vk-livePulse {
          0%   { box-shadow: 0 0 0 0   rgba(255,153,51,.55); }
          100% { box-shadow: 0 0 0 14px rgba(255,153,51,0);   }
        }
        @keyframes vk-partFloat {
          0%   { transform: translate3d(0,0,0) scale(1);   opacity: 0; }
          10%  { opacity: var(--vkop); }
          90%  { opacity: var(--vkop); }
          100% { transform: translate3d(var(--vkdx),-110vh,0) scale(0.6); opacity: 0; }
        }
        @keyframes vk-chipIn {
          0%   { transform: translateY(28px) scale(.7); opacity: 0; filter: blur(6px); }
          60%  { filter: blur(0); }
          100% { transform: translateY(0) scale(1);   opacity: 1; filter: blur(0);  }
        }
        .vk-live-dot {
          width: 9px; height: 9px; border-radius: 50%;
          background: #FF9933;
          box-shadow: 0 0 0 4px rgba(255,153,51,.25);
          animation: vk-livePulse 1.6s ease-out infinite;
          display: inline-block; flex-shrink: 0;
        }
        .vk-chip-in { animation: vk-chipIn .55s cubic-bezier(.16,.84,.32,1) both; }

        /* Corner-bracket frame — requires pseudo-elements */
        .vk-frame { position: absolute; inset: 36px; pointer-events: none; }
        .vk-frame::before, .vk-frame::after,
        .vk-frame-i::before, .vk-frame-i::after {
          content: ''; position: absolute; width: 72px; height: 72px;
          border: 2px solid rgba(255,153,51,0.5);
        }
        .vk-frame::before   { top:    0; left:  0; border-right: 0; border-bottom: 0; }
        .vk-frame::after    { top:    0; right: 0; border-left:  0; border-bottom: 0; }
        .vk-frame-i         { position: absolute; inset: 0; }
        .vk-frame-i::before { bottom: 0; left:  0; border-right: 0; border-top: 0; }
        .vk-frame-i::after  { bottom: 0; right: 0; border-left:  0; border-top: 0; }

        /* Social pill links */
        .vk-soc {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 6px 10px 6px 8px; border-radius: 7px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.72); text-decoration: none;
          font-size: 0.68vw; font-family: var(--font-inter), sans-serif;
          font-weight: 500; letter-spacing: .02em;
          transition: background .2s, border-color .2s, color .2s;
          white-space: nowrap;
        }
        .vk-soc:hover {
          background: rgba(255,153,51,0.12);
          border-color: rgba(255,153,51,0.4);
          color: #fff;
        }
      `}</style>

      {/* ── Background layers ───────────────────────────────────────────────── */}

      {/* 1. Radial vignette — gives the stage its depth */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 35%, #214a8a 0%, #1a3a6e 35%, #0d1b35 75%, #060d1f 100%)',
      }} />

      {/* 2. Jali / mandala tiled SVG pattern — very low opacity */}
      <div style={{
        position: 'absolute', inset: 0, opacity: .07, mixBlendMode: 'screen',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><g fill='none' stroke='%23FFD700' stroke-width='1'><circle cx='80' cy='80' r='40'/><circle cx='80' cy='80' r='28'/><circle cx='80' cy='80' r='14'/><path d='M80 40 L80 120 M40 80 L120 80 M52 52 L108 108 M108 52 L52 108'/><circle cx='80' cy='80' r='4'/></g></svg>")`,
        backgroundSize: '160px 160px',
      }} />

      {/* 3. Spotlight cones from upper corners */}
      <div style={{
        position: 'absolute', width: '72vw', height: '72vw', borderRadius: '50%',
        left: '-26vw', top: '-36vw', filter: 'blur(80px)', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(255,153,51,0.20) 0%, transparent 60%)',
      }} />
      <div style={{
        position: 'absolute', width: '72vw', height: '72vw', borderRadius: '50%',
        right: '-26vw', top: '-36vw', filter: 'blur(80px)', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(255,215,0,0.14) 0%, transparent 60%)',
      }} />

      {/* 4. Bottom warm glow */}
      <div style={{
        position: 'absolute', left: '-10vw', right: '-10vw', bottom: '-30vh', height: '50vh',
        background: 'radial-gradient(ellipse 50% 50% at 50% 100%, rgba(255,153,51,0.16) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />

      {/* 5. Floating saffron/gold particles rising upward */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
          background: `radial-gradient(circle, ${p.gold ? '#FFD700' : '#FF9933'} 0%, transparent 70%)`,
          width: p.size, height: p.size,
          left: `${p.left}%`, bottom: '-10px',
          animation: `vk-partFloat ${p.dur}s linear infinite`,
          animationDelay: `${p.delay}s`,
          willChange: 'transform, opacity',
          '--vkdx': `${p.dx}px`,
          '--vkop': p.op,
        } as React.CSSProperties} />
      ))}

      {/* 6. CRT / projector scanlines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .04,
        background: 'repeating-linear-gradient(0deg, rgba(255,255,255,.6) 0 1px, transparent 1px 3px)',
      }} />

      {/* 7. Corner brackets */}
      <div className="vk-frame"><i className="vk-frame-i" /></div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0 }}>

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', top: '5.9vh', left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.55vh',
        }}>
          {/* Eyebrow: On Air · Game Show · Governance, Reimagined */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.73vw',
            fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600,
            fontSize: '0.83vw', lineHeight: 1,
            letterSpacing: '.32em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.62)',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.42vw', color: '#FF9933', fontWeight: 700 }}>
              <span className="vk-live-dot" />
              On Air
            </span>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,.3)', display: 'inline-block', flexShrink: 0 }} />
            <span>Game Show</span>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,.3)', display: 'inline-block', flexShrink: 0 }} />
            <span>Governance, Reimagined</span>
          </div>

          {/* Logo: VIKAS 75 + विकास ७५ + Season 01 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.67vw', marginTop: '0.31vh', whiteSpace: 'nowrap' }}>
            <div style={{
              fontFamily: 'var(--font-bebas), var(--font-inter), sans-serif',
              fontWeight: 400, fontSize: '7.7vw', lineHeight: .85,
              letterSpacing: '.02em', color: '#faf8f0',
              textShadow: '0 4px 24px rgba(0,0,0,.35)',
            }}>
              VIKAS{' '}
              <span style={{
                color: '#FF9933',
                textShadow: '0 0 24px rgba(255,153,51,.45), 0 4px 0 #b35c10',
              }}>75</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.37vh', paddingTop: '0.74vh' }}>
              <div style={{
                fontFamily: 'var(--font-devanagari), sans-serif',
                fontSize: '2.19vw', fontWeight: 600,
                color: '#FFD700', letterSpacing: '.04em', lineHeight: 1,
              }}>विकास ७५</div>
              <div style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '0.52vw', fontWeight: 700, letterSpacing: '.24em',
                textTransform: 'uppercase',
                color: '#0d1b35', background: '#FFD700',
                padding: '4px 9px', borderRadius: 3,
              }}>Season 01</div>
            </div>
          </div>

          {/* Tagline */}
          <div style={{
            marginTop: '0.37vh',
            fontFamily: 'var(--font-inter), sans-serif', fontWeight: 500,
            fontSize: '0.94vw', lineHeight: 1.3,
            letterSpacing: '.18em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.7)',
          }}>
            An Initiative of the Office of{' '}
            <b style={{ color: '#FFD700', fontWeight: 700, letterSpacing: '.2em' }}>Shri Sujeet Kumar</b>
          </div>
        </div>

        {/* ── HERO: QR card + Room code ──────────────────────────────────────── */}
        <div style={{
          position: 'absolute', top: '28.7vh', left: '7.3vw', right: '7.3vw',
          display: 'grid',
          gridTemplateColumns: '20.83vw 1fr',
          gap: '4.17vw',
          alignItems: 'center',
        }}>

          {/* QR card — cream with saffron glow border */}
          <div style={{
            width: '20.83vw', height: '20.83vw',
            background: '#faf8f0', borderRadius: '0.94vw', padding: '1.04vw',
            boxShadow: `
              0 0 0 0.26vw #FF9933,
              0 0 0 0.52vw rgba(255,153,51,0.18),
              0 2.08vw 4.69vw rgba(0,0,0,0.55),
              0 0 4.17vw rgba(255,153,51,0.15)
            `,
            display: 'flex', flexDirection: 'column',
            position: 'relative',
          }}>
            {/* Dashed outer ring */}
            <div style={{
              position: 'absolute', inset: '-0.94vw',
              borderRadius: '1.46vw',
              border: '1.5px dashed rgba(255,153,51,0.4)',
              pointerEvents: 'none',
            }} />

            {/* Card header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingBottom: '0.55vh',
              borderBottom: '1.5px dashed rgba(13,27,53,0.15)',
            }}>
              <div style={{
                fontFamily: 'var(--font-bebas), sans-serif',
                fontSize: '1.35vw', lineHeight: 1, color: '#0d1b35', letterSpacing: '.04em',
              }}>Scan to Play</div>
              <div style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '0.52vw', fontWeight: 700, letterSpacing: '.24em',
                textTransform: 'uppercase', color: '#1a3a6e',
                padding: '5px 9px', border: '1.5px solid #1a3a6e', borderRadius: 999,
              }}>Phone Camera</div>
            </div>

            {/* QR code */}
            <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
              {joinUrl ? (
                <div style={{ background: '#fff', padding: 8, borderRadius: 8 }}>
                  <QRCodeSVG value={joinUrl} size={qrSize} level="M" />
                </div>
              ) : (
                <div style={{
                  width: qrSize, height: qrSize,
                  background: 'rgba(13,27,53,0.08)',
                  borderRadius: 8, display: 'grid', placeItems: 'center',
                }}>
                  <div style={{ fontFamily: 'var(--font-inter)', fontSize: '0.73vw', color: 'rgba(13,27,53,0.4)' }}>Loading…</div>
                </div>
              )}
            </div>

            {/* Card footer */}
            <div style={{
              paddingTop: '0.55vh', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderTop: '1.5px dashed rgba(13,27,53,0.15)',
            }}>
              <div style={{
                fontFamily: 'var(--font-bebas), sans-serif',
                fontSize: '1.15vw', color: '#0d1b35', letterSpacing: '.04em',
              }}>
                vikas75<span style={{ color: '#FF9933' }}>.in</span>
              </div>
              <div style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '0.52vw', fontWeight: 600, letterSpacing: '.22em',
                textTransform: 'uppercase', color: 'rgba(13,27,53,0.55)',
              }}>Free · No App</div>
            </div>
          </div>

          {/* Room code panel */}
          <div style={{ paddingLeft: '1.04vw' }}>

            {/* OR divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.94vw', marginBottom: '0.83vh' }}>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,.3), transparent)', maxWidth: '4.17vw' }} />
              <span style={{
                fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600,
                fontSize: '0.73vw', letterSpacing: '.32em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.55)',
              }}>Or</span>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(255,255,255,.3), transparent)', maxWidth: '4.17vw' }} />
            </div>

            {/* Headline */}
            <div style={{
              fontFamily: 'var(--font-bebas), sans-serif',
              fontSize: '1.98vw', lineHeight: 1, color: '#fff', letterSpacing: '.04em', whiteSpace: 'nowrap',
            }}>
              Enter the Room Code
              <span style={{
                fontFamily: 'var(--font-devanagari), sans-serif',
                fontSize: '1.25vw', display: 'block',
                color: 'rgba(255,215,0,0.85)', marginTop: '0.31vh',
                fontWeight: 500, letterSpacing: '.02em',
              }}>कमरे का कोड दर्ज करें</span>
            </div>

            {/* 4 individual letter boxes */}
            <div style={{ marginTop: '1.46vh', display: 'inline-flex', gap: '0.83vw', position: 'relative' }}>
              {/* Glow backing */}
              <div style={{
                position: 'absolute', inset: '-1.15vh -1.46vw', borderRadius: '1.15vw',
                background: 'linear-gradient(180deg, rgba(255,153,51,0.10) 0%, rgba(255,153,51,0) 100%)',
                border: '1.5px solid rgba(255,153,51,0.28)', zIndex: 0,
              }} />
              {letters.map((l, i) => (
                <div key={i} style={{
                  position: 'relative', zIndex: 1,
                  width: '6.25vw', height: '15.74vh',
                  display: 'grid', placeItems: 'center',
                  background: 'linear-gradient(180deg, #0d1b35 0%, #1a3a6e 100%)',
                  border: '2px solid rgba(255,153,51,0.5)',
                  borderRadius: '0.63vw',
                  boxShadow: 'inset 0 0 1.88vw rgba(0,0,0,0.5), 0 0.42vw 2.08vw rgba(0,0,0,0.4)',
                  overflow: 'hidden',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-bebas), sans-serif',
                    fontSize: '8.13vw', lineHeight: .78,
                    color: '#FF9933', letterSpacing: 0,
                    textShadow: '0 0 1.35vw rgba(255,153,51,.55), 0 0 2.92vw rgba(255,153,51,.35)',
                    userSelect: 'none',
                  }}>{l || '—'}</span>
                  {/* Inner sheen */}
                  <div style={{
                    position: 'absolute', top: 6, left: 6, right: 6, height: '30%',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.06), transparent)',
                    borderRadius: '0.42vw', pointerEvents: 'none',
                  }} />
                </div>
              ))}
            </div>

            {/* "at vikas75.in on your phone" */}
            <div style={{
              marginTop: '1.46vh', display: 'flex', alignItems: 'center', gap: '0.73vw',
              color: 'rgba(255,255,255,0.7)',
              fontFamily: 'var(--font-inter), sans-serif', fontWeight: 500,
              fontSize: '0.83vw', lineHeight: 1.4, whiteSpace: 'nowrap',
            }}>
              <span>at</span>
              <span style={{
                fontFamily: 'var(--font-bebas), sans-serif', fontSize: '1.15vw',
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.22)',
                padding: '3px 11px 1px', borderRadius: 6,
                color: '#fff', letterSpacing: '.04em',
              }}>vikas75.in</span>
              <span>on your phone</span>
            </div>
          </div>
        </div>

        {/* ── JOINERS GRID ──────────────────────────────────────────────────── */}
        <div style={{ position: 'absolute', top: '70.37vh', left: '7.3vw', right: '7.3vw' }}>

          {/* Header row */}
          <div style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            padding: '0 4px 0.74vh',
            borderBottom: '1.5px solid rgba(255,153,51,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.94vw' }}>
              <span style={{
                fontFamily: 'var(--font-bebas), sans-serif',
                fontSize: '1.56vw', color: '#fff', letterSpacing: '.06em', whiteSpace: 'nowrap',
              }}>Waiting Room</span>
              <span style={{
                fontFamily: 'var(--font-inter), sans-serif', fontWeight: 500,
                fontSize: '0.73vw', letterSpacing: '.22em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap',
              }}>Game starts when host says go</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: '0.52vw',
              fontFamily: 'var(--font-bebas), sans-serif',
              color: '#FFD700', fontSize: '1.56vw', letterSpacing: '.04em', whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: '2.19vw', color: '#FF9933', lineHeight: .85 }}>
                {String(players.length).padStart(2, '0')}
              </span>
              <span>/ {String(TARGET_SLOTS).padStart(2, '0')}</span>
              <span style={{
                fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600,
                fontSize: '0.63vw', color: 'rgba(255,255,255,0.5)',
                letterSpacing: '.22em', textTransform: 'uppercase',
              }}>Players In</span>
            </div>
          </div>

          {/* Player grid */}
          <div style={{
            marginTop: '0.74vh',
            display: 'grid',
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gap: '0.42vw 0.42vw',
            padding: '4px 2px',
          }}>
            {Array.from({ length: slotCount }, (_, i) => {
              const p = players[i];
              return p ? (
                // Filled slot — real player
                <div key={p.id} className="vk-chip-in" style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.37vh',
                }}>
                  <div style={{
                    borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                    border: '2px solid rgba(255,153,51,0.45)',
                    boxShadow: '0 0 0 3px rgba(255,153,51,0.12)',
                  }}>
                    <Avatar id={p.avatarId} size={avatarSize} />
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontWeight: 600, fontSize: '0.68vw', lineHeight: 1,
                    color: '#fff', letterSpacing: '.01em',
                    textAlign: 'center', maxWidth: '5.73vw',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{p.name}</div>
                  <div style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontWeight: 500, fontSize: '0.52vw',
                    letterSpacing: '.18em', textTransform: 'uppercase',
                    color: 'rgba(255,215,0,0.7)',
                  }}>Ready</div>
                </div>
              ) : (
                // Empty slot — numbered placeholder
                <div key={`e-${i}`} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.37vh',
                  opacity: .18,
                }}>
                  <div style={{
                    width: avatarSize, height: avatarSize, borderRadius: '50%',
                    border: '2px dashed rgba(255,255,255,0.22)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-bebas), sans-serif',
                      fontSize: '1.35vw', color: 'rgba(255,255,255,0.3)', letterSpacing: '.04em',
                    }}>{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontWeight: 600, fontSize: '0.68vw',
                    color: 'rgba(255,255,255,0.18)',
                  }}>Waiting…</div>
                  <div style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontWeight: 500, fontSize: '0.52vw',
                    letterSpacing: '.18em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.15)',
                  }}>Slot {String(i + 1).padStart(2, '0')}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FOOTER ────────────────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', left: '7.3vw', right: '7.3vw', bottom: '3.89vh',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '1.25vw', paddingTop: '0.94vh',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          whiteSpace: 'nowrap',
        }}>
          {/* Attribution */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.73vw',
            fontFamily: 'var(--font-inter), sans-serif', fontWeight: 500,
            fontSize: '0.68vw', lineHeight: 1.3,
            color: 'rgba(255,255,255,0.55)', letterSpacing: '.04em',
          }}>
            <div style={{
              width: '1.98vw', height: '1.98vw', borderRadius: '50%',
              border: '1.5px solid #FFD700', flexShrink: 0,
              display: 'grid', placeItems: 'center',
              fontFamily: 'var(--font-bebas), sans-serif',
              color: '#FFD700', fontSize: '1.04vw', lineHeight: 1, letterSpacing: 0,
            }}>SK</div>
            <span>
              Made by the team at the Office of{' '}
              <b style={{ color: '#fff', fontWeight: 600, letterSpacing: '.06em' }}>Shri Sujeet Kumar</b>, MP
            </span>
          </div>

          {/* Social links */}
          <div style={{ display: 'flex', gap: '0.42vw' }}>
            {SOCIAL.map(({ handle, href, Icon }) => (
              <a key={handle} href={href} target="_blank" rel="noopener noreferrer"
                 className="vk-soc" aria-label={handle}>
                <Icon style={{ width: '0.94vw', height: '0.94vw', flexShrink: 0 }} />
                <span>{handle}</span>
              </a>
            ))}
          </div>

          {/* Version tag */}
          <div style={{
            fontFamily: 'var(--font-inter), sans-serif', fontWeight: 500,
            fontSize: '0.57vw', letterSpacing: '.28em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)', textAlign: 'right',
          }}>
            v75 · <b style={{ color: '#FF9933', fontWeight: 700 }}>Live</b>
          </div>
        </div>

      </div>{/* /content */}
    </div>
  );
}
