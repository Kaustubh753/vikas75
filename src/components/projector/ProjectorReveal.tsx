import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

export default function ProjectorReveal({ room }: Props) {
  const submissions = Object.values(room.submissions);

  return (
    <div
      className="h-screen w-screen bg-[#1a3a6e] flex flex-col overflow-hidden relative"
      style={{ backgroundImage: 'radial-gradient(#ffffff07 1px, transparent 1px)', backgroundSize: '32px 32px' }}
    >
      <div className="h-1.5 absolute top-0 left-0 right-0 flex z-10">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white/20" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <div className="pt-8 pb-4 px-10 flex-shrink-0 text-center">
        <p className="text-[#8aa8cc] tracking-[0.4em] uppercase text-xs">
          Round {room.round} · All Answers
        </p>
        <p className="font-[family-name:var(--font-oswald)] text-white text-3xl uppercase tracking-wider mt-1">
          Who solved it best?
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-10 pb-8">
        <div className="grid grid-cols-2 gap-5 max-w-5xl mx-auto lg:grid-cols-3">
          {submissions.map(s => (
            <div
              key={s.playerId}
              className="rounded-2xl overflow-hidden border border-white/10"
              style={{ background: 'linear-gradient(135deg, #1e4080 0%, #152d5a 100%)' }}
            >
              <div className="h-0.5 bg-gradient-to-r from-[#FF9933]/60 to-transparent" />
              <div className="p-5">
                <p className="font-[family-name:var(--font-oswald)] text-[#FFD700] text-xl uppercase tracking-wide mb-1">{s.playerName}</p>
                <p className="text-white font-bold text-sm mb-0.5">{s.schemeCard.name}</p>
                <p className="font-[family-name:var(--font-devanagari)] text-[#8aa8cc] text-xs mb-3">{s.schemeCard.hi}</p>
                {/* Tricolour bar */}
                <div className="flex h-0.5 w-full mb-3">
                  <div className="flex-1 bg-[#FF9933]" />
                  <div className="flex-1 bg-white/60" />
                  <div className="flex-1 bg-[#138808]" />
                </div>
                <p className="text-[#c8d8f0] text-sm italic">"{s.explanation}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 left-4">
        <span className="font-[family-name:var(--font-oswald)] text-white/20 text-sm tracking-widest uppercase">Vikas 75</span>
      </div>
    </div>
  );
}
