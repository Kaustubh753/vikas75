import type { GameRoom } from '@/types/game';
import SchemeCard from '@/components/cards/SchemeCard';

interface Props { room: GameRoom }

export default function ProjectorWinner({ room }: Props) {
  const v = room.lastVerdict;
  if (!v) return null;

  return (
    <div className="h-screen w-screen bg-[#1a3a6e] flex flex-col items-center justify-center gap-6 p-12 text-center">
      <p className="text-[#8aa8cc] uppercase tracking-widest text-sm">Winner</p>
      <p className="font-[family-name:var(--font-oswald)] text-[#FFD700] text-7xl font-bold uppercase">
        {v.winnerName}
      </p>
      <div className="max-w-xs">
        <SchemeCard card={v.schemeCard} expanded />
      </div>
      <div className="max-w-2xl bg-white/10 rounded-2xl p-6">
        <p className="text-[#c8d8f0] italic text-lg">"{v.explanation}"</p>
        <p className="text-white mt-4 text-base">{v.reasoning}</p>
        {v.bonusPoint && (
          <p className="text-[#FF9933] mt-2 text-sm font-bold">+1 bonus: one-liner answer!</p>
        )}
      </div>
      <p className="text-[#8aa8cc] text-sm animate-pulse">
        Round {room.round} of {room.totalRounds} complete
      </p>
    </div>
  );
}
