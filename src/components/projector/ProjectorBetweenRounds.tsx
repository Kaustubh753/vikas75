import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

export default function ProjectorBetweenRounds({ room }: Props) {
  const leaderboard = Object.values(room.players).sort((a, b) => b.score - a.score);

  return (
    <div
      className="h-screen w-screen bg-[#1a3a6e] flex flex-col items-center justify-center gap-8 p-12 relative overflow-hidden"
      style={{ backgroundImage: 'radial-gradient(#ffffff07 1px, transparent 1px)', backgroundSize: '32px 32px' }}
    >
      <div className="h-1.5 absolute top-0 left-0 right-0 flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white/20" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <div className="text-center">
        <p className="text-[#8aa8cc] tracking-[0.4em] uppercase text-sm mb-2">After Round {room.round}</p>
        <p className="font-[family-name:var(--font-oswald)] text-white text-5xl uppercase tracking-widest">
          Leaderboard
        </p>
      </div>

      <div className="w-full max-w-xl space-y-3">
        {leaderboard.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-5 rounded-2xl px-7 py-4 border transition-all ${
              i === 0
                ? 'bg-[#FFD700]/10 border-[#FFD700]/30 shadow-[0_0_30px_#FFD70015]'
                : 'bg-white/5 border-white/5'
            }`}
          >
            <span className={`font-[family-name:var(--font-oswald)] text-2xl w-8 ${i === 0 ? 'text-[#FFD700]' : 'text-[#8aa8cc]'}`}>
              {i + 1}
            </span>
            {i === 0 && <span className="text-xl">👑</span>}
            <span className="text-white flex-1 text-xl font-medium">{p.name}</span>
            <span className={`font-[family-name:var(--font-oswald)] text-3xl font-bold ${i === 0 ? 'text-[#FFD700]' : 'text-white'}`}>
              {p.score}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[#8aa8cc]/70 text-sm animate-pulse tracking-widest uppercase">
        New players can join now · Host starts next round
      </p>

      <div className="absolute bottom-4">
        <span className="font-[family-name:var(--font-oswald)] text-white/20 text-sm tracking-widest uppercase">Vikas 75</span>
      </div>
    </div>
  );
}
