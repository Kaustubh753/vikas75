'use client';
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Avatar from '@/lib/avatars';
import { getMusicManager } from '@/lib/music';
import type { GameRoom } from '@/types/game';
import { FaGlobe, FaInstagram, FaXTwitter, FaLinkedin, FaFacebook, FaYoutube } from 'react-icons/fa6';

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((m) => ({ default: m.QRCodeSVG })),
  { ssr: false }
);

const SOCIAL = [
  { label: 'Website',   href: 'https://www.sujeetkofficial.com/',                                    Icon: FaGlobe     },
  { label: 'Instagram', href: 'https://www.instagram.com/sujeetkofficial/',                          Icon: FaInstagram  },
  { label: 'X',         href: 'https://x.com/SujeetKOfficial',                                       Icon: FaXTwitter   },
  { label: 'LinkedIn',  href: 'https://www.linkedin.com/in/sujeet--kumar/',                          Icon: FaLinkedin   },
  { label: 'Facebook',  href: 'https://www.facebook.com/SujeetKOfficial/',                           Icon: FaFacebook   },
  { label: 'YouTube',   href: 'https://www.youtube.com/channel/UC6yGMDZkljNPgX8vGUcBTbA/playlists', Icon: FaYoutube    },
];

interface Props { room: GameRoom }

