'use client';
import { motion } from 'framer-motion';
import Avatar from '@/lib/avatars';
import type { GameRoom } from '@/types/game';

interface Props {
  room: GameRoom;
  playerId: string;
  onStart?: () => void;
  startLoading?: boolean;
}

export default function PlayerLobby({ room, playerId, onStart, startLoading }: Props) {
  const me = room.players[playerId];
  const players = Object.values(room.players);
  const isHost = playerId === room.hostId;

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
          {isHost ? 'You are the host' : 'Waiting for host to start…'}
        </p>
        {!isHost && (
          <div className="flex gap-1 justify-center mt-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 bg-[#FF9933]/60 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
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

      {/* Start button for host */}
      {isHost && onStart && (
        <motion.button
          onClick={onStart}
          disabled={startLoading || players.length < 1}
          className="w-full max-w-xs h-14 bg-[#FF9933] hover:bg-[#e8872a] disabled:opacity-40 text-white font-[family-name:var(--font-bebas)] text-2xl tracking-widest rounded-xl transition-all active:scale-95 animate-pulse-ring"
          whileTap={{ scale: 0.95 }}
        >
          {startLoading ? 'Starting…' : 'Start Game →'}
        </motion.button>
      )}
    </div>
  );
}
