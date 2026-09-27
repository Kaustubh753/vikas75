'use client';
import { useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Avatar from '@/lib/avatars';
import type { GameRoom } from '@/types/game';

interface Props {
  room: GameRoom;
  playerId: string;
}

const subscribeNoop = () => () => {};

export default function PlayerLobby({ room, playerId }: Props) {
  const me = room.players[playerId];
  const players = Object.values(room.players);

  // The same /join?code= deep link the projector's QR encodes; the origin is read without an effect.
  const origin = useSyncExternalStore(subscribeNoop, () => window.location.origin, () => '');
  const joinLink = `${origin}/join?code=${room.code}`;
  const inviteText = `Join my Vikas 75 game · room code ${room.code} · ${joinLink}`;

  async function handleShare() {
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'Vikas 75', text: `Join my Vikas 75 game · room code ${room.code}`, url: joinLink }); } catch { /* cancelled */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(joinLink);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy. Select the link and copy it.');
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-6 px-4">
      {/* Room code */}
      <div className="text-center">
        <p className="text-[rgba(250,248,240,0.45)] text-xs uppercase tracking-widest font-[family-name:var(--font-inter)]">
          Room Code
        </p>
        <p className="font-[family-name:var(--font-bebas)] text-[#FF9933] text-5xl tracking-[0.2em]">
          {room.code}
        </p>
      </div>

      {/* Player's own avatar */}
      {me && (
        <div className="flex flex-col items-center gap-2 animate-rise-in">
          <div className="rounded-2xl overflow-hidden shadow-lg shadow-black/40">
            <Avatar id={me.avatarId} size={96} />
          </div>
          <p className="text-white text-2xl tracking-wide text-center" style={{ fontFamily: 'var(--font-bebas),var(--font-devanagari),sans-serif' }}>
            You&apos;re in, {me.name}
          </p>
        </div>
      )}

      <div className="text-center">
        <p className="text-[rgba(250,248,240,0.7)] text-sm font-[family-name:var(--font-inter)]">
          Watch the big screen. The host starts the game there.
        </p>
        <div className="flex gap-1 justify-center mt-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 bg-[#FF9933]/60 rounded-full animate-dots"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>

      {/* Player list */}
      <div className="w-full max-w-xs">
        <p className="text-[rgba(250,248,240,0.45)] text-xs uppercase tracking-widest mb-3 font-[family-name:var(--font-inter)]">
          Players ({players.length})
        </p>
        <div className="space-y-2">
          {players.map((p, i) => {
            const isMe = p.id === playerId;
            return (
            <motion.div
              key={p.id}
              className={`flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-2 ${isMe ? 'bg-[#FF9933]/8' : ''}`}
              style={isMe ? { background: 'rgba(255,153,51,0.08)', border: '1px solid rgba(255,153,51,0.18)' } : {}}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="rounded-lg overflow-hidden">
                <Avatar id={p.avatarId} size={36} />
              </div>
              <span className={`text-sm font-[family-name:var(--font-inter)] flex-1 ${isMe ? 'text-white font-semibold' : 'text-[rgba(250,248,240,0.85)]'}`}>
                {p.name}
              </span>
              {isMe && (
                <span className="text-[#FF9933]/70 text-[10px] uppercase tracking-widest font-[family-name:var(--font-inter)]">you</span>
              )}
              {p.id === room.hostId && (
                <span className="text-[#FF9933] text-xs font-bold font-[family-name:var(--font-inter)]">
                  HOST
                </span>
              )}
            </motion.div>
            );
          })}
        </div>
      </div>

      {/* Invite: the join link for a WhatsApp group, the share sheet, or a copy */}
      <div className="w-full max-w-xs" style={{ border: '1px solid rgba(250,248,240,0.14)', borderRadius: 12, padding: '14px 14px 12px', background: 'rgba(250,248,240,0.03)' }}>
        <p className="text-[rgba(250,248,240,0.45)] text-xs uppercase tracking-widest font-[family-name:var(--font-inter)]" style={{ margin: '0 0 6px' }}>
          Bring more players
        </p>
        <p className="text-white text-sm font-semibold font-[family-name:var(--font-inter)]" style={{ margin: '0 0 12px', wordBreak: 'break-all', userSelect: 'all' }}>
          {joinLink.replace(/^https?:\/\//, '')}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="btn-push"
            style={{
              flex: 1, height: 44, borderRadius: 6, border: 'none', background: '#FF9933', color: '#1a1208',
              fontFamily: 'var(--font-bebas),sans-serif', fontSize: 20, letterSpacing: '0.08em', cursor: 'pointer',
            }}
          >
            Share the link
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(inviteText)}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              height: 44, padding: '0 14px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(255,153,51,0.5)', background: 'rgba(255,153,51,0.12)', color: '#FF9933', textDecoration: 'none',
              fontFamily: 'var(--font-inter),sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap',
            }}
          >
            WhatsApp
          </a>
        </div>
      </div>

    </div>
  );
}
