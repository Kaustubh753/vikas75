import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

export default function ProjectorGameOver({ room }: Props) {
  const leaderboard = Object.values(room.players).sort((a, b) => b.score - a.score);
  const winner = leaderboard[0];

  return (
    <div className="h-screen w-screen bg-[#1a3a6e] flex flex-col items-center justify-center gap-8 p-12 text-center">
      <p className="font-[family-name:var(--font-oswald)] text-[#FFD700] text-6xl uppercase tracking-widest">
        Game Over!
      </p>
      {winner && (
        <p className="text-white text-2xl">
          Champion: <span className="text-[#FFD700] font-bold">{winner.name}</span> with {winner.score} points
        </p>
      )}
      <div className="w-full max-w-lg space-y-3 mt-4">
        {leaderboard.map((p, i) => (
          <div key={p.id} className="flex items-center gap-4 bg-white/10 rounded-xl px-6 py-3">
            <span className="text-[#8aa8cc] w-6 text-lg font-bold">{i + 1}</span>
            <span className="text-white flex-1 text-xl">{p.name}</span>
            <span className="text-[#FFD700] font-[family-name:var(--font-oswald)] text-3xl font-bold">{p.score}</span>
          </div>
        ))}
      </div>
      <p className="text-[#8aa8cc] text-sm mt-6">Thanks for playing Vikas 75!</p>
    </div>
  );
}
