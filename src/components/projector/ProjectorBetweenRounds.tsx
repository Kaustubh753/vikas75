import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

export default function ProjectorBetweenRounds({ room }: Props) {
  const leaderboard = Object.values(room.players).sort((a, b) => b.score - a.score);

  return (
    <div className="h-screen w-screen bg-[#1a3a6e] flex flex-col items-center justify-center gap-8 p-12">
      <p className="font-[family-name:var(--font-oswald)] text-white text-4xl uppercase tracking-widest">
        Leaderboard
      </p>
      <div className="w-full max-w-lg space-y-3">
        {leaderboard.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center gap-4 bg-white/10 rounded-xl px-6 py-3"
          >
            <span className="text-[#8aa8cc] w-6 text-lg font-bold">{i + 1}</span>
            <span className="text-white flex-1 text-xl">{p.name}</span>
            <span className="text-[#FFD700] font-[family-name:var(--font-oswald)] text-3xl font-bold">
              {p.score}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[#8aa8cc] text-sm animate-pulse">
        Next round starting soon… new players can join now
      </p>
    </div>
  );
}
