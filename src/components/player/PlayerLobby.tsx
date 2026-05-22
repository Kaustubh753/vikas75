'use client';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Avatar from '@/lib/avatars';
import type { GameRoom } from '@/types/game';

interface Props {
  room: GameRoom;
  playerId: string;
}

export default function PlayerLobby({ room, playerId }: Props) {
  const me = room.players[playerId];
  const players = Object.values(room.players);

  async function handleShare() {
    const url = `${window.location.origin}/?code=${room.code}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Vikas 75', text: `Join my Vikas 75 game! Room code: ${room.code}`, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Link copied!');
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-6 px-4">
      {/* Room code */}
      <div className="text-center">
        <p className="text-white/40 text-xs uppercase tracking-widest font-[family-name:var(--font-inter)]">
          Room Code
        </p>
        <p className="font-[family-name:var(--font-bebas)] text-[#FF9933] text-5xl tracking-[0.2em]">
          {room.code}
        </p>
      </div>

      {/* Player's own avatar */}
      {me && (
        <div className="flex flex-col items-center gap-2 animate-bounce-in">
          <div className="rounded-2xl overflow-hidden shadow-lg shadow-black/40">
            <Avatar id={me.avatarId} size={96} />
          </div>
          <p className="text-white font-[family-name:var(--font-bebas)] text-2xl tracking-wide">
            {me.name}
          </p>
        </div>
      )}

      <div className="text-center">
        <p className="text-white/60 text-sm font-[family-name:var(--font-inter)]">
          Waiting for host to start…
        </p>
        <div className="flex gap-1 justify-center mt-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 bg-[#FF9933]/60 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>

      {/* Player list */}
      <div className="w-full max-w-xs">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-[family-name:var(--font-inter)]">
          Players ({players.length})
        </p>
        <div className="space-y-2">
          {players.map((p, i) => (
            <motion.div key={p.id} className="flex items-center gap-3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
              <div className="rounded-lg overflow-hidden">
                <Avatar id={p.avatarId} size={36} />
              </div>
              <span className="text-white text-sm font-[family-name:var(--font-inter)] flex-1">
                {p.name}
              </span>
              {p.id === room.hostId && (
                <span className="text-[#FF9933] text-xs font-bold font-[family-name:var(--font-inter)]">
                  HOST
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        className="flex items-center gap-2 text-white/50 hover:text-white/80 text-sm font-[family-name:var(--font-inter)] transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Invite Friends
      </button>

    </div>
  );
}
