import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

export default function ProjectorChallengeReveal({ room }: Props) {
  if (!room.currentChallenge) return null;
  const c = room.currentChallenge;

  return (
    <div
      className="h-screen w-screen bg-[#1a3a6e] flex flex-col items-center justify-center relative overflow-hidden"
      style={{ backgroundImage: 'radial-gradient(#ffffff08 1px, transparent 1px)', backgroundSize: '32px 32px' }}
    >
      <div className="h-1.5 absolute top-0 left-0 right-0 flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white/20" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Round label */}
      <p className="text-[#8aa8cc] tracking-[0.4em] uppercase text-sm mb-10 animate-fade-in">
        Round {room.round} of {room.totalRounds}
      </p>

      {/* Challenge card */}
      <div
        className="w-full max-w-3xl mx-8 rounded-3xl overflow-hidden animate-slide-up shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #1e4080 0%, #0f2347 100%)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Saffron top line */}
        <div className="h-1 bg-gradient-to-r from-[#FF9933] via-[#FFD700] to-[#FF9933]" />

        <div className="px-16 py-14 flex flex-col items-center gap-8 text-center">
          <p className="text-[#8aa8cc] tracking-[0.4em] uppercase text-xs">Problem Statement</p>

          {/* English text */}
          <p
            className="font-[family-name:var(--font-oswald)] text-white font-bold uppercase leading-tight"
            style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3rem)' }}
          >
            {c.en}
          </p>

          {/* Divider */}
          <div className="w-16 h-px bg-[#FF9933]/40" />

          {/* Hindi text */}
          <p
            className="font-[family-name:var(--font-devanagari)] text-[#c8d8f0] leading-relaxed"
            style={{ fontSize: 'clamp(1.1rem, 2vw, 1.6rem)' }}
          >
            {c.hi}
          </p>
        </div>

        <div className="px-16 pb-6 flex justify-center">
          <p className="text-[#8aa8cc]/50 text-xs tracking-[0.4em] uppercase">Vikas 75</p>
        </div>
      </div>

      <p className="text-[#8aa8cc]/60 text-xs tracking-widest uppercase mt-10 animate-pulse">
        Host: open submissions when ready
      </p>
    </div>
  );
}
