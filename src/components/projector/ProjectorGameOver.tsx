import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

export default function ProjectorGameOver({ room }: Props) {
  const leaderboard = Object.values(room.players).sort((a, b) => b.score - a.score);
  const winner = leaderboard[0];

  return (
    <div
      className="h-screen w-screen bg-[#0f2347] flex flex-col items-center justify-center gap-8 p-12 text-center relative overflow-hidden"
      style={{ backgroundImage: 'radial-gradient(#ffffff05 1px, transparent 1px)', backgroundSize: '32px 32px' }}
    >
      <div className="h-1.5 absolute top-0 left-0 right-0 flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white/20" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-[#FFD700]/5 blur-3xl" />

      <p className="text-[#FF9933] tracking-[0.5em] uppercase text-sm animate-fade-in">
        Game Over · Final Standings
      </p>

      {winner && (
        <div className="space-y-2 animate-slide-up">
          <p className="text-[#8aa8cc] tracking-[0.3em] uppercase text-xs">Champion</p>
          <p
            className="font-[family-name:var(--font-oswald)] text-[#FFD700] font-bold uppercase tracking-wider"
            style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}
          >
            {winner.name} 👑
          </p>
          <p className="text-white/60 text-lg">{winner.score} points</p>
        </div>
      )}

      <div className="w-full max-w-lg space-y-2 mt-2">
        {leaderboard.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-5 rounded-xl px-6 py-3 border ${
              i === 0 ? 'bg-[#FFD700]/10 border-[#FFD700]/25' : 'bg-white/5 border-white/5'
            }`}
          >
            <span className={`font-[family-name:var(--font-oswald)] text-xl w-7 ${i === 0 ? 'text-[#FFD700]' : 'text-[#8aa8cc]'}`}>{i + 1}</span>
            <span className="text-white flex-1 text-lg">{p.name}</span>
            <span className={`font-[family-name:var(--font-oswald)] text-2xl font-bold ${i === 0 ? 'text-[#FFD700]' : 'text-white'}`}>{p.score}</span>
          </div>
        ))}
      </div>

      <p className="text-[#8aa8cc]/60 text-sm mt-4 tracking-widest uppercase">
        Jai Hind! Thanks for playing Vikas 75
      </p>

      <div className="absolute bottom-4">
        <span className="font-[family-name:var(--font-oswald)] text-white/20 text-sm tracking-widest uppercase">Vikas 75</span>
      </div>
    </div>
  );
}
