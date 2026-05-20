import type { ChallengeCard as ChallengeCardType } from '@/types/game';

interface Props {
  card: ChallengeCardType;
  size?: 'projector' | 'phone';
}

export default function ChallengeCard({ card, size = 'phone' }: Props) {
  const isProjector = size === 'projector';
  return (
    <div
      className="flex flex-col items-center justify-between rounded-2xl p-8 text-center"
      style={{ backgroundColor: '#1a3a6e', minHeight: isProjector ? '480px' : '320px' }}
    >
      {/* Label */}
      <p className="text-[#8aa8cc] tracking-widest uppercase text-xs font-medium">
        problem statement
      </p>

      {/* English text */}
      <p
        className="font-[family-name:var(--font-oswald)] font-bold text-white uppercase leading-tight mt-4"
        style={{ fontSize: isProjector ? '2.5rem' : '1.25rem' }}
      >
        {card.en}
      </p>

      {/* Hindi text */}
      <p
        className="font-[family-name:var(--font-devanagari)] text-[#c8d8f0] mt-3"
        style={{ fontSize: isProjector ? '1.5rem' : '0.875rem' }}
      >
        {card.hi}
      </p>

      {/* Branding */}
      <p className="text-[#8aa8cc] text-xs mt-6 tracking-widest uppercase">Vikas 75</p>
    </div>
  );
}
