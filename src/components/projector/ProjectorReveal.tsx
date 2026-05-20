import type { GameRoom } from '@/types/game';
import SchemeCard from '@/components/cards/SchemeCard';

interface Props { room: GameRoom }

export default function ProjectorReveal({ room }: Props) {
  const submissions = Object.values(room.submissions);

  return (
    <div className="h-screen w-screen bg-[#1a3a6e] p-12 overflow-auto">
      <p className="text-[#8aa8cc] uppercase tracking-widest text-sm mb-8 text-center">
        Round {room.round} — All submissions
      </p>
      <div className="grid grid-cols-2 gap-6 max-w-5xl mx-auto lg:grid-cols-3">
        {submissions.map((s) => (
          <div key={s.playerId} className="flex flex-col gap-3">
            <p className="text-white font-bold text-lg">{s.playerName}</p>
            <SchemeCard card={s.schemeCard} expanded />
            <p className="text-[#c8d8f0] italic text-sm bg-white/5 rounded-lg p-3">
              "{s.explanation}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
