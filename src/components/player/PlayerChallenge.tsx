import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

export default function PlayerChallenge({ room }: Props) {
  const c = room.currentChallenge;
  return (
    <div className="min-h-screen bg-[#faf8f0] flex flex-col">
      <div className="bg-[#1a3a6e] flex-shrink-0">
        <div className="h-1 flex">
          <div className="flex-1 bg-[#FF9933]" /><div className="flex-1 bg-white/30" /><div className="flex-1 bg-[#138808]" />
        </div>
        <div className="px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-[#8aa8cc] text-[10px] uppercase tracking-widest">Round {room.round}</p>
            <p className="font-[family-name:var(--font-oswald)] text-white text-lg uppercase tracking-wider">
              Challenge
            </p>
          </div>
          <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 px-2.5 py-1 rounded-lg">
            <span className="font-[family-name:var(--font-oswald)] text-[#FFD700] text-base tracking-[0.2em] font-bold">{room.code}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {c ? (
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-xl" style={{ background: '#1a3a6e' }}>
            <div className="h-0.5 bg-gradient-to-r from-[#FF9933] via-[#FFD700] to-[#FF9933]" />
            <div className="px-6 py-8 text-center space-y-4">
              <p className="text-[#8aa8cc] tracking-[0.4em] uppercase text-[10px]">Problem Statement</p>
              <p className="font-[family-name:var(--font-oswald)] text-white font-bold uppercase text-xl leading-snug">
                {c.en}
              </p>
              <div className="w-8 h-px bg-[#FF9933]/40 mx-auto" />
              <p className="font-[family-name:var(--font-devanagari)] text-[#c8d8f0] text-sm leading-relaxed">
                {c.hi}
              </p>
            </div>
            <div className="px-6 pb-4 text-center">
              <p className="text-[#8aa8cc]/50 text-[9px] tracking-widest uppercase">Vikas 75</p>
            </div>
          </div>
        ) : (
          <p className="text-[#1a3a6e] text-lg font-bold">Loading challenge…</p>
        )}
        <p className="text-[#8899aa] text-sm mt-6 animate-pulse">Host will open submissions soon…</p>
      </div>
    </div>
  );
}
