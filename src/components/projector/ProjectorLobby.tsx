'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Avatar from '@/lib/avatars';
import { getLobbyMusic } from '@/lib/music-manager';
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

// ── Retro Doordarshan 80s palette ─────────────────────────────────────────────
const C = {
  paper:    '#f0dba8',           // warm parchment base
  paperLt:  '#faf3db',           // cream for panels
  ink:      '#1c0d02',           // deep warm near-black
  inkMid:   '#4a2710',           // medium brown
  inkLight: '#7a5030',           // warm sienna for secondary text
  saffron:  '#FF9933',           // brand saffron
  saff15:   'rgba(255,153,51,.15)',
  maroon:   '#6b1515',           // deep maroon for accents
  green:    '#1a5e15',           // tricolor green
  shadow:   'rgba(28,13,2,0.18)',
};

interface Props { room: GameRoom }

export default function ProjectorLobby({ room }: Props) {
  const [origin, setOrigin] = useState('');
  const [winW, setWinW]     = useState(1920);

  useEffect(() => {
    setOrigin(window.location.origin);
    getLobbyMusic().autoPlay();
    const update = () => setWinW(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const players = Object.values(room.players);
  const joinUrl = origin ? `${origin}/?code=${room.code}` : '';
  const letters = room.code.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4).split('');
  while (letters.length < 4) letters.push('');

  const qrSize = Math.round(winW * 0.13);

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', isolation: 'isolate' }}>

      {/* ── Parchment background ─────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 48% 42%, ${C.paperLt} 0%, ${C.paper} 52%, #d4a860 100%)`,
        zIndex: 0,
      }} />

      {/* Warm paper grain */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.38  0 0 0 0 0.18  0 0 0 0 0  0 0 0 0.22 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        opacity: 0.55, pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Screen-edge vignette — CRT curvature suggestion */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 55%, rgba(12,4,0,0.52) 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* ── Tricolor top strip ───────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 7, display: 'flex', zIndex: 20,
      }}>
        <div style={{ flex: 1, background: C.saffron }} />
        <div style={{ flex: 1, background: '#fff' }} />
        <div style={{ flex: 1, background: C.green }} />
      </div>

      {/* ── Decorative double border ─────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 16,
        border: `2px solid rgba(28,13,2,0.2)`,
        pointerEvents: 'none', zIndex: 3,
      }} />
      <div style={{
        position: 'absolute', inset: 21,
        border: `1px solid rgba(28,13,2,0.1)`,
        pointerEvents: 'none', zIndex: 3,
      }} />

      {/* ── ON AIR badge — top right ─────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 28, right: 30, zIndex: 15,
        background: C.maroon, color: C.paperLt,
        fontFamily: 'var(--font-inter),sans-serif',
        fontSize: 'clamp(8px,0.62vw,10px)', fontWeight: 700,
        letterSpacing: '0.28em', textTransform: 'uppercase',
        padding: '4px 12px',
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#ff3333',
          animation: 'vkBlink 1.4s ease-in-out infinite',
          flexShrink: 0,
        }} />
        On Air
      </div>

      {/* ── 3-column grid ────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 4,
        width: '100%', height: '100%',
        padding: 'clamp(28px, 4.5vh, 60px) clamp(32px, 4.5vw, 68px) clamp(18px, 2.5vh, 36px)',
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 24vw) 1fr minmax(230px, 22vw)',
        gridTemplateRows: '1fr auto',
        gap: '0 clamp(12px, 1.8vw, 24px)',
        alignItems: 'stretch',
        boxSizing: 'border-box',
      }}>

        {/* ── LEFT: logo + player list ─────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28, alignItems: 'flex-start' }}>

          {/* Logo unit */}
          <div style={{ display: 'inline-flex', flexDirection: 'column', position: 'relative', paddingLeft: 18 }}>
            <div style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, background: C.saffron }} />

            <div style={{
              fontFamily: 'var(--font-inter),sans-serif', fontWeight: 500,
              fontSize: 'clamp(8px, 0.64vw, 10px)',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: C.inkLight, marginBottom: 8, whiteSpace: 'nowrap',
            }}>
              An initiative of the Office of Shri Sujeet Kumar
            </div>

            <div style={{
              fontFamily: 'var(--font-bebas),sans-serif', fontWeight: 400,
              fontSize: 'clamp(44px, 5.5vw, 78px)',
              lineHeight: 0.9, letterSpacing: '-0.01em',
              color: C.ink, whiteSpace: 'nowrap',
            }}>
              Vikas 75
            </div>

            <div style={{
              fontFamily: 'var(--font-devanagari),sans-serif', fontWeight: 700,
              fontSize: 'clamp(14px, 1.35vw, 20px)',
              color: C.saffron, marginTop: 8, whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
            }}>
              विकास ७५
            </div>

            <div style={{
              fontFamily: 'var(--font-inter),sans-serif', fontWeight: 400,
              fontSize: 'clamp(10px, 0.88vw, 13px)',
              color: C.inkLight, marginTop: 5,
              fontStyle: 'italic', whiteSpace: 'nowrap',
            }}>
              The best answer isn&apos;t always right
            </div>
          </div>

          {/* Player list */}
          <div style={{ width: '100%' }}>
            {/* Caption-chip label */}
            <div style={{
              display: 'inline-block',
              background: C.ink, color: C.paperLt,
              fontFamily: 'var(--font-inter),sans-serif', fontWeight: 700,
              fontSize: 'clamp(7px, 0.6vw, 9px)',
              letterSpacing: '0.26em', textTransform: 'uppercase',
              padding: '3px 10px', marginBottom: 12,
            }}>
              Players — {players.length}
            </div>

            {players.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: C.saffron,
                    animation: 'vkPulse 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
                <span style={{
                  fontFamily: 'var(--font-inter),sans-serif',
                  fontSize: 'clamp(11px, 0.9vw, 14px)',
                  color: C.inkLight, fontStyle: 'italic',
                }}>
                  Waiting for players…
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {players.map(p => (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{
                      borderRadius: '50%', overflow: 'hidden',
                      border: `2px solid rgba(28,13,2,0.28)`,
                      boxShadow: `1px 1px 0 ${C.shadow}`,
                    }}>
                      <Avatar id={p.avatarId} size={Math.round(winW * 0.028)} />
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-inter),sans-serif',
                      fontSize: 'clamp(9px, 0.6vw, 11px)', fontWeight: 600,
                      color: C.ink,
                      maxWidth: '3.5vw', textAlign: 'center',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: room code ─────────────────────────────────── */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 'clamp(10px, 1.8vh, 22px)',
        }}>

          {/* Caption-chip label */}
          <div style={{
            background: C.ink, color: C.paperLt,
            fontFamily: 'var(--font-inter),sans-serif', fontWeight: 700,
            fontSize: 'clamp(9px, 0.76vw, 12px)',
            letterSpacing: '0.28em', textTransform: 'uppercase',
            padding: '4px 22px',
          }}>
            Room Code
          </div>

          {/* 4 letter boxes */}
          <div style={{ display: 'flex', gap: 'clamp(8px, 1vw, 14px)' }}>
            {letters.map((l, i) => (
              <div key={i} style={{
                width: 'clamp(72px, 8.5vw, 130px)',
                height: 'clamp(96px, 11.5vh, 160px)',
                display: 'grid', placeItems: 'center',
                background: C.paperLt,
                border: `2.5px solid ${C.ink}`,
                // Hard offset shadow — very Doordarshan
                boxShadow: `5px 5px 0 ${C.saffron}, 5px 5px 0 1px ${C.ink}`,
                position: 'relative',
              }}>
                <span style={{
                  fontFamily: 'var(--font-bebas),sans-serif',
                  fontSize: 'clamp(64px, 7.5vw, 112px)',
                  lineHeight: 1, color: C.saffron,
                  letterSpacing: '-0.02em',
                  userSelect: 'none',
                }}>{l}</span>
              </div>
            ))}
          </div>

          {/* English instruction */}
          <div style={{
            fontFamily: 'var(--font-inter),sans-serif', fontWeight: 400,
            fontSize: 'clamp(11px, 0.9vw, 14px)',
            color: C.inkMid,
          }}>
            go to{' '}
            <span style={{ color: C.ink, fontWeight: 700 }}>vikas75.in</span>
            {' '}on your phone and enter the code
          </div>

          {/* Hindi instruction */}
          <div style={{
            fontFamily: 'var(--font-devanagari),sans-serif', fontWeight: 500,
            fontSize: 'clamp(11px, 0.88vw, 13px)',
            color: C.inkLight,
          }}>
            अपने फ़ोन पर vikas75.in खोलें और कोड डालें
          </div>
        </div>

        {/* ── RIGHT: QR panel ───────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}>
          <div style={{
            width: '100%',
            background: C.paperLt,
            border: `2px solid rgba(28,13,2,0.22)`,
            boxShadow: `3px 3px 0 rgba(28,13,2,0.12)`,
            padding: 'clamp(16px, 1.5vw, 24px) clamp(14px, 1.3vw, 20px)',
            display: 'flex', flexDirection: 'column',
            boxSizing: 'border-box',
          }}>

            {/* Panel header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 14, paddingBottom: 12,
              borderBottom: `1px solid rgba(28,13,2,0.15)`,
            }}>
              <span style={{
                fontFamily: 'var(--font-inter),sans-serif', fontWeight: 700,
                fontSize: 'clamp(8px, 0.72vw, 11px)',
                color: C.inkLight, letterSpacing: '0.22em', textTransform: 'uppercase',
              }}>Scan to join</span>
              <span style={{
                background: C.saffron, color: C.ink,
                fontFamily: 'var(--font-inter),sans-serif', fontWeight: 800,
                fontSize: 'clamp(7px, 0.6vw, 9px)',
                letterSpacing: '0.16em', textTransform: 'uppercase',
                padding: '2px 8px',
              }}>Camera</span>
            </div>

            {/* QR code */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              {joinUrl ? (
                <div style={{
                  background: '#fff', padding: 10,
                  border: `2px solid rgba(28,13,2,0.18)`,
                  boxShadow: `2px 2px 0 rgba(28,13,2,0.1)`,
                }}>
                  <QRCodeSVG value={joinUrl} size={qrSize} level="M" />
                </div>
              ) : (
                <div style={{
                  width: qrSize, height: qrSize,
                  background: 'rgba(28,13,2,.04)',
                  border: `1px dashed rgba(28,13,2,.2)`,
                  display: 'grid', placeItems: 'center',
                }}>
                  <span style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: 12, color: C.inkLight }}>Loading…</span>
                </div>
              )}

              {/* URL */}
              <div style={{
                fontFamily: 'var(--font-inter),sans-serif', fontWeight: 600,
                fontSize: 'clamp(11px, 0.9vw, 14px)',
                color: C.inkMid, textAlign: 'center',
              }}>
                {origin ? origin.replace(/^https?:\/\//, '') : 'vikas75.in'}
              </div>
            </div>

            {/* Panel footer */}
            <div style={{
              marginTop: 14, paddingTop: 12,
              borderTop: `1px solid rgba(28,13,2,0.15)`,
              display: 'flex', justifyContent: 'center',
              fontFamily: 'var(--font-inter),sans-serif', fontWeight: 600,
              fontSize: 'clamp(8px, 0.65vw, 10px)',
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: C.inkLight,
            }}>
              Free · No App · No Signup
            </div>
          </div>
        </div>

        {/* ── BOTTOM STRIP ─────────────────────────────────────── */}
        <div style={{
          gridColumn: '1 / -1',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 10, paddingTop: 14,
          borderTop: `1px solid rgba(28,13,2,0.18)`,
        }}>
          {/* Social icons */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {SOCIAL.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                style={{ color: C.inkLight, transition: 'color .15s ease', display: 'flex', alignItems: 'center', fontSize: 'clamp(14px, 1.25vw, 18px)' }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = C.saffron}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = C.inkLight}
              >
                <Icon />
              </a>
            ))}
          </div>

          <div style={{
            fontFamily: 'var(--font-inter),sans-serif',
            fontSize: 'clamp(9px, 0.76vw, 11px)',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: C.inkLight,
          }}>
            An initiative of the Office of Shri Sujeet Kumar
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes vkPulse { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
        @keyframes vkBlink { 0%,100%{opacity:1} 50%{opacity:.25} }
      `}</style>
    </div>
  );
}
