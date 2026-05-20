import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

export default function ProjectorWinner({ room }: Props) {
  const v = room.lastVerdict;
  if (!v) return null;

  return (
    <div
      className="h-screen w-screen bg-[#0f2347] flex flex-col items-center justify-center gap-8 p-12 text-center relative overflow-hidden"
      style={{ backgroundImage: 'radial-gradient(#ffffff06 1px, transparent 1px)', backgroundSize: '32px 32px' }}
    >
      <div className="h-1.5 absolute top-0 left-0 right-0 flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white/20" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Gold glow behind winner name */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-32 rounded-full bg-[#FFD700]/10 blur-3xl" />

      <p className="text-[#8aa8cc] tracking-[0.5em] uppercase text-sm animate-fade-in">
        Round {room.round} · Winner
      </p>

      <div className="animate-slide-up">
        <p className="font-[family-name:var(--font-oswald)] text-[#FFD700] uppercase tracking-wider leading-none"
          style={{ fontSize: 'clamp(3.5rem, 8vw, 6rem)' }}>
          {v.winnerName}
        </p>
      </div>

      {/* Scheme card display */}
      <div
        className="rounded-2xl overflow-hidden max-w-md w-full"
        style={{ background: 'linear-gradient(135deg, #243f7a, #1a3060)', border: '1px solid rgba(255,217,0,0.2)' }}
      >
        <div className="h-0.5 bg-gradient-to-r from-[#FF9933] via-[#FFD700] to-[#FF9933]" />
        <div className="p-6 text-center">
          <p className="text-[#8aa8cc] tracking-[0.4em] uppercase text-[10px] mb-2">Winning Scheme</p>
          <p className="font-bold text-white text-xl mb-1">{v.schemeCard.name}</p>
          <p className="font-[family-name:var(--font-devanagari)] text-[#8aa8cc] text-sm mb-3">{v.schemeCard.hi}</p>
          <div className="flex h-0.5 w-full mb-3">
            <div className="flex-1 bg-[#FF9933]" /><div className="flex-1 bg-white/30" /><div className="flex-1 bg-[#138808]" />
          </div>
          <p className="text-[#c8d8f0] italic text-sm">"{v.explanation}"</p>
        </div>
      </div>

      {/* Judge reasoning */}
      <div className="max-w-2xl bg-white/5 border border-white/10 rounded-2xl px-8 py-5">
        <p className="text-[#8aa8cc] tracking-[0.3em] uppercase text-[10px] mb-2">AI Judge Says</p>
        <p className="text-white text-lg leading-relaxed">{v.reasoning}</p>
        {v.bonusPoint && (
          <p className="text-[#FF9933] text-sm mt-3 font-bold tracking-wide">
            ✦ Bonus point — one-liner answer!
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-[#FFD700]/10 border border-[#FFD700]/30 px-5 py-2.5 rounded-full">
          <span className="text-[#FFD700] font-[family-name:var(--font-oswald)] text-2xl font-bold">+{v.bonusPoint ? 3 : 2}</span>
          <span className="text-[#8aa8cc] text-sm uppercase tracking-wide">points</span>
        </div>
        <span className="text-[#8aa8cc] text-sm">
          Round {room.round} of {room.totalRounds}
        </span>
      </div>

      <div className="absolute bottom-4">
        <span className="font-[family-name:var(--font-oswald)] text-white/20 text-sm tracking-widest uppercase">Vikas 75</span>
      </div>
    </div>
  );
}
