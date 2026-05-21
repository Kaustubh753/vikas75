import { motion } from 'framer-motion';
import Avatar from '@/lib/avatars';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

export default function ProjectorBetweenRounds({ room }: Props) {
  const players = Object.values(room.players).sort((a, b) => b.score - a.score);
  const roundWinner = room.lastVerdict ? room.players[room.lastVerdict.winnerId] : null;

  return (
    <div className="w-full h-full bg-[#080f1e] flex flex-col items-center justify-center gap-8 p-12 relative overflow-hidden grain-overlay"
      style={{ backgroundImage: 'radial-gradient(#ffffff05 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
      {/* Tricolour top bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white/20" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Round winner */}
      {roundWinner && room.lastVerdict && (
        <div className="flex flex-col items-center gap-2 animate-bounce-in">
          <p className="font-[family-name:var(--font-inter)] text-white/50 text-xs uppercase tracking-widest">Round {room.round} Winner</p>
          <div className="flex items-center gap-4 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-2xl px-8 py-4">
            <span className="text-3xl">👑</span>
            <div className="rounded-xl overflow-hidden">
              <Avatar id={roundWinner.avatarId} size={52} />
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-[#FFD700] text-3xl tracking-wide">{roundWinner.name}</p>
              <p className="text-white/50 text-sm font-[family-name:var(--font-inter)]">{room.lastVerdict.schemeCard.name}</p>
            </div>
          </div>
        </div>
      )}

      <div className="text-center">
        <p className="font-[family-name:var(--font-inter)] text-white/40 text-sm uppercase tracking-widest mb-1">After Round {room.round}</p>
        <h2 className="font-[family-name:var(--font-bebas)] text-white text-5xl tracking-widest">Leaderboard</h2>
      </div>

      <div className="w-full max-w-xl space-y-3">
        {players.map((p, i) => (
          <motion.div
            key={p.id}
            className={`flex items-center gap-5 rounded-2xl px-7 py-4 border ${
              i === 0 ? 'bg-[#FFD700]/10 border-[#FFD700]/30' : 'bg-white/5 border-white/5'
            }`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.35 }}
          >
            <span className={`font-[family-name:var(--font-bebas)] text-2xl w-8 ${i === 0 ? 'text-[#FFD700]' : 'text-white/40'}`}>{i + 1}</span>
            {i === 0 && <span className="text-xl">👑</span>}
            <div className="rounded-xl overflow-hidden">
              <Avatar id={p.avatarId} size={40} />
            </div>
            <span className="text-white flex-1 text-xl font-[family-name:var(--font-inter)]">{p.name}</span>
            <span className={`font-[family-name:var(--font-bebas)] text-3xl ${i === 0 ? 'text-[#FFD700]' : 'text-white'}`}>
              🏆 {p.score}
            </span>
          </motion.div>
        ))}
      </div>

      <p className="text-white/50 text-sm font-[family-name:var(--font-inter)] animate-pulse tracking-widest uppercase">
        New players can join now · Host starts Round {room.round + 1}
      </p>

      <div className="absolute bottom-4 text-center">
        <p className="text-white/20 text-xs font-[family-name:var(--font-inter)]">An initiative of the Office of Shri Sujeet Kumar</p>
      </div>
    </div>
  );
}