export default function ProjectorLobby({ room }: Props) {
  const [origin, setOrigin] = useState('');
  const [winW, setWinW]     = useState(1920); // SSR-safe; updated in useEffect

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
  // Room codes are uppercase letters only (A-Z, no I/O)
  const letters  = room.code.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4).split('');
  while (letters.length < 4) letters.push('');

  const qrSize = Math.round(winW * 0.13); // ~250px at 1920

  // Panel style — mirrors the HTP panel on the landing page
  const panelStyle: React.CSSProperties = {
    width: '100%',
    background: 'linear-gradient(180deg,rgba(255,153,51,.05) 0%,rgba(255,153,51,0) 22%),linear-gradient(180deg,rgba(5,11,28,.85) 0%,rgba(2,6,18,.9) 100%)',
    border: '1px solid rgba(255,153,51,.22)',
    borderRadius: 12,
    boxShadow: '0 24px 48px rgba(0,0,0,.45),0 6px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,153,51,.18),inset 0 0 0 1px rgba(255,255,255,.02)',
    backdropFilter: 'blur(8px)',
    boxSizing: 'border-box',
  };

  // Stable particle list for the useMemo dep
  const _particles = useMemo(() => null, []);
  void _particles;

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', isolation: 'isolate' }}>

      {/* ── Background — exactly matches landing page ────────────── */}
      <div style={{ position: 'absolute', inset: 0, background: '#07101f', zIndex: 0 }} />

      {/* Saffron radial glow from top */}
      <div style={{
        position: 'absolute', left: '50%', top: '-25%',
        width: '83vw', height: '100vh',
        transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse at center,rgba(255,153,51,.16) 0%,rgba(255,153,51,.06) 28%,rgba(255,153,51,0) 60%)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Film grain overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        opacity: 0.12, mixBlendMode: 'overlay', pointerEvents: 'none', zIndex: 2,
      }} />

      {/* ── 3-column grid — same structure as landing page ────────── */}
      <div style={{
        position: 'relative', zIndex: 3,
        width: '100%', height: '100%',
        padding: 'clamp(20px, 3.5vh, 48px) clamp(24px, 3.5vw, 56px) clamp(14px, 2.2vh, 30px)',
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 24vw) 1fr minmax(230px, 22vw)',
        gridTemplateRows: '1fr auto',
        gap: '0 clamp(12px, 1.8vw, 24px)',
        alignItems: 'stretch',
        boxSizing: 'border-box',
      }}>

        {/* ── LEFT: logo + player list ─────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28, alignItems: 'flex-start' }}>

          {/* Logo unit — saffron left bar, same as landing page */}
          <div style={{ display: 'inline-flex', flexDirection: 'column', position: 'relative', paddingLeft: 16, alignItems: 'stretch' }}>
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
            <div style={{
              fontFamily: 'var(--font-bebas),sans-serif',
              fontWeight: 400,
              fontSize: 'clamp(44px, 5.5vw, 78px)',
              lineHeight: 0.9,
              letterSpacing: '-0.01em', color: '#fff',
              whiteSpace: 'nowrap',
            }}>
              Vikas 75
            </div>
            <div style={{
              fontFamily: 'var(--font-inter),sans-serif', fontWeight: 400,
              fontSize: 'clamp(12px, 1.3vw, 19px)',
              lineHeight: 1.35, color: '#FF9933', letterSpacing: '-0.005em',
              marginTop: 12, whiteSpace: 'nowrap',
            }}>
              The best answer isn&apos;t always right
            </div>
          </div>

          {/* Player list */}
          <div style={{ width: '100%' }}>
            <div style={{
              fontFamily: 'var(--font-inter),sans-serif', fontWeight: 500,
              fontSize: 'clamp(8px, 0.68vw, 10px)',
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: 'rgba(250,248,240,.4)', marginBottom: 12,
            }}>
              Players joined — {players.length}
            </div>

            {players.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'rgba(255,153,51,0.5)',
                    animation: 'vkPulse 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
                <span style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: 'clamp(11px, 0.9vw, 14px)', color: 'rgba(250,248,240,.4)' }}>
                  Waiting for players…
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {players.map(p => (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{
                      borderRadius: '50%', overflow: 'hidden',
                      border: '1.5px solid rgba(255,153,51,0.35)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    }}>
                      <Avatar id={p.avatarId} size={Math.round(winW * 0.028)} />
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-inter),sans-serif',
                      fontSize: 'clamp(9px, 0.6vw, 11px)', fontWeight: 500,
                      color: 'rgba(250,248,240,.8)',
                      maxWidth: '3.5vw', textAlign: 'center',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: room code ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(12px, 2vh, 28px)' }}>

          <div style={{
            fontFamily: 'var(--font-inter),sans-serif', fontWeight: 500,
            fontSize: 'clamp(9px, 0.76vw, 12px)',
            letterSpacing: '0.28em', textTransform: 'uppercase',
            color: 'rgba(250,248,240,.5)',
          }}>
            Room Code
          </div>

          {/* 4 letter boxes */}
          <div style={{ display: 'flex', gap: 'clamp(8px, 1vw, 16px)' }}>
            {letters.map((l, i) => (
              <div key={i} style={{
                width: 'clamp(72px, 8.5vw, 130px)',
                height: 'clamp(96px, 11.5vh, 160px)',
                display: 'grid', placeItems: 'center',
                background: 'linear-gradient(180deg,rgba(255,153,51,.06) 0%,rgba(255,153,51,0) 100%)',
                border: '1px solid rgba(255,153,51,.3)',
                borderRadius: 10,
                boxShadow: 'inset 0 1px 0 rgba(255,153,51,.15), 0 8px 32px rgba(0,0,0,.4)',
              }}>
                <span style={{
                  fontFamily: 'var(--font-bebas),sans-serif',
                  fontSize: 'clamp(64px, 7.5vw, 112px)',
                  lineHeight: 1, color: '#FF9933',
                  letterSpacing: '-0.02em',
                  textShadow: '0 0 32px rgba(255,153,51,.35)',
                  userSelect: 'none',
                }}>{l}</span>
              </div>
            ))}
          </div>

          {/* "go to vikas75.in" hint */}
          <div style={{
            fontFamily: 'var(--font-inter),sans-serif', fontWeight: 400,
            fontSize: 'clamp(11px, 0.9vw, 14px)',
            color: 'rgba(250,248,240,.4)', letterSpacing: '0.04em',
          }}>
            go to{' '}
            <span style={{ color: 'rgba(250,248,240,.7)', fontWeight: 500 }}>vikas75.in</span>
            {' '}on your phone and enter the code
          </div>
        </div>

        {/* ── RIGHT: QR panel — styled like the HTP panel ───────────── */}
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}>
          <div style={{ ...panelStyle, padding: 'clamp(16px, 1.5vw, 24px) clamp(14px, 1.3vw, 20px)', display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Panel header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 16, paddingBottom: 14,
              borderBottom: '1px solid rgba(250,248,240,.1)',
            }}>
              <span style={{
                fontFamily: 'var(--font-inter),sans-serif', fontWeight: 500,
                fontSize: 'clamp(8px, 0.76vw, 11px)',
                color: 'rgba(250,248,240,.7)', letterSpacing: '0.22em', textTransform: 'uppercase',
              }}>Scan to join</span>
              <span style={{
                fontFamily: 'var(--font-inter),sans-serif', fontWeight: 500,
                fontSize: 'clamp(8px, 0.76vw, 11px)',
                color: '#FF9933', letterSpacing: '0.14em',
              }}>Phone Camera</span>
            </div>

            {/* QR code */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              {joinUrl ? (
                <div style={{
                  background: '#faf8f0', padding: 12, borderRadius: 10,
                  boxShadow: '0 4px 24px rgba(0,0,0,.5)',
                }}>
                  <QRCodeSVG value={joinUrl} size={qrSize} level="M" />
                </div>
              ) : (
                <div style={{
                  width: qrSize, height: qrSize,
                  background: 'rgba(250,248,240,.04)', borderRadius: 10,
                  display: 'grid', placeItems: 'center',
                }}>
                  <span style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: 12, color: 'rgba(250,248,240,.3)' }}>Loading…</span>
                </div>
              )}

              {/* URL below QR */}
              <div style={{
                fontFamily: 'var(--font-inter),sans-serif', fontWeight: 500,
                fontSize: 'clamp(11px, 0.9vw, 14px)',
                color: 'rgba(250,248,240,.5)', letterSpacing: '0.04em',
                textAlign: 'center',
              }}>
                {origin ? origin.replace(/^https?:\/\//, '') : 'vikas75.in'}
              </div>
            </div>

            {/* Panel footer — "Free · No App" */}
            <div style={{
              marginTop: 16, paddingTop: 14,
              borderTop: '1px solid rgba(250,248,240,.1)',
              display: 'flex', justifyContent: 'center',
              fontFamily: 'var(--font-inter),sans-serif', fontWeight: 500,
              fontSize: 'clamp(8px, 0.68vw, 10px)',
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: 'rgba(250,248,240,.3)',
            }}>
              Free · No App · No Signup
            </div>
          </div>
        </div>

        {/* ── BOTTOM STRIP — same as landing page ───────────────────── */}
        <div style={{
          gridColumn: '1 / -1',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 10, paddingTop: 16,
          borderTop: '1px solid rgba(250,248,240,.14)',
        }}>
          {/* Social icons — icon-only, same as landing page */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {SOCIAL.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                style={{ color: 'rgba(250,248,240,.6)', transition: 'color .15s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(14px, 1.25vw, 18px)' }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#FF9933'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,248,240,.6)'}
              >
                <Icon />
              </a>
            ))}
          </div>

          <div style={{
            fontFamily: 'var(--font-inter),sans-serif',
            fontSize: 'clamp(9px, 0.76vw, 11px)',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'rgba(250,248,240,.4)',
          }}>
            An initiative of the Office of Shri Sujeet Kumar
          </div>
        </div>
      </div>

      {/* Pulse animation for waiting dots */}
      <style>{`
        @keyframes vkPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
