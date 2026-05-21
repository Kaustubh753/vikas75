'use client';
import type { GamePhase } from '@/types/game';

interface Props {
  phase: GamePhase;
  hint?: string;
}

const MESSAGES: Partial<Record<GamePhase, string>> = {
  'challenge-reveal': 'Challenge is being revealed…',
  submission: 'Others are submitting their cards…',
  reveal: 'Submissions are being revealed…',
  judging: 'AI Judge is deliberating…',
  winner: 'Winner is being announced!',
  'between-rounds': 'Preparing next round…',
  'game-over': 'Game over! Check the big screen.',
};

export default function PlayerWaiting({ phase, hint }: Props) {
  const message = MESSAGES[phase] ?? 'Please wait…';

  return (
    <div className="flex flex-col items-center justify-center gap-6 min-h-[50vh] px-4">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-3 h-3 bg-[#FF9933]/60 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-white/60 text-center text-sm font-[family-name:var(--font-inter)]">
        {message}
      </p>
      {hint && (
        <p className="text-[#FF9933]/70 text-xs text-center font-[family-name:var(--font-inter)]">
          {hint}
        </p>
      )}
      {!hint && phase === 'submission' && (
        <p className="text-white/30 text-xs text-center font-[family-name:var(--font-inter)]">
          Watch the projector screen
        </p>
      )}
    </div>
  );
}
