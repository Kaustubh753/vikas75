'use client';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Avatar from '@/lib/avatars';
import type { GameRoom, Player } from '@/types/game';

interface Props {
  room: GameRoom;
  playerId: string;
}

/* The player's lobby. Built from the same parts as the projector lobby — the cream code tiles,
 * the navy seat cards with their green READY badge, the phase pill, the waiting bar — so the
 * phone in your hand and the screen on the wall read as one game rather than two products. */

const SAFFRON = '#FF9933';
const CREAM = '#faf8f0';
const INK = '#0d1b35';

function CodeTile({ char, i }: { char: string; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, rotate: i % 2 ? 2 : -2 }}
      animate={{ opacity: 1, y: 0, rotate: i % 2 ? 1.5 : -1.5 }}
      transition={{ delay: 0.05 * i, type: 'spring', stiffness: 220, damping: 18 }}
      style={{
        position: 'relative',
        width: 54, height: 64, borderRadius: 10,
        background: CREAM, color: INK,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-inter),sans-serif', fontWeight: 700, fontSize: 30,
        boxShadow: '0 10px 22px rgba(0,0,0,0.45), inset 0 -2px 0 rgba(0,0,0,0.08)',
      }}
    >
      {/* the same saffron pip the projector's tiles carry */}
      <span style={{ position: 'absolute', top: 7, left: 8, width: 5, height: 5, borderRadius: '50%', background: SAFFRON, opacity: 0.75 }} />
      {char}
    </motion.div>
  );
}

function SeatCard({ player, isMe, isHost, delay }: { player: Player; isMe: boolean; isHost: boolean; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
        padding: '12px 8px', borderRadius: 16,
        background: isMe
          ? 'linear-gradient(180deg,rgba(255,153,51,0.16) 0%,rgba(255,153,51,0.05) 100%)'
          : 'linear-gradient(180deg,rgba(26,58,110,0.55) 0%,rgba(26,58,110,0.22) 100%)',
        border: `1px solid ${isMe ? 'rgba(255,153,51,0.45)' : 'rgba(255,153,51,0.18)'}`,
        boxShadow: '0 12px 24px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div
        // Landing mark for the join animation — the card that turned over on the join screen
        // flies here and dissolves into this seat. Purely a hook; see `turn-timeline.ts`.
        data-vikas-my-seat={isMe ? '' : undefined}
        style={{
          borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          border: `2px solid ${isMe ? 'rgba(255,153,51,0.7)' : 'rgba(255,153,51,0.3)'}`,
        }}
      >
        <Avatar id={player.avatarId} size={54} />
      </div>
      <span style={{
        fontFamily: 'var(--font-inter),sans-serif', fontWeight: 600, fontSize: 13, color: '#fff',
        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{player.name}</span>
      <span style={{
        fontFamily: 'var(--font-inter),sans-serif', fontSize: 8.5, fontWeight: 700,
        letterSpacing: '0.16em', textTransform: 'uppercase',
        color: isHost ? SAFFRON : '#138808',
        background: isHost ? 'rgba(255,153,51,0.12)' : 'rgba(19,136,8,0.12)',
        border: `1px solid ${isHost ? 'rgba(255,153,51,0.3)' : 'rgba(19,136,8,0.3)'}`,
        borderRadius: 999, padding: '2px 8px',
      }}>{isHost ? 'host' : isMe ? 'you' : 'ready'}</span>
    </motion.div>
  );
}

export default function PlayerLobby({ room, playerId }: Props) {
  const me = room.players[playerId];
  const players = Object.values(room.players);
  // Own seat first — on a phone you should find yourself without hunting.
  const ordered = [...players].sort((a, b) => (a.id === playerId ? -1 : b.id === playerId ? 1 : 0));

  async function handleShare() {
    const url = `${window.location.origin}/join?code=${room.code}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Vikas 75', text: `Join my Vikas 75 game! Room code: ${room.code}`, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Link copied!');
    }
  }

  return (
    <div className="flex flex-col items-center px-4 pb-6" style={{ gap: 18, paddingTop: 8 }}>

      {/* Phase pill + count, mirroring the projector header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontFamily: 'var(--font-inter),sans-serif', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.22em', textTransform: 'uppercase', color: SAFFRON,
          border: '1px solid rgba(255,153,51,0.35)', borderRadius: 999, padding: '4px 11px',
        }}>Lobby</span>
        <span style={{
          fontFamily: 'var(--font-inter),sans-serif', fontSize: 11,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(250,248,240,0.5)',
        }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#138808', marginRight: 7 }} />
          {players.length} joined
        </span>
      </div>

      {/* Room code, as the tiles the big screen shows */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
        <span style={{
          fontFamily: 'var(--font-inter),sans-serif', fontSize: 9.5, fontWeight: 600,
          letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(250,248,240,0.45)',
        }}>Room code</span>
        <div style={{ display: 'flex', gap: 9 }}>
          {room.code.split('').map((c, i) => <CodeTile key={i} char={c} i={i} />)}
        </div>
      </div>

      <button
        onClick={handleShare}
        className="flex items-center gap-2 active:scale-95 transition-all"
        style={{
          fontFamily: 'var(--font-inter),sans-serif', fontSize: 12, fontWeight: 600,
          letterSpacing: '0.08em', color: SAFFRON,
          border: '1px solid rgba(255,153,51,0.4)', borderRadius: 999, padding: '8px 16px',
          minHeight: 40,
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Invite friends
      </button>

      {/* Seats */}
      <div style={{ width: '100%', maxWidth: 340 }}>
        <div style={{
          fontFamily: 'var(--font-inter),sans-serif', fontSize: 9.5, fontWeight: 600,
          letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(250,248,240,0.45)',
          marginBottom: 10, textAlign: 'center',
        }}>
          {players.length === 1 ? 'You are in' : 'At the table'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {ordered.map((p, i) => (
            <SeatCard
              key={p.id}
              player={p}
              isMe={p.id === playerId}
              isHost={p.id === room.hostId}
              delay={i * 0.06}
            />
          ))}
          {/* One open seat, so a half-empty table reads as "room for more" rather than a gap */}
          {players.length < 3 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '12px 8px', borderRadius: 16, minHeight: 118,
              border: '1.5px dashed rgba(250,248,240,0.16)', background: 'rgba(250,248,240,0.015)',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                border: '1.5px dashed rgba(250,248,240,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(250,248,240,0.3)', fontSize: 18, fontWeight: 300,
              }}>+</div>
              <span style={{
                fontFamily: 'var(--font-inter),sans-serif', fontSize: 8.5, fontWeight: 500,
                letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(250,248,240,0.4)',
              }}>open seat</span>
            </div>
          )}
        </div>
      </div>

      {/* Waiting bar — the same line the projector shows, so both screens agree */}
      {me && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          border: '1px solid rgba(255,153,51,0.28)', borderRadius: 999,
          background: 'rgba(255,153,51,0.06)', padding: '10px 18px',
        }}>
          <span style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2].map(i => (
              <span key={i} className="animate-bounce" style={{
                width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,153,51,0.75)',
                animationDelay: `${i * 0.15}s`,
              }} />
            ))}
          </span>
          <span style={{
            fontFamily: 'var(--font-inter),sans-serif', fontSize: 12.5, fontWeight: 500,
            color: 'rgba(250,248,240,0.75)',
          }}>Waiting for the host to start the game…</span>
        </div>
      )}
    </div>
  );
}
