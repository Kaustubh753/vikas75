import type { GameRoom } from '@/types/game';
import ChallengeCard from '@/components/cards/ChallengeCard';

interface Props { room: GameRoom }

export default function ProjectorChallengeReveal({ room }: Props) {
  if (!room.currentChallenge) return null;
  return (
    <div className="h-screen w-screen bg-[#1a3a6e] flex flex-col items-center justify-center gap-8 p-16">
      <p className="text-[#8aa8cc] uppercase tracking-widest text-sm">
        Round {room.round} of {room.totalRounds}
      </p>
      <div className="w-full max-w-3xl animate-slide-up">
        <ChallengeCard card={room.currentChallenge} size="projector" />
      </div>
    </div>
  );
}
